import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ParsedTicket } from '@/lib/parse/types';

export const maxDuration = 30;
export const runtime = 'nodejs';

type CommitBody = {
  storage_path: string;
  parsed: ParsedTicket;
  replace_existing?: boolean;
};

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as CommitBody | null;
  if (!body || !body.storage_path || !body.parsed) {
    return NextResponse.json(
      { error: 'Missing storage_path or parsed payload' },
      { status: 400 }
    );
  }

  const { storage_path, parsed, replace_existing } = body;

  // PO lookup
  const { data: po, error: poErr } = await supabase
    .from('service_pos')
    .select('id, po_number')
    .eq('po_number', parsed.po_number)
    .maybeSingle();
  if (poErr || !po) {
    return NextResponse.json(
      { error: `PO ${parsed.po_number} not found` },
      { status: 400 }
    );
  }

  // Reconcile (defense in depth)
  const sum = parsed.line_items.reduce((s, li) => s + li.final_amount, 0);
  const computed = Math.round(sum * 100) / 100;
  if (Math.abs(computed - parsed.face_value) >= 0.005) {
    return NextResponse.json(
      {
        error: `Line items sum (${computed.toFixed(2)}) doesn't match face value (${parsed.face_value.toFixed(2)}).`,
      },
      { status: 400 }
    );
  }

  // Internal BOL dedup check (defense in depth — normalize() already
  // dedupes during parse, but the user may have edited the field manually
  // and re-introduced a duplicate before clicking Commit).
  if (parsed.is_master && parsed.bol_numbers.length > 0) {
    const seen = new Set<string>();
    const internalDups: string[] = [];
    for (const b of parsed.bol_numbers) {
      if (seen.has(b)) internalDups.push(b);
      else seen.add(b);
    }
    if (internalDups.length > 0) {
      return NextResponse.json(
        {
          error: `BOL number(s) appear more than once within this ticket's own list: ${Array.from(new Set(internalDups)).join(', ')}. Remove the duplicates before committing.`,
        },
        { status: 400 }
      );
    }
  }

  // If replacing, delete the existing ticket first (cascades line_items +
  // bol_registry). We capture the old PDF path so we can clean up storage
  // after the new insert succeeds.
  let oldPdfPath: string | null = null;
  if (replace_existing) {
    const { data: existing, error: findErr } = await supabase
      .from('tickets')
      .select('id, pdf_storage_path')
      .eq('ticket_number', parsed.ticket_number)
      .maybeSingle();
    if (findErr || !existing) {
      return NextResponse.json(
        {
          error: `Cannot replace: no existing ticket with number ${parsed.ticket_number}`,
        },
        { status: 404 }
      );
    }
    oldPdfPath = existing.pdf_storage_path;
    const { error: delErr } = await supabase
      .from('tickets')
      .delete()
      .eq('id', existing.id);
    if (delErr) {
      return NextResponse.json(
        { error: `Failed to delete existing ticket for replacement: ${delErr.message}` },
        { status: 500 }
      );
    }
  }

  // Insert ticket
  const sourceType = parsed.is_master ? 'master_ticket' : 'field_ticket';
  const { data: ticket, error: insertErr } = await supabase
    .from('tickets')
    .insert({
      po_id: po.id,
      ticket_number: parsed.ticket_number,
      ticket_date: parsed.ticket_date,
      source_type: sourceType,
      is_master: parsed.is_master,
      face_value: parsed.face_value,
      computed_total: computed,
      reconciled: true,
      status: 'pending',
      markup_notes: parsed.markup_notes ?? null,
      created_by: user.id,
    })
    .select('id')
    .single();

  if (insertErr || !ticket) {
    if (insertErr?.code === '23505') {
      return NextResponse.json(
        { error: `Ticket ${parsed.ticket_number} already exists.` },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: insertErr?.message ?? 'Ticket insert failed' },
      { status: 500 }
    );
  }

  // Insert line items
  const liRows = parsed.line_items.map((li, i) => ({
    ticket_id: ticket.id,
    category: li.category,
    description: li.description,
    quantity: li.quantity,
    unit: li.unit,
    rate: li.rate,
    source_amount: li.source_amount,
    markup_percent: li.markup_percent,
    final_amount: li.final_amount,
    sort_order: i + 1,
  }));
  const { error: liErr } = await supabase.from('line_items').insert(liRows);
  if (liErr) {
    await supabase.from('tickets').delete().eq('id', ticket.id);
    return NextResponse.json(
      { error: `Line item insert failed: ${liErr.message}` },
      { status: 500 }
    );
  }

  // BOL registry (if master)
  if (parsed.is_master && parsed.bol_numbers.length > 0) {
    const bolRows = parsed.bol_numbers.map((bol) => ({
      master_ticket_id: ticket.id,
      bol_number: bol,
    }));
    const { error: bolErr } = await supabase.from('bol_registry').insert(bolRows);
    if (bolErr) {
      await supabase.from('tickets').delete().eq('id', ticket.id);
      if (bolErr.code === '23505') {
        return NextResponse.json(
          {
            error: `Cannot register one or more BOL numbers — another ticket on file has already claimed them (true external duplicate, not an internal one). ${bolErr.message}`,
          },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: `BOL registry insert failed: ${bolErr.message}` },
        { status: 500 }
      );
    }
  }

  // Move new PDF from pending/ to committed/
  const newPath = `committed/${ticket.id}.pdf`;
  const { error: moveErr } = await supabase.storage
    .from('ticket-pdfs')
    .move(storage_path, newPath);
  if (moveErr) {
    console.error('Storage move failed:', moveErr);
    await supabase
      .from('tickets')
      .update({ pdf_storage_path: storage_path })
      .eq('id', ticket.id);
  } else {
    await supabase
      .from('tickets')
      .update({ pdf_storage_path: newPath })
      .eq('id', ticket.id);
  }

  // If we replaced an existing ticket, clean up its old PDF (best-effort).
  if (oldPdfPath && oldPdfPath !== newPath && oldPdfPath !== storage_path) {
    await supabase.storage.from('ticket-pdfs').remove([oldPdfPath]);
  }

  return NextResponse.json({
    ok: true,
    ticket_id: ticket.id,
    replaced: !!replace_existing,
  });
}

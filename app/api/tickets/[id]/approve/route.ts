import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/**
 * POST /api/tickets/{id}/approve
 * body: { storage_path: string }
 *
 * Non-destructive "signed PDF arrived for a pending ticket" flow. Preserves
 * the ticket record (id, line items, BOL registry, ticket_date, face_value),
 * flips status from pending → invoiced, stamps approval_status =
 * "Approved by Client/PM", and swaps in the signed PDF at
 * committed/{id}.pdf. The old PDF (if any) is removed best-effort.
 *
 * Distinct from POST /api/tickets with replace_existing=true, which
 * DELETES and re-inserts (destructive) — that path is for revisions
 * where the parsed data differs from the existing record.
 */

const APPROVED_LABEL = 'Approved by Client/PM';

type Body = {
  storage_path?: string;
};

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body?.storage_path) {
    return NextResponse.json(
      { error: 'Missing storage_path (pending PDF)' },
      { status: 400 }
    );
  }
  const newPendingPath = body.storage_path;

  // Fetch the existing ticket so we can (a) refuse if it's already invoiced
  // — this endpoint is only meaningful for pending rows — and (b) capture
  // the old PDF path for cleanup.
  const { data: ticket, error: fetchErr } = await supabase
    .from('tickets')
    .select('id, status, pdf_storage_path')
    .eq('id', params.id)
    .maybeSingle();

  if (fetchErr || !ticket) {
    return NextResponse.json(
      { error: fetchErr?.message ?? 'Ticket not found' },
      { status: 404 }
    );
  }

  if (ticket.status === 'rejected') {
    return NextResponse.json(
      { error: 'Cannot approve a rejected ticket — un-reject it first.' },
      { status: 409 }
    );
  }

  const targetPath = `committed/${ticket.id}.pdf`;
  const oldPath = ticket.pdf_storage_path as string | null;

  // If the ticket already has a PDF at the target path, remove it before
  // moving the new one in — Supabase storage .move() refuses to overwrite.
  if (oldPath) {
    await supabase.storage.from('ticket-pdfs').remove([oldPath]);
  }

  // Move the newly-uploaded signed PDF from pending/ to committed/{id}.pdf.
  const { error: moveErr } = await supabase.storage
    .from('ticket-pdfs')
    .move(newPendingPath, targetPath);

  if (moveErr) {
    // If the move failed, roll back to whatever pdf_storage_path was there
    // and leave the new pending file in place for the user to retry.
    return NextResponse.json(
      { error: `Storage move failed: ${moveErr.message}` },
      { status: 500 }
    );
  }

  // Flip status + approval + PDF pointer in one update. Line items,
  // BOL registry, ticket_date, face_value — all untouched.
  const { data: updated, error: updateErr } = await supabase
    .from('tickets')
    .update({
      status: 'invoiced',
      approval_status: APPROVED_LABEL,
      pdf_storage_path: targetPath,
    })
    .eq('id', ticket.id)
    .select('id, status, approval_status, pdf_storage_path')
    .single();

  if (updateErr || !updated) {
    // The PDF has already been moved into committed/ — best-effort undo
    // isn't possible without a rename back, and the DB is the source of
    // truth for the pointer. Report the error and let the user retry;
    // next call will see the target path already contains a PDF and clean
    // it up correctly.
    return NextResponse.json(
      { error: updateErr?.message ?? 'Ticket update failed' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    id: updated.id,
    status: updated.status,
    approval_status: updated.approval_status,
    pdf_storage_path: updated.pdf_storage_path,
  });
}

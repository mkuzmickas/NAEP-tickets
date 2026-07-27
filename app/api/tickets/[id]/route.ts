import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const VALID_STATUSES = ['pending', 'invoiced', 'rejected'] as const;
type Status = (typeof VALID_STATUSES)[number];

export async function PATCH(
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

  const body = await req.json().catch(() => null);
  if (!body || typeof body.status !== 'string') {
    return NextResponse.json(
      { error: 'status is required (pending | invoiced | rejected)' },
      { status: 400 }
    );
  }
  const status = body.status as Status;
  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json(
      { error: `status must be one of ${VALID_STATUSES.join(', ')}` },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('tickets')
    .update({ status })
    .eq('id', params.id)
    .select('id, status')
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? 'Ticket not found' },
      { status: error?.code === 'PGRST116' ? 404 : 500 }
    );
  }

  return NextResponse.json({ ok: true, id: data.id, status: data.status });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Look up the ticket first so we can clean up its PDF after delete.
  const { data: ticket, error: fetchErr } = await supabase
    .from('tickets')
    .select('id, pdf_storage_path')
    .eq('id', params.id)
    .single();

  if (fetchErr || !ticket) {
    return NextResponse.json(
      { error: fetchErr?.message ?? 'Ticket not found' },
      { status: 404 }
    );
  }

  // Delete the ticket. line_items + bol_registry cascade via FK.
  const { error: delErr } = await supabase
    .from('tickets')
    .delete()
    .eq('id', params.id);

  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 500 });
  }

  // Best-effort: remove the PDF if there was one.
  if (ticket.pdf_storage_path) {
    await supabase.storage
      .from('ticket-pdfs')
      .remove([ticket.pdf_storage_path]);
  }

  return NextResponse.json({ ok: true });
}

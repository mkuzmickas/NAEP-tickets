import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

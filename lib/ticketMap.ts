import { createClient } from '@/lib/supabase/server';

export type TicketMapPo = {
  id: string;
  po_number: string;
  vendor_display_name: string;
  scope: string | null;
  committed_amount: number;
};

export type TicketMapTicket = {
  id: string;
  po_id: string;
  ticket_number: string;
  ticket_date: string;
  face_value: number;
  status: 'pending' | 'invoiced' | 'rejected';
  pdf_storage_path: string | null;
};

type RawPo = Omit<TicketMapPo, 'committed_amount'> & {
  committed_amount: string | number;
};

type RawTicket = Omit<TicketMapTicket, 'face_value'> & {
  face_value: string | number;
};

export async function getAllPosForMap(): Promise<TicketMapPo[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('service_pos')
    .select('id, po_number, vendor_display_name, scope, committed_amount')
    .order('po_number', { ascending: true });
  if (error) throw error;
  return (data as RawPo[]).map((r) => ({
    id: r.id,
    po_number: r.po_number,
    vendor_display_name: r.vendor_display_name,
    scope: r.scope,
    committed_amount: Number(r.committed_amount),
  }));
}

export async function getTicketsForPoIds(
  poIds: string[]
): Promise<TicketMapTicket[]> {
  if (poIds.length === 0) return [];
  const supabase = createClient();
  const { data, error } = await supabase
    .from('tickets')
    .select('id, po_id, ticket_number, ticket_date, face_value, status, pdf_storage_path')
    .in('po_id', poIds)
    .neq('status', 'rejected')
    .order('ticket_date', { ascending: true });
  if (error) throw error;
  return (data as RawTicket[]).map((r) => ({
    id: r.id,
    po_id: r.po_id,
    ticket_number: r.ticket_number,
    ticket_date: r.ticket_date,
    face_value: Number(r.face_value),
    status: r.status,
    pdf_storage_path: r.pdf_storage_path,
  }));
}

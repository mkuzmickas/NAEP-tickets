import { createClient } from '@/lib/supabase/server';
import type {
  LineItemCategory,
  TicketRow,
  TicketSourceType,
  TicketStatus,
} from '@/types/database';

type RawTicket = {
  id: string;
  po_id: string;
  ticket_number: string;
  ticket_date: string;
  source_type: TicketSourceType;
  is_master: boolean;
  face_value: string | number;
  computed_total: string | number;
  reconciled: boolean;
  status: TicketStatus;
  pdf_storage_path: string | null;
  markup_notes: string | null;
  created_at: string;
  created_by: string | null;
  service_pos: {
    po_number: string;
    vendor_display_name: string;
    scope: string | null;
  };
  line_items: RawLineItem[];
};

type RawLineItem = {
  id: string;
  ticket_id: string;
  category: LineItemCategory;
  description: string;
  quantity: string | number | null;
  unit: string | null;
  rate: string | number | null;
  source_amount: string | number;
  markup_percent: string | number;
  final_amount: string | number;
  sort_order: number;
  created_at: string;
};

function n(v: string | number | null): number | null {
  if (v === null) return null;
  return typeof v === 'number' ? v : Number(v);
}

function nReq(v: string | number): number {
  return typeof v === 'number' ? v : Number(v);
}

export async function getAllTickets(): Promise<TicketRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('tickets')
    .select(
      `
      id, po_id, ticket_number, ticket_date, source_type, is_master,
      face_value, computed_total, reconciled, status,
      pdf_storage_path, markup_notes, created_at, created_by,
      service_pos ( po_number, vendor_display_name, scope ),
      line_items ( id, ticket_id, category, description, quantity, unit, rate,
                   source_amount, markup_percent, final_amount, sort_order, created_at )
    `
    )
    .order('ticket_date', { ascending: false });

  if (error) {
    console.error('getAllTickets failed:', error);
    throw new Error(`Failed to fetch tickets: ${error.message}`);
  }

  return (data as unknown as RawTicket[]).map((t) => ({
    id: t.id,
    po_id: t.po_id,
    ticket_number: t.ticket_number,
    ticket_date: t.ticket_date,
    source_type: t.source_type,
    is_master: t.is_master,
    face_value: nReq(t.face_value),
    computed_total: nReq(t.computed_total),
    reconciled: t.reconciled,
    status: t.status,
    pdf_storage_path: t.pdf_storage_path,
    markup_notes: t.markup_notes,
    created_at: t.created_at,
    created_by: t.created_by,
    po_number: t.service_pos.po_number,
    vendor_display_name: t.service_pos.vendor_display_name,
    scope: t.service_pos.scope,
    line_items: t.line_items
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((li) => ({
        id: li.id,
        ticket_id: li.ticket_id,
        category: li.category,
        description: li.description,
        quantity: n(li.quantity),
        unit: li.unit,
        rate: n(li.rate),
        source_amount: nReq(li.source_amount),
        markup_percent: nReq(li.markup_percent),
        final_amount: nReq(li.final_amount),
        sort_order: li.sort_order,
        created_at: li.created_at,
      })),
  }));
}

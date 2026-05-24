export type ServicePO = {
  id: string;
  po_number: string;
  vendor_legal_name: string;
  vendor_display_name: string;
  task_wbs: string | null;
  scope: string | null;
  committed_amount: number;
  ap_invoiced_amount: number;
  notes: string | null;
  created_at: string;
};

export type TicketStatus = 'pending' | 'invoiced' | 'rejected';
export type TicketSourceType = 'field_ticket' | 'bol' | 'invoice' | 'master_ticket';
export type LineItemCategory = 'labour' | 'equipment' | 'materials' | 'loa_other';

export type Ticket = {
  id: string;
  po_id: string;
  ticket_number: string;
  ticket_date: string;
  source_type: TicketSourceType;
  is_master: boolean;
  face_value: number;
  computed_total: number;
  reconciled: boolean;
  status: TicketStatus;
  pdf_storage_path: string | null;
  markup_notes: string | null;
  created_at: string;
  created_by: string | null;
};

export type LineItem = {
  id: string;
  ticket_id: string;
  category: LineItemCategory;
  description: string;
  quantity: number | null;
  unit: string | null;
  rate: number | null;
  source_amount: number;
  markup_percent: number;
  final_amount: number;
  sort_order: number;
  created_at: string;
};

export type BolRegistry = {
  id: string;
  master_ticket_id: string;
  bol_number: string;
  created_at: string;
};

export type ActivePoSummary = {
  id: string;
  po_number: string;
  vendor_display_name: string;
  scope: string | null;
  task_wbs: string | null;
  committed: number;
  lem_to_date: number;
  remaining: number;
  pct_used: number;
  ticket_count: number;
};

export type TicketRow = Ticket & {
  po_number: string;
  vendor_display_name: string;
  scope: string | null;
  line_items: LineItem[];
};

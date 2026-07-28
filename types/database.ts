export type ServicePO = {
  id: string;
  po_number: string;
  vendor_legal_name: string;
  vendor_display_name: string;
  task_wbs: string | null;
  project_cost_code: string | null;
  scope: string | null;
  committed_amount: number;
  ap_invoiced_amount: number;
  vendor_system_incurred: number | null;
  vendor_job_ref: string | null;
  tracks_shipping: boolean;
  /** Manual 0-100 percent complete entered on the Forecast page. Drives
   *  Forecast at Completion (FAC) = lem_to_date / (percent_complete/100).
   *  Null or zero => forecast is not computable for that PO. */
  percent_complete: number | null;
  notes: string | null;
  created_at: string;
};

export type TicketStatus = 'pending' | 'invoiced' | 'rejected';
export type TicketSourceType =
  | 'field_ticket'
  | 'bol'
  | 'invoice'
  | 'master_ticket'
  | 'aimsio_status';
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
  /** Client-side approval string from the Aimsio "Office Approval Status"
   *  column, verbatim. `Approved by Client/PM` = green on the Ticket Map;
   *  everything else (Sent to Client via Portal, Approved to Send, See Notes,
   *  blank, null) = red. Distinct from `status`, which is the internal
   *  invoicing state. */
  approval_status: string | null;
  /** EWP this ticket rolls up to. Populated for tickets on PO 2001285 (per
   *  the WTP-code map) and PO 2001271 (whole PO = EWP 11). Null on every
   *  other PO and on 2001285 tickets that haven't been coded yet. */
  ewp_no: number | null;
  pdf_storage_path: string | null;
  markup_notes: string | null;
  schedule_package_id: string | null;
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
  project_cost_code: string | null;
  committed: number;
  lem_to_date: number;
  remaining: number;
  pct_used: number;
  ticket_count: number;
  vendor_system_incurred: number | null;
  vendor_gap: number | null;
  vendor_job_ref: string | null;
};

export type TicketRow = Ticket & {
  po_number: string;
  vendor_display_name: string;
  scope: string | null;
  line_items: LineItem[];
};

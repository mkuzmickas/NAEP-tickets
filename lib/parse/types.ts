import type { LineItemCategory, TicketStatus } from '@/types/database';

export type FormatHint =
  | 'surepoint'
  | 'goldenbase'
  | 'vector'
  | 'energetic'
  | 'albright'
  | 'generic';

export type ParsedLineItem = {
  category: LineItemCategory;
  description: string;
  quantity: number | null;
  unit: string | null;
  rate: number | null;
  source_amount: number;
  markup_percent: number;
  final_amount: number;
};

/** Aitken Creek Gas Storage approval stamp on a signed field ticket. The
 *  red-bordered box in the bottom margin with PN, AFE/CC, PO, Amount, GL,
 *  Date, Location, Supervisor, Manager, and Signature fields. Presence +
 *  ink in the Signature field is the physical proof of approval that
 *  gates the non-destructive "Mark existing as approved" flow. */
export type SignatureStamp = {
  /** True if the parser saw the stamp box at all, whether signed or not. */
  detected: boolean;
  /** Name in the Supervisor field (e.g. "Desmond Meyer", "Kip Anderson",
   *  "Adrian Chen", "Taylor Wu"). Null if illegible or blank. */
  supervisor: string | null;
  /** Name in the Manager field (typically "Jade Rowe"). */
  manager: string | null;
  /** Date printed on the stamp, ISO YYYY-MM-DD. May differ from
   *  ticket_date when the ticket is signed after the fact. */
  stamp_date: string | null;
  /** Amount printed in the Amount field, numeric. Cross-check against
   *  the ticket's own face_value. */
  stamp_amount: number | null;
  /** True only if there's visible ink / handwritten mark in the Signature
   *  field. False means "stamp present but nobody signed it". */
  signed: boolean;
};

export type ParsedTicket = {
  ticket_number: string;
  ticket_date: string;
  po_number: string;
  vendor_guess: string;
  format_hint: FormatHint;
  face_value: number;
  is_master: boolean;
  bol_numbers: string[];
  line_items: ParsedLineItem[];
  markup_notes?: string;
  /** Aitken Creek Gas Storage approval stamp read from the PDF. Null when
   *  the parser couldn't find any recognisable stamp block. Ephemeral —
   *  not persisted with the ticket record. */
  signature_stamp?: SignatureStamp | null;
};

export type ExistingTicketSnapshot = {
  ticket_id: string;
  ticket_number: string;
  ticket_date: string;
  po_number: string;
  face_value: number;
  is_master: boolean;
  /** Internal invoicing state. When 'pending' the client offers a
   *  non-destructive "Mark as approved" action alongside the destructive
   *  Replace path. */
  status: TicketStatus;
  bol_numbers: string[];
  line_items: ParsedLineItem[];
};

export type DuplicateInfo = {
  ticket_number_collides_with?: 'ticket' | 'bol_registry';
  ticket_existing?: {
    ticket_number: string;
    ticket_date: string;
    po_number: string;
  };
  // Full snapshot of the existing ticket when ticket_number_collides_with === 'ticket'.
  // Used by the client to diff parsed-vs-existing and offer Replace for revisions.
  existing_ticket_snapshot?: ExistingTicketSnapshot;
  bol_collisions: Array<{
    bol_number: string;
    found_in: 'ticket' | 'bol_registry';
    master_ticket?: string;
  }>;
};

export type ParseResult = {
  storage_path: string;
  parsed: ParsedTicket;
  computed_total: number;
  reconciled: boolean;
  reconcile_diff: number;
  po_exists: boolean;
  duplicates: DuplicateInfo;
  warnings: string[];
};

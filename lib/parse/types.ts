import type { LineItemCategory } from '@/types/database';

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
};

export type DuplicateInfo = {
  ticket_number_collides_with?: 'ticket' | 'bol_registry';
  ticket_existing?: {
    ticket_number: string;
    ticket_date: string;
    po_number: string;
  };
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

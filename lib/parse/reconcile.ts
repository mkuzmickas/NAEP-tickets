import type { ParsedTicket } from './types';

export type ReconcileResult = {
  computed_total: number;
  reconciled: boolean;
  diff: number;
};

export function reconcile(ticket: ParsedTicket): ReconcileResult {
  const sum = ticket.line_items.reduce((s, li) => s + li.final_amount, 0);
  const computed_total = Math.round(sum * 100) / 100;
  const diff = Math.round((computed_total - ticket.face_value) * 100) / 100;
  return {
    computed_total,
    reconciled: Math.abs(diff) < 0.005,
    diff,
  };
}

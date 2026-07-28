/**
 * EWP seed maps for the Ticket Map / Aimsio-CSV import pipeline.
 *
 * The Aimsio "Office Approval Status" CSV export has no EWP column — EWP
 * mapping comes from the WTP folders and the client's emails. This file is
 * the editable source of truth for that mapping: extend it when the client
 * sends new WTP codes. Unmapped 2001285 tickets stay null and render in the
 * 'Unassigned to EWP' bucket on the Ticket Map until a code lands.
 *
 * Kept in a plain `.ts` module (not the DB) so a code edit is the same
 * commit boundary as a spec update — no seed script, no side-channel.
 */

// Appendix A — PO 2001285 ticket → EWP (current). Keys are the base ticket
// number as written on the Aimsio CSV, with any leading date prefix stripped
// (e.g. `06-05-SL26-101-000-001` collapses to `SL26-101-000-001`).
export const TICKET_EWP: Record<string, number> = {
  'SL26-101-000-001': 8,
  'SL26-101-000-002': 8,
  'SL26-101-000-003': 8,
  'SL26-101-000-004': 8,
  'SL26-101-000-005': 8,
  'SL26-101-000-006': 8,
  'SL26-101-000-007': 8,
  'SL26-101-000-008': 8,
  'SL26-101-000-009': 8,
  'SL26-101-000-010': 8,
  'SL26-101-000-011': 8,
  'SL26-101-000-012': 8,
  'SL26-101-000-013': 13,
  'SL26-101-000-014': 8,
  'SL26-101-000-015': 8,
  'SL26-101-000-016': 8,
  'SL26-101-000-017': 8,
  'SL26-101-000-018': 8,
  'SL26-101-000-019': 8,
  'SL26-101-000-020': 8,
  'SL26-101-000-021': 8,
  'SL26-101-000-022': 8,
  'SL26-101-000-023': 8,
  'SL26-101-000-024': 5,
  'SL26-101-000-025': 5,
  'SL26-101-000-026': 5,
  'SL26-101-000-027': 8,
  'SL26-101-000-028': 4,
  // 029 intentionally absent — no WTP code yet.
  'SL26-101-000-030': 8,
  'SL26-101-000-031': 5,
  'SL26-101-000-032': 8,
  'SL26-101-000-033': 8,
  'SL26-101-000-034': 8,
  'SL26-101-000-035': 4,
  'SL26-101-000-036': 22,
  'SL26-101-000-037': 13,
  'SL26-101-000-038': 5,
  'SL26-101-000-039': 8,
  'SL26-101-000-040': 12,
  'SL26-101-000-041': 13,
};

// Appendix B — EWP titles. Used both by the 2001285 sub-bucket headers and
// anywhere else in the UI that renders an EWP number in isolation.
export const EWP_LABEL: Record<number, string> = {
  4: 'Start Air Receiver Skid',
  5: 'Concrete',
  8: 'North-South Rack',
  11: 'Buried Facilities', // whole-PO rule: PUR-6540-2001271
  12: 'Flare & Rack',
  13: 'Tank Farm / Pump Bldg',
  22: 'Sales Custody Transfer',
};

// Appendix C — Job → PO fallback, used only when the CSV filename doesn't
// carry a PO number. The primary path is filename ("1285.csv" → PO) via
// `poFromCsvFilename`; only when that returns null do we parse the job from
// the first ticket row and look it up here.
//
// SL26-010 also spans closed PO 2000943 — cannot split per ticket, so we
// always keep on 2001280 and never touch the closed row.
export const JOB_TO_PO: Record<string, string> = {
  'SL26-101': 'PUR-6540-2001285',
  'SL26-095': 'PUR-6540-2001278',
  'SL26-085': 'PUR-6540-2001271',
  'SL26-010': 'PUR-6540-2001280',
  'SL26-047': 'PUR-6540-2001171',
};

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

// Trim any leading date prefix Aimsio sometimes stamps onto the ticket number
// (`06-05-SL26-101-000-001` → `SL26-101-000-001`). Anything before the first
// `SL26-` is dropped; if the marker isn't present the input is returned as-is.
export function stripDatePrefix(ticketNumber: string): string {
  const i = ticketNumber.indexOf('SL26-');
  return i >= 0 ? ticketNumber.slice(i) : ticketNumber;
}

// Parse the job number (`SL26-101`) off a ticket number, or null if we can't.
// Used for the filename-fallback path in the CSV import.
export function jobFromTicketNumber(ticketNumber: string): string | null {
  const base = stripDatePrefix(ticketNumber);
  const m = base.match(/^(SL26-\d{3})/);
  return m ? m[1] : null;
}

// Filename → PO. The client names CSVs `1285.csv`, `1278.csv`, `1271.csv`,
// `1280.csv`. Accepts anything that ends in a run of digits ≥ 3 long, ignoring
// case, extension, and surrounding text. Returns null if we can't recognise it.
export function poFromCsvFilename(filename: string): string | null {
  const stem = filename.replace(/\.[^.]+$/, '');
  const m = stem.match(/(\d{3,})\s*$/);
  if (!m) return null;
  return `PUR-6540-200${m[1]}`;
}

// Apply the two EWP rules from spec §2.3:
//   1. Whole-PO rule: every ticket on PUR-6540-2001271 is EWP 11.
//   2. Per-ticket map for PUR-6540-2001285: look up in TICKET_EWP; null if
//      the WTP code hasn't been assigned yet.
//   Every other PO returns null (not broken down by EWP).
export function ewpForTicket(
  poNumber: string,
  ticketNumber: string
): number | null {
  if (poNumber === 'PUR-6540-2001271') return 11;
  if (poNumber === 'PUR-6540-2001285') {
    return TICKET_EWP[stripDatePrefix(ticketNumber)] ?? null;
  }
  return null;
}

// Every EWP number this project cares about, sorted ascending, for building
// the sub-bucket order on the Ticket Map's PO 2001285 card.
export const EWP_NUMBERS: number[] = Object.keys(EWP_LABEL)
  .map(Number)
  .sort((a, b) => a - b);

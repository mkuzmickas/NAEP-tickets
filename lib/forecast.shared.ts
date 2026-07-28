// Client-safe types + pure helpers for the Forecast module. Nothing here
// imports supabase/server, so 'use client' code can pull it in freely.
// Server fetcher (getForecastPos) lives in ./forecast.ts and MUST NOT be
// imported from a client component.

export type ForecastPo = {
  id: string;
  po_number: string;
  vendor_display_name: string;
  scope: string | null;
  committed: number;
  lem: number;
  percent_complete: number | null;
  /** Forecast at Completion. Null when percent_complete is null or 0
   *  (formula would divide by zero). */
  fac: number | null;
  /** fac - committed. Positive = over-budget forecast. Null when fac is. */
  overrun: number | null;
};

/** FAC = LEM / (% complete ÷ 100). The one place this formula lives, so
 *  every roll-up (dashboard tile, forecast reference line, vendor cards,
 *  per-row cell in the Forecast table) reads from the same source. */
export function computeFac(
  lem: number,
  percentComplete: number | null
): number | null {
  if (percentComplete == null || percentComplete <= 0) return null;
  return lem / (percentComplete / 100);
}

/** The contribution a PO makes to the project-level rolled-up forecast.
 *  Forecasted POs contribute their FAC. Unforecasted POs contribute the
 *  larger of committed and LEM — you can't credibly forecast landing
 *  under what's already been spent, so an over-committed PO with no
 *  manual forecast yet floors at LEM, not committed. */
export function forecastContribution(po: {
  committed: number;
  lem?: number;
  fac: number | null;
}): number {
  if (po.fac != null) return po.fac;
  return Math.max(po.committed, po.lem ?? 0);
}

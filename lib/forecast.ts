import { createClient } from '@/lib/supabase/server';

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
 *  Forecasted POs contribute their FAC; unforecasted POs contribute their
 *  committed value (baseline assumption — the PO will land at budget). */
export function forecastContribution(po: {
  committed: number;
  fac: number | null;
}): number {
  return po.fac ?? po.committed;
}

type RawPo = {
  id: string;
  po_number: string;
  vendor_display_name: string;
  scope: string | null;
  committed_amount: string | number;
  percent_complete: string | number | null;
};

export async function getForecastPos(): Promise<ForecastPo[]> {
  const supabase = createClient();

  const [posRes, ticketsRes] = await Promise.all([
    supabase
      .from('service_pos')
      .select(
        'id, po_number, vendor_display_name, scope, committed_amount, percent_complete'
      ),
    supabase
      .from('tickets')
      .select('po_id, face_value')
      .neq('status', 'rejected'),
  ]);
  if (posRes.error) throw posRes.error;
  if (ticketsRes.error) throw ticketsRes.error;

  const lemByPo = new Map<string, number>();
  for (const t of (ticketsRes.data ?? []) as {
    po_id: string;
    face_value: string | number;
  }[]) {
    lemByPo.set(t.po_id, (lemByPo.get(t.po_id) ?? 0) + Number(t.face_value));
  }

  return ((posRes.data ?? []) as RawPo[]).map((r) => {
    const committed = Number(r.committed_amount);
    const lem = lemByPo.get(r.id) ?? 0;
    const pct =
      r.percent_complete == null ? null : Number(r.percent_complete);
    const fac = computeFac(lem, pct);
    const overrun = fac == null ? null : fac - committed;
    return {
      id: r.id,
      po_number: r.po_number,
      vendor_display_name: r.vendor_display_name,
      scope: r.scope,
      committed,
      lem,
      percent_complete: pct,
      fac,
      overrun,
    };
  });
}

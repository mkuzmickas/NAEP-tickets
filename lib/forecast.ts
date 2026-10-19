import { createClient } from '@/lib/supabase/server';
import { paginateQuery } from '@/lib/supabase/paginate';
import { computeFac, type ForecastPo } from '@/lib/forecast.shared';

// Re-export the pure surface so server callers can grab the type/formula
// alongside getForecastPos in one line. Client components must import
// from '@/lib/forecast.shared' directly — importing from this file pulls
// in next/headers via the supabase server client and Next.js will refuse.
export {
  computeFac,
  forecastContribution,
  type ForecastPo,
} from '@/lib/forecast.shared';

type RawPo = {
  id: string;
  po_number: string;
  vendor_display_name: string;
  scope: string | null;
  committed_amount: string | number;
  ap_invoiced_amount: string | number;
  percent_complete: string | number | null;
};

export async function getForecastPos(): Promise<ForecastPo[]> {
  const supabase = createClient();

  const [posRes, ticketsRes] = await Promise.all([
    supabase
      .from('service_pos')
      .select(
        'id, po_number, vendor_display_name, scope, committed_amount, ap_invoiced_amount, percent_complete'
      ),
    paginateQuery<{ po_id: string; face_value: string | number }>((from, to) =>
      supabase
        .from('tickets')
        .select('po_id, face_value')
        .neq('status', 'rejected')
        .range(from, to)
    ).then((data) => ({ data, error: null as null | { message: string } })),
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
    // LEM = max(tickets_sum, ap_invoiced_amount). Mirrors the vendor-page
    // formula so the Forecast tab reflects cost-report-driven vendors
    // (Medallion) correctly. Ticket-driven vendors have ap_invoiced = 0
    // so max = tickets_sum. Cost-report POs have cost report >= stale
    // tickets so max = ap_invoiced_amount. One formula, both cases.
    const apInvoiced = Number(r.ap_invoiced_amount ?? 0) || 0;
    const ticketLem = lemByPo.get(r.id) ?? 0;
    const lem = Math.max(ticketLem, apInvoiced);
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

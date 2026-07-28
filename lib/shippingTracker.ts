import { createClient } from '@/lib/supabase/server';

export type TrackerPackage = {
  id: string;
  ewp: string;
  tag: string;
  length_ft: number | null;
  width_ft: number | null;
  height_ft: number | null;
  weight_lbs: string | null;
  budget_shipping: number;
  budget_permits: number;
  budget_total: number;
  rts_date: string | null;
  planned_ship_date: string | null;
  actual: number;
  ticket_count: number;
  sort_order: number;
};

export type TrackerTicket = {
  id: string;
  po_id: string;
  po_number: string;
  ticket_number: string;
  ticket_date: string;
  face_value: number;
  status: 'pending' | 'invoiced' | 'rejected';
  schedule_package_id: string | null;
  schedule_package_tag: string | null;
};

export type TrendPoint = { date: string; value: number };

export type ShippingTrackerData = {
  packages: TrackerPackage[];
  ticketsByPo: {
    po_id: string;
    po_number: string;
    vendor_display_name: string;
    tickets: TrackerTicket[];
  }[];
  trend: {
    forecast: TrendPoint[]; // point-in-time budget contributions on planned ship dates
    actual: TrendPoint[]; // point-in-time actual contributions on ticket dates
  };
};

type RawPkg = {
  id: string;
  ewp: string;
  tag: string;
  length_ft: string | number | null;
  width_ft: string | number | null;
  height_ft: string | number | null;
  weight_lbs: string | null;
  shipping_cost: string | number | null;
  permits_cost: string | number | null;
  total_cost: string | number | null;
  rts_date: string | null;
  planned_ship_date: string | null;
  sort_order: number;
};

type RawTicket = {
  id: string;
  po_id: string;
  ticket_number: string;
  ticket_date: string;
  face_value: string | number;
  status: 'pending' | 'invoiced' | 'rejected';
  schedule_package_id: string | null;
};

function n(v: string | number | null): number | null {
  if (v === null || v === '') return null;
  const x = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(x) ? x : null;
}

function num(v: string | number | null): number {
  const x = n(v);
  return x ?? 0;
}

export async function getShippingTrackerData(): Promise<ShippingTrackerData> {
  const supabase = createClient();

  // Every schedule_packages row is a budget line — even if it has no tickets yet.
  const { data: pkgRows, error: pkgErr } = await supabase
    .from('schedule_packages')
    .select(
      'id, ewp, tag, length_ft, width_ft, height_ft, weight_lbs, shipping_cost, permits_cost, total_cost, rts_date, planned_ship_date, sort_order'
    )
    .order('sort_order', { ascending: true });
  if (pkgErr) throw pkgErr;

  // Every PO that opts into shipping tracking (right now: LaPrairie 2001283).
  const { data: poRows, error: poErr } = await supabase
    .from('service_pos')
    .select('id, po_number, vendor_display_name')
    .eq('tracks_shipping', true);
  if (poErr) throw poErr;

  const trackedPoIds = (poRows ?? []).map((p) => p.id);

  // Every non-rejected ticket on those POs, so we can build both the per-package
  // actuals AND the "needs assignment" queue in one shot.
  let ticketRows: RawTicket[] = [];
  if (trackedPoIds.length > 0) {
    const { data, error } = await supabase
      .from('tickets')
      .select(
        'id, po_id, ticket_number, ticket_date, face_value, status, schedule_package_id'
      )
      .in('po_id', trackedPoIds)
      .neq('status', 'rejected')
      .order('ticket_date', { ascending: true });
    if (error) throw error;
    ticketRows = (data ?? []) as RawTicket[];
  }

  const pkgById = new Map<string, RawPkg>();
  for (const p of (pkgRows ?? []) as RawPkg[]) pkgById.set(p.id, p);

  const packages: TrackerPackage[] = ((pkgRows ?? []) as RawPkg[]).map((r) => {
    const shipping = num(r.shipping_cost);
    const permits = num(r.permits_cost);
    const total = num(r.total_cost) || shipping + permits;
    const tix = ticketRows.filter((t) => t.schedule_package_id === r.id);
    return {
      id: r.id,
      ewp: r.ewp,
      tag: r.tag,
      length_ft: n(r.length_ft),
      width_ft: n(r.width_ft),
      height_ft: n(r.height_ft),
      weight_lbs: r.weight_lbs,
      budget_shipping: shipping,
      budget_permits: permits,
      budget_total: total,
      rts_date: r.rts_date,
      planned_ship_date: r.planned_ship_date,
      actual: tix.reduce((s, t) => s + Number(t.face_value), 0),
      ticket_count: tix.length,
      sort_order: r.sort_order,
    };
  });

  const poMap = new Map(
    (poRows ?? []).map((p) => [
      p.id,
      { po_number: p.po_number as string, vendor_display_name: p.vendor_display_name as string },
    ])
  );

  const ticketsByPo = trackedPoIds.map((poId) => {
    const po = poMap.get(poId)!;
    const tix = ticketRows
      .filter((t) => t.po_id === poId)
      .map((t) => {
        const pkg = t.schedule_package_id
          ? pkgById.get(t.schedule_package_id)
          : null;
        return {
          id: t.id,
          po_id: t.po_id,
          po_number: po.po_number,
          ticket_number: t.ticket_number,
          ticket_date: t.ticket_date,
          face_value: Number(t.face_value),
          status: t.status,
          schedule_package_id: t.schedule_package_id,
          schedule_package_tag: pkg ? pkg.tag : null,
        };
      });
    return {
      po_id: poId,
      po_number: po.po_number,
      vendor_display_name: po.vendor_display_name,
      tickets: tix,
    };
  });

  // Trend series — every dated budget line and every dated ticket, sorted so
  // the client can cumulative-sum in render.
  const forecast: TrendPoint[] = ((pkgRows ?? []) as RawPkg[])
    .filter((r) => r.planned_ship_date)
    .map((r) => ({
      date: r.planned_ship_date as string,
      value: num(r.total_cost) || num(r.shipping_cost) + num(r.permits_cost),
    }))
    .filter((p) => p.value > 0)
    .sort((a, b) => a.date.localeCompare(b.date));

  const actual: TrendPoint[] = ticketRows
    .map((t) => ({
      date: t.ticket_date,
      value: Number(t.face_value),
    }))
    .filter((p) => p.value > 0)
    .sort((a, b) => a.date.localeCompare(b.date));

  return { packages, ticketsByPo, trend: { forecast, actual } };
}

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
  /** Locked-in commitment date. Doesn't move when the schedule shifts. */
  baseline_ship_date: string | null;
  /** Current best-estimate ship date, dragged around on the schedule board. */
  planned_ship_date: string | null;
  /** Earliest LaPrairie ticket date tied to this package (null if none yet). */
  actual_ship_date: string | null;
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
  /** Concatenated markup_notes + line_item descriptions — used to suggest the
   *  matching schedule package when the user opens the assign modal. */
  field_notes: string | null;
};

export type TrendPoint = {
  date: string;
  value: number;
  package_tag: string | null;
  ewp: string | null;
};

/**
 * Single source of truth for the tracker's cost metrics. Shared by the KPI
 * tiles on the tracker page and by the pill on the Forecast vs Actual chart
 * so those two numbers can't drift.
 *
 *   isShipped(p)  = actual_ship_date is set OR baseline (or fallback
 *                    planned) date has already passed
 *   effective(p)  = max(actual, budget_total) — budget is treated as a
 *                    floor so packages waiting on LaPrairie invoices
 *                    don't fake as savings
 *   overrun       = Σ effective(p) − Σ budget_total(p)  for shipped
 *   fac           = Σ effective(p) for shipped
 *                    + Σ budget_total(p) for un-shipped
 *                    (i.e. past overruns stick, future packages assumed
 *                     to hold budget)
 */
export function computeShippingMetrics(packages: TrackerPackage[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString().slice(0, 10);

  let totalBudget = 0;
  let totalActual = 0;
  let shippedBudget = 0;
  let shippedActual = 0;
  let shippedEffective = 0;
  let shippedPkgCount = 0;
  let overCount = 0;
  let overSum = 0;
  let underOrPendingCount = 0;
  let fac = 0;

  for (const p of packages) {
    totalBudget += p.budget_total;
    totalActual += p.actual;

    const baseline = p.baseline_ship_date ?? p.planned_ship_date;
    const dueByNow = !!baseline && baseline <= todayIso;
    const shipped = !!p.actual_ship_date;
    const isShipped = dueByNow || shipped;
    const effective = Math.max(p.actual, p.budget_total);

    if (isShipped) {
      shippedBudget += p.budget_total;
      shippedActual += p.actual;
      shippedEffective += effective;
      shippedPkgCount += 1;
      if (p.actual > p.budget_total) {
        overCount += 1;
        overSum += p.actual - p.budget_total;
      } else {
        underOrPendingCount += 1;
      }
      fac += effective;
    } else {
      fac += p.budget_total;
    }
  }

  return {
    totalBudget,
    totalActual,
    shippedBudget,
    shippedActual,
    shippedPkgCount,
    overCount,
    overSum,
    underOrPendingCount,
    overrun: shippedEffective - shippedBudget,
    fac,
  };
}

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
  baseline_ship_date: string | null;
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
  markup_notes: string | null;
  line_items: { description: string }[];
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
      'id, ewp, tag, length_ft, width_ft, height_ft, weight_lbs, shipping_cost, permits_cost, total_cost, rts_date, baseline_ship_date, planned_ship_date, sort_order'
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
        'id, po_id, ticket_number, ticket_date, face_value, status, schedule_package_id, markup_notes, line_items ( description )'
      )
      .in('po_id', trackedPoIds)
      .neq('status', 'rejected')
      .order('ticket_date', { ascending: true });
    if (error) throw error;
    ticketRows = (data ?? []) as unknown as RawTicket[];
  }

  const pkgById = new Map<string, RawPkg>();
  for (const p of (pkgRows ?? []) as RawPkg[]) pkgById.set(p.id, p);

  const packages: TrackerPackage[] = ((pkgRows ?? []) as RawPkg[]).map((r) => {
    const shipping = num(r.shipping_cost);
    const permits = num(r.permits_cost);
    const total = num(r.total_cost) || shipping + permits;
    const tix = ticketRows.filter((t) => t.schedule_package_id === r.id);
    // Actual ship date = earliest LaPrairie ticket date tied to this
    // package. If no tickets are on file, actual_ship_date is null and
    // the tracker knows the package hasn't rolled yet.
    const ticketDates = tix
      .map((t) => t.ticket_date)
      .filter((d): d is string => !!d)
      .sort();
    const actual_ship_date = ticketDates.length > 0 ? ticketDates[0] : null;
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
      baseline_ship_date: r.baseline_ship_date,
      planned_ship_date: r.planned_ship_date,
      actual_ship_date,
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
        // Fold markup_notes + every line-item description into a single
        // searchable string. Empty string collapses to null so the client
        // can distinguish "no notes on file" from "notes matched nothing".
        const notesParts: string[] = [];
        if (t.markup_notes) notesParts.push(t.markup_notes);
        for (const li of t.line_items ?? []) {
          if (li.description) notesParts.push(li.description);
        }
        const notes = notesParts.join(' · ').trim();
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
          field_notes: notes.length > 0 ? notes : null,
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
  // the client can cumulative-sum in render. Each point carries the schedule
  // package it belongs to (tag + ewp) so the CSV export can group by package.
  const forecast: TrendPoint[] = ((pkgRows ?? []) as RawPkg[])
    .filter((r) => r.planned_ship_date)
    .map((r) => ({
      date: r.planned_ship_date as string,
      value: num(r.total_cost) || num(r.shipping_cost) + num(r.permits_cost),
      package_tag: r.tag,
      ewp: r.ewp,
    }))
    .filter((p) => p.value > 0)
    .sort((a, b) => a.date.localeCompare(b.date));

  const actual: TrendPoint[] = ticketRows
    .map((t) => {
      const pkg = t.schedule_package_id ? pkgById.get(t.schedule_package_id) : null;
      return {
        date: t.ticket_date,
        value: Number(t.face_value),
        package_tag: pkg ? pkg.tag : null,
        ewp: pkg ? pkg.ewp : null,
      };
    })
    .filter((p) => p.value > 0)
    .sort((a, b) => a.date.localeCompare(b.date));

  return { packages, ticketsByPo, trend: { forecast, actual } };
}

import { createClient } from '@/lib/supabase/server';
import { computeFac, forecastContribution } from '@/lib/forecast';

export type TicketBrief = {
  id: string;
  ticket_number: string;
  ticket_date: string;
  face_value: number;
  status: 'pending' | 'invoiced' | 'rejected';
};

export type PoWithTickets = {
  id: string;
  po_number: string;
  scope: string | null;
  project_cost_code: string | null;
  vendor_job_ref: string | null;
  committed: number;
  lem: number;
  vendor_system_incurred: number | null;
  vendor_gap: number | null;
  percent_complete: number | null;
  /** LEM ÷ (% complete/100). Null when %complete is null or 0. */
  forecast: number | null;
  tickets: TicketBrief[];
};

export type VendorSummary = {
  slug: string;
  vendor_display_name: string;
  vendor_legal_name: string;
  po_count: number;
  total_committed: number;
  total_lem: number;
  total_pending_value: number;
  ticket_count: number;
  approved_count: number;
  pending_count: number;
  /** Σ forecastContribution across every PO — FAC where forecasted,
   *  committed where not. Matches the dashboard rollup rule. */
  total_forecast: number;
  /** Number of POs on this vendor with a real forecast (percent_complete > 0). */
  forecasted_po_count: number;
  last_ticket_date: string | null;
  pos: PoWithTickets[];
};

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

type RawPo = {
  id: string;
  po_number: string;
  vendor_display_name: string;
  vendor_legal_name: string;
  scope: string | null;
  project_cost_code: string | null;
  vendor_job_ref: string | null;
  committed_amount: string | number;
  vendor_system_incurred: string | number | null;
  percent_complete: string | number | null;
};

type RawTicket = {
  id: string;
  po_id: string;
  ticket_number: string;
  ticket_date: string;
  face_value: string | number;
  status: 'pending' | 'invoiced' | 'rejected';
};

export async function getAllVendors(): Promise<VendorSummary[]> {
  const supabase = createClient();

  const [posRes, ticketsRes] = await Promise.all([
    supabase
      .from('service_pos')
      .select(
        'id, po_number, vendor_display_name, vendor_legal_name, scope, project_cost_code, vendor_job_ref, committed_amount, vendor_system_incurred, percent_complete'
      ),
    supabase
      .from('tickets')
      .select('id, po_id, ticket_number, ticket_date, face_value, status')
      .neq('status', 'rejected')
      .order('ticket_date', { ascending: true }),
  ]);

  if (posRes.error) throw posRes.error;
  if (ticketsRes.error) throw ticketsRes.error;

  const ticketsByPo = new Map<string, TicketBrief[]>();
  for (const t of (ticketsRes.data ?? []) as RawTicket[]) {
    const arr = ticketsByPo.get(t.po_id) ?? [];
    arr.push({
      id: t.id,
      ticket_number: t.ticket_number,
      ticket_date: t.ticket_date,
      face_value: Number(t.face_value),
      status: t.status,
    });
    ticketsByPo.set(t.po_id, arr);
  }

  const posByVendor = new Map<string, VendorSummary>();
  for (const p of (posRes.data ?? []) as RawPo[]) {
    const tickets = ticketsByPo.get(p.id) ?? [];
    const committed = Number(p.committed_amount);
    const lem = tickets.reduce((s, t) => s + t.face_value, 0);
    const vsi =
      p.vendor_system_incurred == null
        ? null
        : Number(p.vendor_system_incurred);
    const gap = vsi == null ? null : vsi - lem;

    const pct =
      p.percent_complete == null ? null : Number(p.percent_complete);
    const forecast = computeFac(lem, pct);

    const po: PoWithTickets = {
      id: p.id,
      po_number: p.po_number,
      scope: p.scope,
      project_cost_code: p.project_cost_code,
      vendor_job_ref: p.vendor_job_ref,
      committed,
      lem,
      vendor_system_incurred: vsi,
      vendor_gap: gap,
      percent_complete: pct,
      forecast,
      tickets,
    };

    let v = posByVendor.get(p.vendor_display_name);
    if (!v) {
      v = {
        slug: slugify(p.vendor_display_name),
        vendor_display_name: p.vendor_display_name,
        vendor_legal_name: p.vendor_legal_name,
        po_count: 0,
        total_committed: 0,
        total_lem: 0,
        total_pending_value: 0,
        ticket_count: 0,
        approved_count: 0,
        pending_count: 0,
        total_forecast: 0,
        forecasted_po_count: 0,
        last_ticket_date: null,
        pos: [],
      };
      posByVendor.set(p.vendor_display_name, v);
    }
    v.po_count++;
    v.total_committed += committed;
    v.total_lem += lem;
    v.total_forecast += forecastContribution({ committed, fac: forecast });
    if (forecast != null) v.forecasted_po_count++;
    v.ticket_count += tickets.length;
    v.approved_count += tickets.filter((t) => t.status === 'invoiced').length;
    v.pending_count += tickets.filter((t) => t.status === 'pending').length;
    v.total_pending_value += tickets
      .filter((t) => t.status === 'pending')
      .reduce((s, t) => s + t.face_value, 0);
    for (const t of tickets) {
      if (!v.last_ticket_date || t.ticket_date > v.last_ticket_date) {
        v.last_ticket_date = t.ticket_date;
      }
    }
    v.pos.push(po);
  }

  for (const v of posByVendor.values()) {
    v.pos.sort((a, b) => b.committed - a.committed);
  }

  return Array.from(posByVendor.values()).sort(
    (a, b) => b.total_committed - a.total_committed
  );
}

export function findVendor(
  vendors: VendorSummary[],
  slug: string
): VendorSummary | null {
  return vendors.find((v) => v.slug === slug) ?? null;
}

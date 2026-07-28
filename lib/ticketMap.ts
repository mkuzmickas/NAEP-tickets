import { createClient } from '@/lib/supabase/server';
import {
  JOB_TO_PO,
  stripDatePrefix,
  EWP_LABEL,
} from '@/lib/ewp/ticket-ewp';

// -----------------------------------------------------------------------------
// Legacy shapes — still consumed by the current TicketMap component until the
// UI redesign in Step 6 lands. Delete once nothing references them.
// -----------------------------------------------------------------------------

export type TicketMapPo = {
  id: string;
  po_number: string;
  vendor_display_name: string;
  scope: string | null;
  committed_amount: number;
};

export type TicketMapTicket = {
  id: string;
  po_id: string;
  ticket_number: string;
  ticket_date: string;
  face_value: number;
  status: 'pending' | 'invoiced' | 'rejected';
  pdf_storage_path: string | null;
};

type RawPo = Omit<TicketMapPo, 'committed_amount'> & {
  committed_amount: string | number;
};

type RawTicket = Omit<TicketMapTicket, 'face_value'> & {
  face_value: string | number;
};

export async function getAllPosForMap(): Promise<TicketMapPo[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('service_pos')
    .select('id, po_number, vendor_display_name, scope, committed_amount')
    .order('po_number', { ascending: true });
  if (error) throw error;
  return (data as RawPo[]).map((r) => ({
    id: r.id,
    po_number: r.po_number,
    vendor_display_name: r.vendor_display_name,
    scope: r.scope,
    committed_amount: Number(r.committed_amount),
  }));
}

export async function getTicketsForPoIds(
  poIds: string[]
): Promise<TicketMapTicket[]> {
  if (poIds.length === 0) return [];
  const supabase = createClient();
  const { data, error } = await supabase
    .from('tickets')
    .select('id, po_id, ticket_number, ticket_date, face_value, status, pdf_storage_path')
    .in('po_id', poIds)
    .neq('status', 'rejected')
    .order('ticket_date', { ascending: true });
  if (error) throw error;
  return (data as RawTicket[]).map((r) => ({
    id: r.id,
    po_id: r.po_id,
    ticket_number: r.ticket_number,
    ticket_date: r.ticket_date,
    face_value: Number(r.face_value),
    status: r.status,
    pdf_storage_path: r.pdf_storage_path,
  }));
}

// -----------------------------------------------------------------------------
// SureLine-style Ticket Map data — approval + EWP shaped output that the
// redesigned TicketMap component (Step 6) will render off directly.
// -----------------------------------------------------------------------------

// Green colouring on the map is driven by this exact string, per the spec.
export const APPROVED_LABEL = 'Approved by Client/PM' as const;

export type MapTicket = {
  id: string;
  po_id: string;
  /** As stored — may include a leading date prefix from Aimsio. */
  ticket_number: string;
  /** Ticket number with any leading date prefix stripped AND the `SL26-`
   *  prefix removed — this is what the chip actually displays. */
  ticket_number_short: string;
  ticket_date: string;
  face_value: number;
  approval_status: string | null;
  approved: boolean;
  ewp_no: number | null;
  pdf_storage_path: string | null;
};

export type MapPo = {
  id: string;
  po_number: string;
  vendor_display_name: string;
  scope: string | null;
  /** SL26-XXX derived from the reverse of JOB_TO_PO. Null for POs that
   *  aren't in the SureLine job register (Medallion, LaPrairie, etc.). */
  job_number: string | null;
  /** True for POs that carry the "tracked by EWP" amber badge — 2001285
   *  (per-ticket EWP) and 2001271 (whole-PO EWP 11). */
  ewp_tracked: boolean;
  /** True only for POs whose card renders EWP sub-buckets instead of a
   *  flat chip row. Right now: 2001285 only. */
  is_ewp_broken_down: boolean;
  ticket_count: number;
  approved_count: number;
  not_approved_count: number;
  total_billable: number;
  value_at_risk: number;
  tickets: MapTicket[];
};

export type MapEwpBucket = {
  ewp_no: number | null;
  title: string;
  tickets: MapTicket[];
  count: number;
  sum_billable: number;
};

export type TicketMapData = {
  pos: MapPo[];
  /** Distinct SL26 job numbers across every PO, sorted, for the filter bar. */
  jobs: string[];
  totals: {
    tickets: number;
    approved: number;
    not_approved: number;
    value_at_risk: number;
    jobs: number;
  };
};

// PO → job reverse map, built once at module load.
const PO_TO_JOB: Record<string, string> = {};
for (const [job, po] of Object.entries(JOB_TO_PO)) {
  PO_TO_JOB[po] = job;
}

const EWP_TRACKED_POS = new Set([
  'PUR-6540-2001285',
  'PUR-6540-2001271',
]);

const EWP_BROKEN_DOWN_POS = new Set([
  'PUR-6540-2001285',
]);

type RawTicketV2 = {
  id: string;
  po_id: string;
  ticket_number: string;
  ticket_date: string;
  face_value: string | number;
  approval_status: string | null;
  ewp_no: number | null;
  pdf_storage_path: string | null;
};

type RawPoV2 = {
  id: string;
  po_number: string;
  vendor_display_name: string;
  scope: string | null;
};

/** Trim the leading date prefix and the `SL26-` marker so chips read as
 *  `101-000-001` instead of the full stored string. */
function shortTicketNumber(ticketNumber: string): string {
  const base = stripDatePrefix(ticketNumber);
  return base.startsWith('SL26-') ? base.slice(5) : base;
}

export async function getTicketMapData(): Promise<TicketMapData> {
  const supabase = createClient();

  const [posRes, ticketsRes] = await Promise.all([
    supabase
      .from('service_pos')
      .select('id, po_number, vendor_display_name, scope')
      .order('po_number', { ascending: true }),
    supabase
      .from('tickets')
      .select(
        'id, po_id, ticket_number, ticket_date, face_value, approval_status, ewp_no, pdf_storage_path'
      )
      .neq('status', 'rejected')
      .order('ticket_date', { ascending: true }),
  ]);

  if (posRes.error) throw posRes.error;
  if (ticketsRes.error) throw ticketsRes.error;

  const rawTickets = (ticketsRes.data ?? []) as RawTicketV2[];

  const ticketsByPo = new Map<string, MapTicket[]>();
  for (const t of rawTickets) {
    const face = Number(t.face_value);
    const mapped: MapTicket = {
      id: t.id,
      po_id: t.po_id,
      ticket_number: t.ticket_number,
      ticket_number_short: shortTicketNumber(t.ticket_number),
      ticket_date: t.ticket_date,
      face_value: face,
      approval_status: t.approval_status,
      approved: t.approval_status === APPROVED_LABEL,
      ewp_no: t.ewp_no,
      pdf_storage_path: t.pdf_storage_path,
    };
    const arr = ticketsByPo.get(t.po_id) ?? [];
    arr.push(mapped);
    ticketsByPo.set(t.po_id, arr);
  }

  const pos: MapPo[] = ((posRes.data ?? []) as RawPoV2[]).map((r) => {
    const tickets = ticketsByPo.get(r.id) ?? [];
    const approvedCount = tickets.filter((t) => t.approved).length;
    const notApprovedCount = tickets.length - approvedCount;
    const totalBillable = tickets.reduce((s, t) => s + t.face_value, 0);
    const valueAtRisk = tickets
      .filter((t) => !t.approved)
      .reduce((s, t) => s + t.face_value, 0);

    return {
      id: r.id,
      po_number: r.po_number,
      vendor_display_name: r.vendor_display_name,
      scope: r.scope,
      job_number: PO_TO_JOB[r.po_number] ?? null,
      ewp_tracked: EWP_TRACKED_POS.has(r.po_number),
      is_ewp_broken_down: EWP_BROKEN_DOWN_POS.has(r.po_number),
      ticket_count: tickets.length,
      approved_count: approvedCount,
      not_approved_count: notApprovedCount,
      total_billable: totalBillable,
      value_at_risk: valueAtRisk,
      tickets,
    };
  });

  // Card order per spec §3.4: PO 2001285 first, then everything else by
  // ticket count descending, ties broken by po_number for stability.
  pos.sort((a, b) => {
    if (a.po_number === 'PUR-6540-2001285') return -1;
    if (b.po_number === 'PUR-6540-2001285') return 1;
    if (b.ticket_count !== a.ticket_count) {
      return b.ticket_count - a.ticket_count;
    }
    return a.po_number.localeCompare(b.po_number);
  });

  const jobs = Array.from(
    new Set(pos.map((p) => p.job_number).filter((j): j is string => !!j))
  ).sort();

  const totals = {
    tickets: pos.reduce((s, p) => s + p.ticket_count, 0),
    approved: pos.reduce((s, p) => s + p.approved_count, 0),
    not_approved: pos.reduce((s, p) => s + p.not_approved_count, 0),
    value_at_risk: pos.reduce((s, p) => s + p.value_at_risk, 0),
    jobs: jobs.length,
  };

  return { pos, jobs, totals };
}

/** Group a PO's tickets into EWP sub-buckets in the exact order the card
 *  renders them: EWP numbers ascending, Unassigned last. Every EWP number
 *  we know about (Appendix B) that has at least one ticket gets a bucket;
 *  numbers with zero tickets are omitted so the card doesn't grow blank
 *  boxes. */
export function bucketTicketsByEwp(tickets: MapTicket[]): MapEwpBucket[] {
  const byEwp = new Map<number, MapTicket[]>();
  const unassigned: MapTicket[] = [];

  for (const t of tickets) {
    if (t.ewp_no == null) {
      unassigned.push(t);
    } else {
      const arr = byEwp.get(t.ewp_no) ?? [];
      arr.push(t);
      byEwp.set(t.ewp_no, arr);
    }
  }

  const buckets: MapEwpBucket[] = Array.from(byEwp.entries())
    .sort(([a], [b]) => a - b)
    .map(([ewp, ts]) => ({
      ewp_no: ewp,
      title: EWP_LABEL[ewp] ?? `EWP ${ewp}`,
      tickets: ts,
      count: ts.length,
      sum_billable: ts.reduce((s, t) => s + t.face_value, 0),
    }));

  if (unassigned.length > 0) {
    buckets.push({
      ewp_no: null,
      title: 'Unassigned to EWP',
      tickets: unassigned,
      count: unassigned.length,
      sum_billable: unassigned.reduce((s, t) => s + t.face_value, 0),
    });
  }

  return buckets;
}

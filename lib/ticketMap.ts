import { createClient } from '@/lib/supabase/server';
import { JOB_TO_PO } from '@/lib/ewp/ticket-ewp';
import {
  APPROVED_LABEL,
  shortTicketNumber,
  type MapPo,
  type MapTicket,
  type TicketMapData,
} from '@/lib/ticketMap.shared';

// Re-export the shared surface so `import { ... } from '@/lib/ticketMap'`
// still works for server-side callers that want to grab the type alongside
// getTicketMapData in one line. Client components must import from
// `@/lib/ticketMap.shared` directly — importing from this file pulls in
// next/headers via the supabase server client and Next.js will refuse.
export {
  APPROVED_LABEL,
  bucketTicketsByEwp,
  shortTicketNumber,
  type MapEwpBucket,
  type MapPo,
  type MapTicket,
  type TicketMapData,
} from '@/lib/ticketMap.shared';

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

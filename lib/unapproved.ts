import { createClient } from '@/lib/supabase/server';
import {
  ewpForTicket,
  isMultipleEwpTicket,
  stripDatePrefix,
} from '@/lib/ewp/ticket-ewp';

/**
 * Unapproved / at-risk ticket rollup for the /unapproved page.
 *
 * "Unapproved" = tickets currently at status='pending'. Covers every
 * Aimsio-CSV ticket whose Office Approval Status isn't "Approved by
 * Client/PM" plus any tickets flipped to pending manually (e.g., signed
 * PDFs uploaded via the Mark-as-approved flow only touch invoiced-side).
 * Legacy status='invoiced' + approval_status=null tickets (GNB, Medallion
 * SQL loads) are assumed approved per the uploads-are-approved rule and
 * stay excluded.
 */

export type UnapprovedTicket = {
  id: string;
  ticket_number: string;
  /** Ticket number stripped of any leading date prefix + the `SL26-`
   *  marker so chips read `101-000-052` etc. */
  ticket_number_short: string;
  ticket_date: string;
  face_value: number;
  approval_status: string | null;
  ewp_no: number | null;
  is_multiple_ewp: boolean;
  /** Days between ticket_date and today. Aging signal — old + unapproved
   *  is the row that needs a nudge to Sureline / Kip / Des. */
  days_old: number;
};

export type UnapprovedPo = {
  id: string;
  po_number: string;
  scope: string | null;
  vendor_job_ref: string | null;
  project_cost_code: string | null;
  committed: number;
  /** Total LEM on the PO (approved + pending). Included so a reader can
   *  compare at-risk against total spend without leaving the page. */
  lem: number;
  ewp_tracked: boolean;
  tickets: UnapprovedTicket[];
  ticket_count: number;
  at_risk: number;
  oldest_ticket_date: string | null;
};

export type UnapprovedVendor = {
  slug: string;
  vendor_display_name: string;
  vendor_legal_name: string;
  pos: UnapprovedPo[];
  po_count: number;
  ticket_count: number;
  at_risk: number;
  oldest_ticket_date: string | null;
};

export type UnapprovedData = {
  vendors: UnapprovedVendor[];
  totals: {
    at_risk: number;
    ticket_count: number;
    vendor_count: number;
    po_count: number;
    oldest_ticket_date: string | null;
  };
};

type RawPo = {
  id: string;
  po_number: string;
  vendor_display_name: string;
  vendor_legal_name: string;
  scope: string | null;
  project_cost_code: string | null;
  vendor_job_ref: string | null;
  committed_amount: string | number;
};

type RawTicket = {
  id: string;
  po_id: string;
  ticket_number: string;
  ticket_date: string;
  face_value: string | number;
  approval_status: string | null;
  ewp_no: number | null;
};

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function shortTicketNumber(ticketNumber: string): string {
  const base = stripDatePrefix(ticketNumber);
  return base.startsWith('SL26-') ? base.slice(5) : base;
}

function daysSince(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return 0;
  const then = new Date(y, m - 1, d);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round(
    (now.getTime() - then.getTime()) / (24 * 60 * 60 * 1000)
  );
}

const EWP_TRACKED_POS = new Set(['PUR-6540-2001285', 'PUR-6540-2001271']);

export async function getUnapprovedData(): Promise<UnapprovedData> {
  const supabase = createClient();

  // Pull every non-rejected ticket + its PO. Filtering to pending at the
  // DB level so the payload stays small.
  const [posRes, ticketsRes] = await Promise.all([
    supabase
      .from('service_pos')
      .select(
        'id, po_number, vendor_display_name, vendor_legal_name, scope, project_cost_code, vendor_job_ref, committed_amount'
      ),
    supabase
      .from('tickets')
      .select(
        'id, po_id, ticket_number, ticket_date, face_value, approval_status, ewp_no'
      )
      .eq('status', 'pending')
      .order('ticket_date', { ascending: false }),
  ]);
  if (posRes.error) throw posRes.error;
  if (ticketsRes.error) throw ticketsRes.error;

  const poRows = (posRes.data ?? []) as RawPo[];
  const ticketRows = (ticketsRes.data ?? []) as RawTicket[];

  // Need per-PO totals for the LEM display — sum EVERY non-rejected
  // ticket per PO (not just pending). Second small query for that.
  const { data: allLemRows, error: lemErr } = await supabase
    .from('tickets')
    .select('po_id, face_value')
    .neq('status', 'rejected');
  if (lemErr) throw lemErr;
  const lemByPo = new Map<string, number>();
  for (const r of (allLemRows ?? []) as { po_id: string; face_value: string | number }[]) {
    lemByPo.set(
      r.po_id,
      (lemByPo.get(r.po_id) ?? 0) + Number(r.face_value)
    );
  }

  // Map ticket rows into the display shape, with the 2001285 EWP override.
  const poNumberById = new Map<string, string>();
  for (const p of poRows) poNumberById.set(p.id, p.po_number);

  const ticketsByPo = new Map<string, UnapprovedTicket[]>();
  for (const t of ticketRows) {
    const poNumber = poNumberById.get(t.po_id) ?? '';
    const isMultiple = isMultipleEwpTicket(poNumber, t.ticket_number);
    const codeEwp =
      poNumber === 'PUR-6540-2001285'
        ? ewpForTicket(poNumber, t.ticket_number)
        : t.ewp_no;

    const mapped: UnapprovedTicket = {
      id: t.id,
      ticket_number: t.ticket_number,
      ticket_number_short: shortTicketNumber(t.ticket_number),
      ticket_date: t.ticket_date,
      face_value: Number(t.face_value),
      approval_status: t.approval_status,
      ewp_no: isMultiple ? null : codeEwp,
      is_multiple_ewp: isMultiple,
      days_old: daysSince(t.ticket_date),
    };
    const arr = ticketsByPo.get(t.po_id) ?? [];
    arr.push(mapped);
    ticketsByPo.set(t.po_id, arr);
  }

  // Build per-PO summaries, keeping only POs that have at least one pending.
  const posWithPending: UnapprovedPo[] = [];
  const posById = new Map<string, UnapprovedPo>();
  for (const p of poRows) {
    const tickets = ticketsByPo.get(p.id);
    if (!tickets || tickets.length === 0) continue;
    // Sort tickets: oldest first (they've been waiting longest).
    tickets.sort((a, b) => a.ticket_date.localeCompare(b.ticket_date));
    const po: UnapprovedPo = {
      id: p.id,
      po_number: p.po_number,
      scope: p.scope,
      vendor_job_ref: p.vendor_job_ref,
      project_cost_code: p.project_cost_code,
      committed: Number(p.committed_amount),
      lem: lemByPo.get(p.id) ?? 0,
      ewp_tracked: EWP_TRACKED_POS.has(p.po_number),
      tickets,
      ticket_count: tickets.length,
      at_risk: tickets.reduce((s, t) => s + t.face_value, 0),
      oldest_ticket_date: tickets[0]?.ticket_date ?? null,
    };
    posWithPending.push(po);
    posById.set(p.id, po);
  }

  // Group by vendor.
  const vendorMap = new Map<string, UnapprovedVendor>();
  for (const p of poRows) {
    const po = posById.get(p.id);
    if (!po) continue;
    const key = p.vendor_display_name;
    let v = vendorMap.get(key);
    if (!v) {
      v = {
        slug: slugify(p.vendor_display_name),
        vendor_display_name: p.vendor_display_name,
        vendor_legal_name: p.vendor_legal_name,
        pos: [],
        po_count: 0,
        ticket_count: 0,
        at_risk: 0,
        oldest_ticket_date: null,
      };
      vendorMap.set(key, v);
    }
    v.pos.push(po);
    v.po_count++;
    v.ticket_count += po.ticket_count;
    v.at_risk += po.at_risk;
    if (
      po.oldest_ticket_date &&
      (!v.oldest_ticket_date || po.oldest_ticket_date < v.oldest_ticket_date)
    ) {
      v.oldest_ticket_date = po.oldest_ticket_date;
    }
  }

  // Sort POs inside each vendor by at-risk value descending — biggest
  // exposure gets top billing.
  for (const v of vendorMap.values()) {
    v.pos.sort((a, b) => b.at_risk - a.at_risk);
  }

  // Vendors alphabetical.
  const vendors = Array.from(vendorMap.values()).sort((a, b) =>
    a.vendor_display_name.localeCompare(b.vendor_display_name)
  );

  const totals = {
    at_risk: vendors.reduce((s, v) => s + v.at_risk, 0),
    ticket_count: vendors.reduce((s, v) => s + v.ticket_count, 0),
    vendor_count: vendors.length,
    po_count: vendors.reduce((s, v) => s + v.po_count, 0),
    oldest_ticket_date: vendors.reduce<string | null>(
      (oldest, v) =>
        v.oldest_ticket_date && (!oldest || v.oldest_ticket_date < oldest)
          ? v.oldest_ticket_date
          : oldest,
      null
    ),
  };

  return { vendors, totals };
}

// Client-safe types + pure helpers for the Ticket Map. Nothing in this
// module imports supabase/server (which pulls in next/headers), so it's
// safe to import from client components. The server-only fetcher lives
// in ./ticketMap.ts, which is the one you should NOT import from a
// 'use client' file.

import { EWP_LABEL, stripDatePrefix } from '@/lib/ewp/ticket-ewp';

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

/** Trim the leading date prefix and the `SL26-` marker so chips read as
 *  `101-000-001` instead of the full stored string. */
export function shortTicketNumber(ticketNumber: string): string {
  const base = stripDatePrefix(ticketNumber);
  return base.startsWith('SL26-') ? base.slice(5) : base;
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

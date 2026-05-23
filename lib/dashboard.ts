import 'server-only';
import { createClient } from '@/lib/supabase/server';
import type { ActivePoSummary } from '@/types/database';

type RawRow = {
  id: string;
  po_number: string;
  vendor_display_name: string;
  scope: string | null;
  task_wbs: string | null;
  committed: string | number;
  invoiced: string | number;
  lem_to_date: string | number;
  total_spent: string | number;
  remaining: string | number;
  pct_used: string | number;
  ticket_count: number | string;
};

function n(v: string | number): number {
  return typeof v === 'number' ? v : Number(v);
}

export async function getActivePoSummary(): Promise<ActivePoSummary[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('v_active_po_summary')
    .select('*')
    .order('pct_used', { ascending: false });

  if (error) throw error;

  return (data as RawRow[]).map((r) => ({
    id: r.id,
    po_number: r.po_number,
    vendor_display_name: r.vendor_display_name,
    scope: r.scope,
    task_wbs: r.task_wbs,
    committed: n(r.committed),
    invoiced: n(r.invoiced),
    lem_to_date: n(r.lem_to_date),
    total_spent: n(r.total_spent),
    remaining: n(r.remaining),
    pct_used: n(r.pct_used),
    ticket_count: Number(r.ticket_count),
  }));
}

export type DashboardTotals = {
  totalSpent: number;
  totalCommitted: number;
  totalRemaining: number;
  totalTickets: number;
  activePoCount: number;
  activeVendorCount: number;
  pctOfActiveCommitment: number;
};

export function computeTotals(rows: ActivePoSummary[]): DashboardTotals {
  const totalSpent = rows.reduce((sum, r) => sum + r.total_spent, 0);
  const totalCommitted = rows.reduce((sum, r) => sum + r.committed, 0);
  const totalRemaining = rows.reduce((sum, r) => sum + r.remaining, 0);
  const totalTickets = rows.reduce((sum, r) => sum + r.ticket_count, 0);
  const activePoCount = rows.length;
  const activeVendorCount = new Set(rows.map((r) => r.vendor_display_name)).size;
  const pctOfActiveCommitment = totalCommitted > 0 ? (totalSpent / totalCommitted) * 100 : 0;
  return {
    totalSpent,
    totalCommitted,
    totalRemaining,
    totalTickets,
    activePoCount,
    activeVendorCount,
    pctOfActiveCommitment,
  };
}

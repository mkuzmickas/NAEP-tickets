import { formatMoney, formatPct } from '@/lib/money';
import { StatTile } from '@/components/ui/Primitives';
import type { DashboardTotals } from '@/lib/dashboard';

export function KpiCards({ totals }: { totals: DashboardTotals }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatTile
        label="LEM-to-Date"
        value={formatMoney(totals.totalLem)}
        sub={`${formatPct(totals.pctOfActiveCommitment)} of total commitment`}
        emphasis
      />
      <StatTile
        label="PO Committed"
        value={formatMoney(totals.totalCommitted)}
        sub={`${totals.activePoCount} ${totals.activePoCount === 1 ? 'PO' : 'POs'}`}
      />
      <StatTile
        label="Remaining"
        value={formatMoney(totals.totalRemaining)}
        sub="against total commitment"
        tone="under"
      />
      <StatTile
        label="Tickets Processed"
        value={String(totals.totalTickets)}
        sub={`${totals.activeVendorCount} ${totals.activeVendorCount === 1 ? 'vendor' : 'vendors'}`}
      />
    </div>
  );
}

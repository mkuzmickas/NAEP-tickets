import { formatMoney, formatPct } from '@/lib/money';
import type { DashboardTotals } from '@/lib/dashboard';

export function KpiCards({ totals }: { totals: DashboardTotals }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card
        label="LEM-to-Date"
        value={formatMoney(totals.totalLem)}
        sub={`${formatPct(totals.pctOfActiveCommitment)} of active commitment`}
      />
      <Card
        label="PO Committed"
        value={formatMoney(totals.totalCommitted)}
        sub={`${totals.activePoCount} active ${totals.activePoCount === 1 ? 'PO' : 'POs'}`}
      />
      <Card
        label="Remaining"
        value={formatMoney(totals.totalRemaining)}
        sub="against active commitment"
      />
      <Card
        label="Tickets Processed"
        value={String(totals.totalTickets)}
        sub={`${totals.activeVendorCount} active ${totals.activeVendorCount === 1 ? 'vendor' : 'vendors'}`}
      />
    </div>
  );
}

function Card({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-white rounded-lg border border-black/10 p-5">
      <div className="text-xs uppercase tracking-wide text-enbridge-black/55">{label}</div>
      <div className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{value}</div>
      <div className="mt-1 text-xs text-enbridge-black/55">{sub}</div>
    </div>
  );
}

import { formatMoney, formatPct } from '@/lib/money';
import { StatTile } from '@/components/ui/Primitives';
import type { DashboardTotals, ForecastRollup } from '@/lib/dashboard';

export function KpiCards({
  totals,
  forecast,
}: {
  totals: DashboardTotals;
  forecast: ForecastRollup;
}) {
  // Compare rolled-up FAC to total committed to decide the tile's tone —
  // over-forecast reads red (over budget), under-forecast reads green.
  const facDelta = forecast.totalFac - totals.totalCommitted;
  const facTone: 'over' | 'under' | 'neutral' =
    facDelta > 0.5
      ? 'over'
      : facDelta < -0.5
        ? 'under'
        : 'neutral';
  const facSub =
    forecast.forecastedCount === 0
      ? `0 of ${forecast.totalPos} POs forecasted`
      : `${forecast.forecastedCount} of ${forecast.totalPos} POs · ${facDelta >= 0 ? '+' : ''}${formatMoney(facDelta)} vs committed`;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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
        label="Forecast at Completion"
        value={formatMoney(forecast.totalFac)}
        sub={facSub}
        tone={facTone}
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

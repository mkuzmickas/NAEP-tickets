'use client';

import { useMemo, useState } from 'react';
import { formatMoney } from '@/lib/money';
import type { TrendPoint } from '@/lib/shippingTracker';

/* --------------------------------------------------------------------------
   Forecast vs Actual cumulative chart — one line for cumulative budget by
   planned_ship_date, one for cumulative actual LEM by ticket_date.
   -------------------------------------------------------------------------- */

const W = 1000;
const H = 320;
const PAD = { top: 22, right: 32, bottom: 52, left: 78 };
const CW = W - PAD.left - PAD.right;
const CH = H - PAD.top - PAD.bottom;

// Temporary cap so the near-term ship period reads clearly instead of the
// axis being dragged out to Q1 2027+. Remove when the whole schedule needs
// to be visible again.
const X_CUTOFF = new Date(2026, 11, 31); // Dec 31, 2026

type Series = { date: Date; cumulative: number }[];

function buildSeries(points: TrendPoint[]): Series {
  const out: Series = [];
  let cum = 0;
  for (const p of points) {
    cum += p.value;
    out.push({ date: new Date(p.date + 'T00:00:00'), cumulative: cum });
  }
  return out;
}

// Nice-ceil with finer steps so we don't jump from $5.6M straight up to $10M.
// Steps at 1, 1.5, 2, 3, 4, 5, 6, 8, 10 × 10^n keep the Y-axis tight to the data.
function niceCeil(n: number): number {
  if (n <= 0) return 100_000;
  const pow = Math.pow(10, Math.floor(Math.log10(n)));
  const rel = n / pow;
  let stepMult = 1;
  if (rel <= 1) stepMult = 1;
  else if (rel <= 1.5) stepMult = 1.5;
  else if (rel <= 2) stepMult = 2;
  else if (rel <= 3) stepMult = 3;
  else if (rel <= 4) stepMult = 4;
  else if (rel <= 5) stepMult = 5;
  else if (rel <= 6) stepMult = 6;
  else if (rel <= 8) stepMult = 8;
  else stepMult = 10;
  return stepMult * pow;
}

function formatShortMoney(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}k`;
  return `$${v.toFixed(0)}`;
}

export function ShippingTrendChart({
  forecast,
  actual,
}: {
  forecast: TrendPoint[];
  actual: TrendPoint[];
}) {
  const [hover, setHover] = useState<{
    x: number;
    date: Date;
    forecast: number | null;
    actual: number | null;
  } | null>(null);

  // Trim inputs to the visible window so the cumulative lines only reflect
  // the portion of the schedule inside the chart's date range.
  const visibleForecast = useMemo(
    () => forecast.filter((p) => new Date(p.date + 'T00:00:00') <= X_CUTOFF),
    [forecast]
  );
  const visibleActual = useMemo(
    () => actual.filter((p) => new Date(p.date + 'T00:00:00') <= X_CUTOFF),
    [actual]
  );

  const forecastSeries = useMemo(() => buildSeries(visibleForecast), [visibleForecast]);
  const actualSeries = useMemo(() => buildSeries(visibleActual), [visibleActual]);

  if (forecastSeries.length === 0 && actualSeries.length === 0) {
    return (
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6">
        <h2 className="text-sm font-semibold tracking-wide uppercase text-[var(--text)]">
          Forecast vs Actual
        </h2>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          No dated packages or tickets to plot yet. Set planned ship dates on
          your packages and log a ticket to see the trend line.
        </p>
      </div>
    );
  }

  const allDates: Date[] = [];
  for (const p of forecastSeries) allDates.push(p.date);
  for (const p of actualSeries) allDates.push(p.date);
  const minDate =
    allDates.length > 0
      ? new Date(Math.min(...allDates.map((d) => d.getTime())))
      : new Date(2026, 5, 1); // reasonable fallback if nothing in range yet
  // Left edge: small pad before the earliest data point; right edge is fixed
  // at the cutoff so the last 6 months read granularly.
  const padMs = 3 * 24 * 60 * 60 * 1000; // 3 days
  const start = new Date(minDate.getTime() - padMs);
  const end = X_CUTOFF;
  const totalMs = end.getTime() - start.getTime();

  const maxCum = Math.max(
    forecastSeries.length ? forecastSeries[forecastSeries.length - 1].cumulative : 0,
    actualSeries.length ? actualSeries[actualSeries.length - 1].cumulative : 0
  );
  const yMax = niceCeil(maxCum * 1.05);
  const yStep = yMax / 5;

  function xScale(d: Date): number {
    return PAD.left + ((d.getTime() - start.getTime()) / totalMs) * CW;
  }
  function yScale(v: number): number {
    return PAD.top + CH - (v / yMax) * CH;
  }

  function pathFor(series: Series): string {
    if (series.length === 0) return '';
    let s = `M ${xScale(series[0].date).toFixed(1)} ${yScale(0).toFixed(1)}`;
    for (const p of series) {
      s += ` L ${xScale(p.date).toFixed(1)} ${yScale(p.cumulative).toFixed(1)}`;
    }
    return s;
  }

  const forecastPath = pathFor(forecastSeries);
  const actualPath = pathFor(actualSeries);
  const forecastLatest = forecastSeries[forecastSeries.length - 1] ?? null;
  const actualLatest = actualSeries[actualSeries.length - 1] ?? null;

  // Build monthly X-axis ticks across the range
  const months: Date[] = [];
  const cur = new Date(start.getFullYear(), start.getMonth(), 1);
  while (cur <= end) {
    months.push(new Date(cur));
    cur.setMonth(cur.getMonth() + 1);
  }

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const scale = W / rect.width;
    const px = (e.clientX - rect.left) * scale;
    if (px < PAD.left || px > W - PAD.right) {
      setHover(null);
      return;
    }
    const t = ((px - PAD.left) / CW) * totalMs + start.getTime();
    function nearest(s: Series): number | null {
      if (s.length === 0) return null;
      let best = s[0];
      for (const p of s) {
        if (p.date.getTime() <= t) best = p;
        else break;
      }
      return best.cumulative;
    }
    setHover({
      x: px,
      date: new Date(t),
      forecast: nearest(forecastSeries),
      actual: nearest(actualSeries),
    });
  }

  const varianceLatest =
    (actualLatest?.cumulative ?? 0) - (forecastLatest?.cumulative ?? 0);

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6">
      <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
        <div>
          <h2 className="text-sm font-semibold tracking-wide uppercase text-[var(--text)]">
            Forecast vs Actual
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Cumulative budgeted spend (by planned ship date) vs. cumulative
            actual LEM (by ticket date) across every shipping-tracking PO.
          </p>
        </div>
        <div className="flex items-center gap-5 text-xs">
          <LegendSwatch color="var(--warn)" label="Forecast (Budget)" dashed />
          <LegendSwatch color="var(--under)" label="Actual (LEM)" />
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-semibold">
              Variance-to-Date
            </div>
            <div
              className={`text-base font-semibold tabular ${
                varianceLatest > 0
                  ? 'text-[var(--over)]'
                  : varianceLatest < 0
                    ? 'text-[var(--under)]'
                    : 'text-[var(--text)]'
              }`}
            >
              {formatMoney(varianceLatest)}
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto -mx-6 px-6">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto min-w-[700px]"
          preserveAspectRatio="xMidYMid meet"
          onMouseMove={onMove}
          onMouseLeave={() => setHover(null)}
        >
          {/* Y gridlines + labels */}
          {Array.from({ length: 6 }).map((_, i) => {
            const v = i * yStep;
            const y = yScale(v);
            return (
              <g key={`y-${i}`}>
                <line
                  x1={PAD.left}
                  x2={W - PAD.right}
                  y1={y}
                  y2={y}
                  stroke="var(--border)"
                  strokeWidth={i === 0 ? 1.4 : 0.8}
                />
                <text
                  x={PAD.left - 8}
                  y={y + 4}
                  textAnchor="end"
                  fontSize={10}
                  fill="var(--text-muted)"
                  className="tabular"
                >
                  {formatShortMoney(v)}
                </text>
              </g>
            );
          })}

          {/* Month ticks + labels */}
          {months.map((d, i) => {
            const x = xScale(d);
            const isJan = d.getMonth() === 0;
            const label = new Intl.DateTimeFormat('en-US', {
              month: 'short',
            }).format(d);
            const yearBadge = isJan
              ? ` ${String(d.getFullYear()).slice(-2)}`
              : '';
            return (
              <g key={`m-${i}`}>
                <line
                  x1={x}
                  x2={x}
                  y1={PAD.top}
                  y2={H - PAD.bottom}
                  stroke="var(--border)"
                  strokeWidth={isJan ? 0.9 : 0.35}
                  strokeDasharray={isJan ? '' : '2 3'}
                  opacity={isJan ? 0.7 : 0.4}
                />
                <line
                  x1={x}
                  x2={x}
                  y1={H - PAD.bottom}
                  y2={H - PAD.bottom + 5}
                  stroke="var(--text-muted)"
                  strokeWidth={0.9}
                />
                <text
                  x={x}
                  y={H - PAD.bottom + 18}
                  textAnchor="middle"
                  fontSize={9.5}
                  fill="var(--text-muted)"
                  fontWeight={isJan ? 600 : 400}
                >
                  {label}
                  {yearBadge}
                </text>
              </g>
            );
          })}

          {/* Forecast (dashed amber) */}
          {forecastPath && (
            <path
              d={forecastPath}
              fill="none"
              stroke="var(--warn)"
              strokeWidth={2}
              strokeDasharray="5 3"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}

          {/* Actual (solid green) */}
          {actualPath && (
            <path
              d={actualPath}
              fill="none"
              stroke="var(--under)"
              strokeWidth={2.2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}

          {/* Latest markers */}
          {forecastLatest && (
            <circle
              cx={xScale(forecastLatest.date)}
              cy={yScale(forecastLatest.cumulative)}
              r={3.5}
              fill="var(--surface)"
              stroke="var(--warn)"
              strokeWidth={2}
            />
          )}
          {actualLatest && (
            <circle
              cx={xScale(actualLatest.date)}
              cy={yScale(actualLatest.cumulative)}
              r={4}
              fill="var(--under)"
              stroke="var(--surface)"
              strokeWidth={2}
            />
          )}

          {/* Hover crosshair + tooltip */}
          {hover && (
            <g pointerEvents="none">
              <line
                x1={hover.x}
                x2={hover.x}
                y1={PAD.top}
                y2={H - PAD.bottom}
                stroke="var(--text)"
                strokeWidth={1}
                opacity={0.25}
              />
              <g
                transform={`translate(${Math.min(hover.x + 10, W - PAD.right - 160)} ${PAD.top + 8})`}
              >
                <rect
                  width={158}
                  height={hover.forecast != null && hover.actual != null ? 62 : 44}
                  rx={4}
                  fill="var(--surface)"
                  stroke="var(--border)"
                />
                <text x={10} y={16} fontSize={10} fill="var(--text-muted)" className="tabular">
                  {hover.date.toISOString().slice(0, 10)}
                </text>
                {hover.forecast != null && (
                  <text x={10} y={32} fontSize={11} fill="var(--warn)" className="tabular">
                    Forecast {formatMoney(hover.forecast)}
                  </text>
                )}
                {hover.actual != null && (
                  <text
                    x={10}
                    y={hover.forecast != null ? 48 : 32}
                    fontSize={11}
                    fill="var(--under)"
                    className="tabular"
                    fontWeight={600}
                  >
                    Actual {formatMoney(hover.actual)}
                  </text>
                )}
              </g>
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}

function LegendSwatch({
  color,
  label,
  dashed,
}: {
  color: string;
  label: string;
  dashed?: boolean;
}) {
  return (
    <div className="inline-flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
      <svg width={22} height={8} className="shrink-0">
        <line
          x1={0}
          x2={22}
          y1={4}
          y2={4}
          stroke={color}
          strokeWidth={2}
          strokeDasharray={dashed ? '5 3' : ''}
        />
      </svg>
      {label}
    </div>
  );
}

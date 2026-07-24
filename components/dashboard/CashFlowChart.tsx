'use client';

import { useMemo, useState } from 'react';
import { formatMoney } from '@/lib/money';
import type { CashFlowPoint } from '@/lib/dashboard';

/* --------------------------------------------------------------------------
   Cash-flow burn chart — cumulative LEM against a $35M ceiling.
   Timeline: Jan 2026 → Apr 2028 (28 months).
   -------------------------------------------------------------------------- */

const START = new Date(2026, 0, 1);
const END = new Date(2028, 3, 30);
const Y_MAX = 35_000_000;
const Y_STEP = 5_000_000;

const W = 1400;
const H = 480;
const PAD = { top: 30, right: 40, bottom: 66, left: 90 };
const CW = W - PAD.left - PAD.right;
const CH = H - PAD.top - PAD.bottom;
const TOTAL_MS = END.getTime() - START.getTime();

function xScale(d: Date): number {
  const t = d.getTime() - START.getTime();
  return PAD.left + (t / TOTAL_MS) * CW;
}

function yScale(v: number): number {
  return PAD.top + CH - (v / Y_MAX) * CH;
}

const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function monthLabel(d: Date): string {
  const m = MONTH_LABELS[d.getMonth()];
  return d.getMonth() === 0 ? `${m} '${String(d.getFullYear()).slice(-2)}` : m;
}

function monthsList(): Date[] {
  const arr: Date[] = [];
  const d = new Date(START);
  while (d <= END) {
    arr.push(new Date(d));
    d.setMonth(d.getMonth() + 1);
  }
  return arr;
}

function weeksList(): Date[] {
  const arr: Date[] = [];
  const d = new Date(START);
  while (d <= END) {
    arr.push(new Date(d));
    d.setDate(d.getDate() + 7);
  }
  return arr;
}

export function CashFlowChart({
  points,
  totalCommitted,
}: {
  points: CashFlowPoint[];
  totalCommitted: number;
}) {
  const [hover, setHover] = useState<{ x: number; y: number; date: Date; value: number } | null>(null);

  const cumulative = useMemo(() => {
    const out: { date: Date; value: number }[] = [];
    let cum = 0;
    for (const p of points) {
      cum += p.value;
      out.push({ date: new Date(p.date), value: cum });
    }
    return out;
  }, [points]);

  const linePath = useMemo(() => {
    if (cumulative.length === 0) return '';
    const first = cumulative[0];
    let s = `M ${xScale(first.date).toFixed(1)} ${yScale(0).toFixed(1)}`;
    for (const p of cumulative) {
      s += ` L ${xScale(p.date).toFixed(1)} ${yScale(p.value).toFixed(1)}`;
    }
    return s;
  }, [cumulative]);

  const areaPath = useMemo(() => {
    if (cumulative.length === 0) return '';
    const first = cumulative[0];
    const last = cumulative[cumulative.length - 1];
    let s = `M ${xScale(first.date).toFixed(1)} ${yScale(0).toFixed(1)}`;
    for (const p of cumulative) {
      s += ` L ${xScale(p.date).toFixed(1)} ${yScale(p.value).toFixed(1)}`;
    }
    s += ` L ${xScale(last.date).toFixed(1)} ${yScale(0).toFixed(1)} Z`;
    return s;
  }, [cumulative]);

  const latest = cumulative.length > 0 ? cumulative[cumulative.length - 1] : null;
  const today = new Date();
  const showToday = today >= START && today <= END;

  function onSvgMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    if (cumulative.length === 0) return;
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    // svg width in px vs viewBox width
    const scale = W / rect.width;
    const px = (e.clientX - rect.left) * scale;
    if (px < PAD.left || px > W - PAD.right) {
      setHover(null);
      return;
    }
    const t = ((px - PAD.left) / CW) * TOTAL_MS + START.getTime();
    // Find nearest point at or before t
    let best = cumulative[0];
    for (const p of cumulative) {
      if (p.date.getTime() <= t) best = p;
      else break;
    }
    setHover({
      x: xScale(best.date),
      y: yScale(best.value),
      date: best.date,
      value: best.value,
    });
  }

  const months = monthsList();
  const weeks = weeksList();

  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6">
      <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold tracking-wide uppercase text-[var(--text)]">
            Cash Flow
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Cumulative LEM burn against a $35M ceiling · Jan 2026 → Apr 2028
          </p>
        </div>
        <div className="flex items-center gap-5 text-xs">
          <LegendSwatch color="var(--under)" label="Cumulative LEM" />
          {totalCommitted > 0 && (
            <LegendSwatch
              color="var(--brand-orange)"
              label={`Committed ${formatMoney(totalCommitted)}`}
              dashed
            />
          )}
          {latest && (
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-semibold">
                LEM to Date
              </div>
              <div className="text-base font-semibold tabular text-[var(--text)]">
                {formatMoney(latest.value)}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="overflow-x-auto -mx-6 px-6">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto min-w-[900px]"
          preserveAspectRatio="xMidYMid meet"
          onMouseMove={onSvgMouseMove}
          onMouseLeave={() => setHover(null)}
        >
          {/* Y gridlines + labels */}
          {Array.from({ length: Y_MAX / Y_STEP + 1 }).map((_, i) => {
            const v = i * Y_STEP;
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
                  x={PAD.left - 10}
                  y={y + 4}
                  textAnchor="end"
                  fontSize={11}
                  fill="var(--text-muted)"
                  className="tabular"
                >
                  ${v / 1_000_000}M
                </text>
              </g>
            );
          })}

          {/* Week minor ticks */}
          {weeks.map((d, i) => {
            const x = xScale(d);
            return (
              <line
                key={`w-${i}`}
                x1={x}
                x2={x}
                y1={H - PAD.bottom}
                y2={H - PAD.bottom + 3}
                stroke="var(--text-muted)"
                strokeWidth={0.5}
                opacity={0.5}
              />
            );
          })}

          {/* Month grid + labels */}
          {months.map((d, i) => {
            const x = xScale(d);
            const isJan = d.getMonth() === 0;
            return (
              <g key={`m-${i}`}>
                <line
                  x1={x}
                  x2={x}
                  y1={PAD.top}
                  y2={H - PAD.bottom}
                  stroke="var(--border)"
                  strokeWidth={isJan ? 1 : 0.4}
                  strokeDasharray={isJan ? '' : '2 3'}
                  opacity={isJan ? 0.85 : 0.5}
                />
                <line
                  x1={x}
                  x2={x}
                  y1={H - PAD.bottom}
                  y2={H - PAD.bottom + 7}
                  stroke="var(--text-muted)"
                  strokeWidth={isJan ? 1.2 : 1}
                />
                <text
                  x={x}
                  y={H - PAD.bottom + 22}
                  textAnchor="middle"
                  fontSize={10}
                  fill="var(--text-muted)"
                  fontWeight={isJan ? 600 : 400}
                >
                  {monthLabel(d)}
                </text>
              </g>
            );
          })}

          {/* Committed ceiling reference */}
          {totalCommitted > 0 && totalCommitted <= Y_MAX && (
            <g>
              <line
                x1={PAD.left}
                x2={W - PAD.right}
                y1={yScale(totalCommitted)}
                y2={yScale(totalCommitted)}
                stroke="var(--brand-orange)"
                strokeWidth={1.5}
                strokeDasharray="5 4"
              />
              <text
                x={W - PAD.right - 6}
                y={yScale(totalCommitted) - 7}
                textAnchor="end"
                fontSize={10}
                fill="var(--brand-orange)"
                fontWeight={600}
              >
                Committed · {formatMoney(totalCommitted)}
              </text>
            </g>
          )}

          {/* Today marker */}
          {showToday && (
            <g>
              <line
                x1={xScale(today)}
                x2={xScale(today)}
                y1={PAD.top}
                y2={H - PAD.bottom}
                stroke="var(--text)"
                strokeWidth={1}
                strokeDasharray="3 4"
                opacity={0.35}
              />
              <text
                x={xScale(today)}
                y={PAD.top - 8}
                textAnchor="middle"
                fontSize={9}
                fill="var(--text-muted)"
                fontWeight={600}
              >
                TODAY
              </text>
            </g>
          )}

          {/* Area fill */}
          {areaPath && (
            <path d={areaPath} fill="var(--under)" opacity={0.12} />
          )}

          {/* Line */}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke="var(--under)"
              strokeWidth={2.2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}

          {/* Latest dot */}
          {latest && (
            <circle
              cx={xScale(latest.date)}
              cy={yScale(latest.value)}
              r={4.5}
              fill="var(--under)"
              stroke="var(--surface)"
              strokeWidth={2}
            />
          )}

          {/* Hover marker + tooltip */}
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
              <circle
                cx={hover.x}
                cy={hover.y}
                r={5}
                fill="var(--surface)"
                stroke="var(--under)"
                strokeWidth={2}
              />
              <g transform={`translate(${Math.min(hover.x + 12, W - PAD.right - 160)} ${Math.max(hover.y - 40, PAD.top + 4)})`}>
                <rect
                  width={158}
                  height={44}
                  rx={4}
                  fill="var(--surface)"
                  stroke="var(--border)"
                  strokeWidth={1}
                />
                <text x={10} y={17} fontSize={10} fill="var(--text-muted)" className="tabular">
                  {hover.date.toISOString().slice(0, 10)}
                </text>
                <text x={10} y={34} fontSize={13} fontWeight={600} fill="var(--text)" className="tabular">
                  {formatMoney(hover.value)}
                </text>
              </g>
            </g>
          )}
        </svg>
      </div>

      {points.length === 0 && (
        <p className="mt-3 text-xs text-[var(--text-muted)] italic text-center">
          No ticket data yet — the burn line will appear once tickets are logged.
        </p>
      )}
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
          strokeDasharray={dashed ? '4 3' : ''}
        />
      </svg>
      {label}
    </div>
  );
}

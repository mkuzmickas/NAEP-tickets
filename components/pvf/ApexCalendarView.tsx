'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { Card, CardHeader, Badge, EmptyState } from '@/components/ui/Primitives';
import { formatMoney } from '@/lib/money';
import type { ApexData, ApexPo, ApexLineItem } from '@/lib/apex';

type DayCell = {
  iso: string;             // YYYY-MM-DD
  inMonth: boolean;        // is this day in the currently-viewed month
  dow: number;             // 0=Sun … 6=Sat
  itemCount: number;
  totalValue: number;
  poNumbers: string[];     // distinct POs shipping that day
};

type LineWithPo = ApexLineItem & { po: Pick<ApexPo, 'id' | 'po_number' | 'ewp' | 'description'> };

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}
function isoOf(y: number, m0: number, d: number): string {
  return `${y}-${pad(m0 + 1)}-${pad(d)}`;
}
function daysInMonth(y: number, m0: number): number {
  return new Date(y, m0 + 1, 0).getDate();
}

export function ApexCalendarView({
  data,
  initialMonth,
}: {
  data: ApexData;
  initialMonth: { year: number; month0: number };
}) {
  const [year, setYear] = useState(initialMonth.year);
  const [month0, setMonth0] = useState(initialMonth.month0);
  const [selectedIso, setSelectedIso] = useState<string | null>(null);

  // ---- flatten every line with a ship_date, plus its parent PO context
  const datedLines = useMemo<LineWithPo[]>(() => {
    const out: LineWithPo[] = [];
    for (const p of data.pos) {
      for (const l of p.lines) {
        if (l.ship_date) {
          out.push({
            ...l,
            po: { id: p.id, po_number: p.po_number, ewp: p.ewp, description: p.description },
          });
        }
      }
    }
    return out;
  }, [data.pos]);

  // ---- flatten undated lines (all of them, for the tray)
  const undatedByPo = useMemo(() => {
    const grouped: { po: ApexPo; lines: ApexLineItem[]; total: number }[] = [];
    for (const p of data.pos) {
      const missing = p.lines.filter((l) => !l.ship_date);
      if (missing.length > 0) {
        grouped.push({
          po: p,
          lines: missing,
          total: missing.reduce((s, l) => s + l.amount, 0),
        });
      }
    }
    return grouped;
  }, [data.pos]);
  const undatedCount = undatedByPo.reduce((s, g) => s + g.lines.length, 0);
  const undatedValue = undatedByPo.reduce((s, g) => s + g.total, 0);

  // ---- build the 6-week month grid (always 42 cells for a stable layout)
  const grid: DayCell[] = useMemo(() => {
    const firstDow = new Date(year, month0, 1).getDay();
    const daysThisMonth = daysInMonth(year, month0);
    const daysPrevMonth = daysInMonth(year, month0 - 1);

    const cells: DayCell[] = [];

    // leading days from previous month
    for (let i = 0; i < firstDow; i++) {
      const d = daysPrevMonth - firstDow + 1 + i;
      const prevY = month0 === 0 ? year - 1 : year;
      const prevM = month0 === 0 ? 11 : month0 - 1;
      cells.push(emptyCell(isoOf(prevY, prevM, d), false, i));
    }
    // this month
    for (let d = 1; d <= daysThisMonth; d++) {
      cells.push(emptyCell(isoOf(year, month0, d), true, (firstDow + d - 1) % 7));
    }
    // trailing days to fill 42
    let trailing = 42 - cells.length;
    const nextY = month0 === 11 ? year + 1 : year;
    const nextM = month0 === 11 ? 0 : month0 + 1;
    for (let d = 1; d <= trailing; d++) {
      cells.push(emptyCell(isoOf(nextY, nextM, d), false, (firstDow + daysThisMonth + d - 1) % 7));
    }

    // fold ship counts + values into cells
    const byIso = new Map<string, DayCell>();
    for (const c of cells) byIso.set(c.iso, c);
    for (const l of datedLines) {
      const cell = byIso.get(l.ship_date!);
      if (!cell) continue; // not in the current 42-day window
      cell.itemCount += 1;
      cell.totalValue += l.amount;
      if (!cell.poNumbers.includes(l.po.po_number)) cell.poNumbers.push(l.po.po_number);
    }
    return cells;
  }, [year, month0, datedLines]);

  const monthTotals = useMemo(() => {
    const first = isoOf(year, month0, 1);
    const last = isoOf(year, month0, daysInMonth(year, month0));
    const rows = datedLines.filter((l) => l.ship_date! >= first && l.ship_date! <= last);
    return {
      count: rows.length,
      value: rows.reduce((s, l) => s + l.amount, 0),
      poCount: new Set(rows.map((l) => l.po.po_number)).size,
    };
  }, [datedLines, year, month0]);

  const selectedLines = useMemo(() => {
    if (!selectedIso) return [];
    return datedLines.filter((l) => l.ship_date === selectedIso);
  }, [datedLines, selectedIso]);

  function prevMonth() {
    setSelectedIso(null);
    if (month0 === 0) {
      setYear(year - 1);
      setMonth0(11);
    } else {
      setMonth0(month0 - 1);
    }
  }
  function nextMonth() {
    setSelectedIso(null);
    if (month0 === 11) {
      setYear(year + 1);
      setMonth0(0);
    } else {
      setMonth0(month0 + 1);
    }
  }
  function jumpToday() {
    const now = new Date();
    setYear(now.getFullYear());
    setMonth0(now.getMonth());
    setSelectedIso(now.toISOString().slice(0, 10));
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-4">
      {/* -------- calendar -------- */}
      <Card>
        <CardHeader
          title={`${MONTH_NAMES[month0]} ${year}`}
          subtitle={
            monthTotals.count > 0
              ? `${monthTotals.count} line item${monthTotals.count === 1 ? '' : 's'} scheduled this month · ${formatMoney(monthTotals.value)} · ${monthTotals.poCount} PO${monthTotals.poCount === 1 ? '' : 's'}`
              : 'No line items have a ship date in this month yet'
          }
          action={
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={prevMonth}
                aria-label="Previous month"
                className="rounded border border-[var(--border)] p-1 hover:bg-[var(--surface-2)]"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={jumpToday}
                className="rounded border border-[var(--border)] px-2 py-1 text-xs font-medium hover:bg-[var(--surface-2)]"
              >
                Today
              </button>
              <button
                type="button"
                onClick={nextMonth}
                aria-label="Next month"
                className="rounded border border-[var(--border)] p-1 hover:bg-[var(--surface-2)]"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          }
        />

        <div className="grid grid-cols-7 border-b border-[var(--border)] bg-[var(--surface-2)]">
          {DOW.map((d) => (
            <div
              key={d}
              className="px-2 py-1.5 text-center text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]"
            >
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {grid.map((cell) => {
            const isSelected = cell.iso === selectedIso;
            const isToday = cell.iso === new Date().toISOString().slice(0, 10);
            const hasItems = cell.itemCount > 0;
            const clickable = cell.inMonth && hasItems;
            return (
              <button
                key={cell.iso}
                type="button"
                disabled={!clickable}
                onClick={() => setSelectedIso(cell.iso)}
                className={[
                  'min-h-[84px] border-b border-r border-[var(--border)] px-2 py-1.5 text-left align-top transition-colors',
                  cell.inMonth ? '' : 'bg-[var(--surface-2)] text-[var(--text-muted)]',
                  clickable ? 'cursor-pointer hover:bg-[var(--info-bg)]' : 'cursor-default',
                  isSelected ? 'bg-[var(--info-bg)] ring-2 ring-inset ring-[var(--info)]' : '',
                ].join(' ')}
              >
                <div className="flex items-center justify-between gap-1">
                  <span
                    className={`text-xs tabular ${
                      isToday
                        ? 'inline-flex items-center justify-center rounded-full bg-enbridge-black px-1.5 text-white font-semibold'
                        : cell.inMonth
                          ? 'text-[var(--text)] font-medium'
                          : ''
                    }`}
                  >
                    {Number(cell.iso.slice(-2))}
                  </span>
                  {hasItems && (
                    <span className="tabular text-[10px] font-semibold text-[var(--info)]">
                      {cell.itemCount}
                    </span>
                  )}
                </div>
                {hasItems && (
                  <div className="mt-1 space-y-0.5">
                    <div className="tabular text-[11px] font-semibold text-[var(--text)]">
                      {formatMoney(cell.totalValue)}
                    </div>
                    <div className="text-[10px] text-[var(--text-muted)] truncate">
                      {cell.poNumbers.length} PO{cell.poNumbers.length === 1 ? '' : 's'}
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* selected-day detail */}
        {selectedIso && (
          <div className="border-t border-[var(--border)] bg-[var(--surface-2)] px-5 py-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-[var(--text-muted)]" />
                <span className="text-sm font-semibold text-[var(--text)]">
                  Shipping {selectedIso}
                </span>
                <Badge tone="info">
                  {selectedLines.length} item{selectedLines.length === 1 ? '' : 's'}
                </Badge>
                <Badge>{formatMoney(selectedLines.reduce((s, l) => s + l.amount, 0))}</Badge>
              </div>
              <button
                type="button"
                onClick={() => setSelectedIso(null)}
                className="text-xs text-[var(--text-muted)] hover:text-[var(--text)]"
              >
                Close
              </button>
            </div>
            {selectedLines.length === 0 ? (
              <div className="text-sm text-[var(--text-muted)]">
                No items are tagged for this date.
              </div>
            ) : (
              <div className="space-y-1.5">
                {selectedLines
                  .slice()
                  .sort((a, b) => a.po.po_number.localeCompare(b.po.po_number))
                  .map((l) => (
                    <div
                      key={l.id}
                      className="flex flex-wrap items-center gap-2 rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                    >
                      <Badge tone="brand">{l.po.ewp}</Badge>
                      <span className="font-mono text-xs text-[var(--text-muted)]">
                        {l.po.po_number}·L{l.line_number}
                      </span>
                      <span className="font-mono text-xs text-[var(--text)]">
                        {l.size ?? '—'}
                      </span>
                      <span className="flex-1 min-w-[200px] truncate text-[var(--text)]">
                        {l.description}
                      </span>
                      <span className="tabular text-xs text-[var(--text-muted)]">
                        {formatQty(l.quantity, l.uom)}
                      </span>
                      <span className="tabular text-sm font-semibold text-[var(--text)]">
                        {formatMoney(l.amount)}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* -------- undated tray -------- */}
      <Card>
        <CardHeader
          title="Undated Queue"
          subtitle={
            undatedCount > 0
              ? `${undatedCount} line item${undatedCount === 1 ? '' : 's'} still need a ship date — ${formatMoney(undatedValue)}`
              : 'Every line item has a ship date'
          }
        />
        {undatedByPo.length === 0 ? (
          <EmptyState title="Nothing left to date" hint="All Apex line items are on the calendar." />
        ) : (
          <div className="max-h-[720px] overflow-y-auto">
            {undatedByPo.map(({ po, lines, total }) => (
              <div
                key={po.id}
                className="border-b border-[var(--border)] last:border-b-0 px-5 py-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2 min-w-0">
                    <Badge tone="brand">{po.ewp}</Badge>
                    <span className="font-mono text-xs text-[var(--text-muted)]">
                      {po.po_number}
                    </span>
                    {po.description && (
                      <span className="truncate text-sm text-[var(--text)]">{po.description}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="tabular font-semibold text-[var(--text)]">
                      {lines.length} line{lines.length === 1 ? '' : 's'}
                    </span>
                    <span className="tabular text-[var(--text-muted)]">{formatMoney(total)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="border-t border-[var(--border)] px-5 py-3 text-xs text-[var(--text-muted)]">
          To tag a date, switch to <span className="font-semibold text-[var(--text)]">Bucket</span>{' '}
          view above, tick the line items you want, then use the floating action bar to apply a
          date.
        </div>
      </Card>
    </div>
  );
}

function emptyCell(iso: string, inMonth: boolean, dow: number): DayCell {
  return { iso, inMonth, dow, itemCount: 0, totalValue: 0, poNumbers: [] };
}

function formatQty(n: number, uom: string): string {
  const isInt = Number.isInteger(n);
  return `${isInt ? n.toString() : n.toFixed(2)} ${uom}`;
}

'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronDown,
  ChevronRight,
  Search,
  X,
  CalendarDays,
  PackageCheck,
  Truck,
} from 'lucide-react';
import { PageContainer } from '@/components/ui/PageContainer';
import {
  PageHeader,
  StatTile,
  Card,
  CardHeader,
  Badge,
  EmptyState,
  TableWrap,
  Th,
  Td,
} from '@/components/ui/Primitives';
import { formatMoney } from '@/lib/money';
import type { ApexData, ApexPo, ApexLineItem } from '@/lib/apex';
import { ApexCalendarView } from '@/components/pvf/ApexCalendarView';

type SortField = 'line_number' | 'size' | 'description' | 'quantity' | 'amount' | 'ship_date';
type SortDir = 'asc' | 'desc';

const ISO_TODAY = () => new Date().toISOString().slice(0, 10);

function formatQty(n: number, uom: string): string {
  const isInt = Number.isInteger(n);
  return `${isInt ? n.toString() : n.toFixed(2)} ${uom}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${y}-${m}-${d}`;
}

export function ApexPvfView({ data }: { data: ApexData }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  // ---- top-level view mode
  const [viewMode, setViewMode] = useState<'bucket' | 'calendar'>('bucket');

  // ---- default calendar month: earliest ship_date across all lines, else today
  const defaultMonth = useMemo(() => {
    const isos = data.pos.flatMap((p) => p.lines.map((l) => l.ship_date).filter(Boolean) as string[]);
    if (isos.length === 0) {
      const now = new Date();
      return { year: now.getFullYear(), month0: now.getMonth() };
    }
    const earliest = isos.sort()[0];
    const [y, m] = earliest.split('-');
    return { year: Number(y), month0: Number(m) - 1 };
  }, [data.pos]);

  // ---- selection state (line IDs) — persists across PO cards + EWP filters
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // ---- per-PO expand + search + sort state
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [searchByPo, setSearchByPo] = useState<Record<string, string>>({});
  const [sortByPo, setSortByPo] = useState<Record<string, { field: SortField; dir: SortDir }>>({});
  // ---- floating-bar date input state
  const [barShipDate, setBarShipDate] = useState<string>(ISO_TODAY());
  const [barMode, setBarMode] = useState<'ship' | 'received'>('ship');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);

  // ---- top-level EWP filter
  const [ewpFilter, setEwpFilter] = useState<string>('all');

  const allEwps = useMemo(() => {
    const s = new Set(data.pos.map((p) => p.ewp));
    return Array.from(s).sort();
  }, [data.pos]);

  const filteredPos = useMemo(() => {
    return ewpFilter === 'all' ? data.pos : data.pos.filter((p) => p.ewp === ewpFilter);
  }, [data.pos, ewpFilter]);

  // group by EWP for the section headings
  const posByEwp = useMemo(() => {
    const m = new Map<string, ApexPo[]>();
    for (const p of filteredPos) {
      const arr = m.get(p.ewp) ?? [];
      arr.push(p);
      m.set(p.ewp, arr);
    }
    return Array.from(m.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredPos]);

  const totals = data.totals;
  const dateCoverage =
    totals.line_count > 0 ? (totals.lines_dated / totals.line_count) * 100 : 0;
  const receivedCoverage =
    totals.line_count > 0 ? (totals.lines_received / totals.line_count) * 100 : 0;

  function toggleLine(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllForPo(po: ApexPo, visibleIds: string[], checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) visibleIds.forEach((id) => next.add(id));
      else visibleIds.forEach((id) => next.delete(id));
      return next;
    });
  }

  function clearSelection() {
    setSelected(new Set());
  }

  function toggleExpand(poId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(poId)) next.delete(poId);
      else next.add(poId);
      return next;
    });
  }

  function expandAll() {
    setExpanded(new Set(filteredPos.map((p) => p.id)));
  }
  function collapseAll() {
    setExpanded(new Set());
  }

  async function applyDate(mode: 'ship' | 'received', dateOrNull: string | null) {
    if (selected.size === 0) return;
    setBusy(true);
    setMsg(null);
    try {
      const body =
        mode === 'ship'
          ? { line_ids: Array.from(selected), ship_date: dateOrNull }
          : { line_ids: Array.from(selected), received_date: dateOrNull };
      const res = await fetch('/api/apex/lines', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg({ tone: 'err', text: j.error ?? `Update failed (${res.status})` });
        setBusy(false);
        return;
      }
      const verb = dateOrNull === null ? 'cleared' : `set to ${dateOrNull}`;
      const label = mode === 'ship' ? 'ship date' : 'received date';
      setMsg({
        tone: 'ok',
        text: `${j.updated ?? selected.size} line${
          (j.updated ?? selected.size) === 1 ? '' : 's'
        } — ${label} ${verb}`,
      });
      setSelected(new Set());
      startTransition(() => router.refresh());
    } catch (e) {
      setMsg({ tone: 'err', text: e instanceof Error ? e.message : 'Network error' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageContainer>
      <div className="space-y-6 pb-32">
        <PageHeader
          title="Site PVF Tracker"
          subtitle="Apex Distribution pipe, valves, and fittings for the Aitken Creek site. Bucket view groups every line item by PO for tagging. Calendar view shows what's shipping when once you've dated things."
          action={
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 rounded border border-[var(--border)] p-0.5">
                <ViewToggleButton active={viewMode === 'bucket'} onClick={() => setViewMode('bucket')}>
                  Bucket
                </ViewToggleButton>
                <ViewToggleButton active={viewMode === 'calendar'} onClick={() => setViewMode('calendar')}>
                  Calendar
                </ViewToggleButton>
              </div>
              {viewMode === 'bucket' && (
                <>
                  <button
                    type="button"
                    onClick={expandAll}
                    className="rounded border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-xs font-medium text-[var(--text)] hover:bg-[var(--surface-2)]"
                  >
                    Expand all
                  </button>
                  <button
                    type="button"
                    onClick={collapseAll}
                    className="rounded border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-xs font-medium text-[var(--text)] hover:bg-[var(--surface-2)]"
                  >
                    Collapse all
                  </button>
                </>
              )}
            </div>
          }
        />

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatTile
            label="Total PO Value"
            value={formatMoney(totals.total_value)}
            sub={`${totals.po_count} PO${totals.po_count === 1 ? '' : 's'}`}
            emphasis
          />
          <StatTile label="Line Items" value={String(totals.line_count)} sub="all POs combined" />
          <StatTile
            label="Ship Date Set"
            value={`${totals.lines_dated} / ${totals.line_count}`}
            sub={`${dateCoverage.toFixed(0)}% tagged`}
            tone={totals.lines_dated > 0 ? 'info' : 'warn'}
          />
          <StatTile
            label="Received on Site"
            value={`${totals.lines_received} / ${totals.line_count}`}
            sub={`${receivedCoverage.toFixed(0)}% received`}
            tone={totals.lines_received > 0 ? 'under' : 'neutral'}
          />
          <StatTile
            label="EWPs"
            value={String(allEwps.length)}
            sub={allEwps.join(', ') || '—'}
          />
        </div>

        {/* Calendar mode swaps in a whole different body below the tiles */}
        {viewMode === 'calendar' && (
          <ApexCalendarView data={data} initialMonth={defaultMonth} />
        )}

        {/* --- Bucket-mode body starts here --- */}
        {viewMode === 'bucket' && (
        <>
        {/* EWP filter chips */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Filter EWP:
          </span>
          <FilterChip active={ewpFilter === 'all'} onClick={() => setEwpFilter('all')}>
            All ({data.pos.length})
          </FilterChip>
          {allEwps.map((e) => {
            const count = data.pos.filter((p) => p.ewp === e).length;
            return (
              <FilterChip
                key={e}
                active={ewpFilter === e}
                onClick={() => setEwpFilter(e)}
              >
                {e} ({count})
              </FilterChip>
            );
          })}
        </div>

        {/* Grouped by EWP */}
        {posByEwp.length === 0 && (
          <Card>
            <EmptyState title="No POs match this filter" />
          </Card>
        )}

        {posByEwp.map(([ewp, pos]) => (
          <section key={ewp} className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              {ewp} · {pos.length} PO{pos.length === 1 ? '' : 's'} ·{' '}
              {formatMoney(pos.reduce((s, p) => s + p.total_amount, 0))}
            </h2>
            <div className="space-y-3">
              {pos.map((po) => (
                <PoCard
                  key={po.id}
                  po={po}
                  expanded={expanded.has(po.id)}
                  onToggleExpand={() => toggleExpand(po.id)}
                  search={searchByPo[po.id] ?? ''}
                  onSearch={(v) => setSearchByPo((s) => ({ ...s, [po.id]: v }))}
                  sort={sortByPo[po.id] ?? { field: 'line_number', dir: 'asc' }}
                  onSort={(field) =>
                    setSortByPo((s) => {
                      const cur = s[po.id] ?? { field: 'line_number' as SortField, dir: 'asc' as SortDir };
                      const nextDir: SortDir =
                        cur.field === field && cur.dir === 'asc' ? 'desc' : 'asc';
                      return { ...s, [po.id]: { field, dir: nextDir } };
                    })
                  }
                  selected={selected}
                  onToggleLine={toggleLine}
                  onToggleAll={(visibleIds, checked) => toggleAllForPo(po, visibleIds, checked)}
                />
              ))}
            </div>
          </section>
        ))}
        </>
        )}
      </div>

      {/* Floating action bar */}
      {selected.size > 0 && (
        <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4 pointer-events-none">
          <div className="pointer-events-auto flex flex-wrap items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3 shadow-lg">
            <span className="text-sm font-semibold text-[var(--text)]">
              {selected.size} line item{selected.size === 1 ? '' : 's'} selected
            </span>

            <div className="flex items-center gap-1 rounded border border-[var(--border)] p-0.5">
              <BarModeButton active={barMode === 'ship'} onClick={() => setBarMode('ship')}>
                <Truck className="h-3.5 w-3.5" /> Ship
              </BarModeButton>
              <BarModeButton active={barMode === 'received'} onClick={() => setBarMode('received')}>
                <PackageCheck className="h-3.5 w-3.5" /> Received
              </BarModeButton>
            </div>

            <label className="flex items-center gap-1.5 text-sm text-[var(--text)]">
              <CalendarDays className="h-4 w-4 text-[var(--text-muted)]" />
              <input
                type="date"
                value={barShipDate}
                onChange={(e) => setBarShipDate(e.target.value)}
                className="rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-sm text-[var(--text)]"
              />
            </label>

            <button
              type="button"
              disabled={busy || pending || !barShipDate}
              onClick={() => applyDate(barMode, barShipDate)}
              className="rounded bg-enbridge-black px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
            >
              Apply
            </button>

            <button
              type="button"
              disabled={busy || pending}
              onClick={() => applyDate(barMode, null)}
              className="rounded border border-[var(--border)] px-3 py-1.5 text-sm font-medium text-[var(--text)] hover:bg-[var(--surface-2)] disabled:opacity-50"
            >
              Clear date
            </button>

            <button
              type="button"
              onClick={clearSelection}
              className="flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text)]"
            >
              <X className="h-4 w-4" />
              Clear selection
            </button>

            {msg && (
              <span
                className={`text-xs ${
                  msg.tone === 'ok' ? 'text-[var(--under)]' : 'text-[var(--over)]'
                }`}
              >
                {msg.text}
              </span>
            )}
          </div>
        </div>
      )}
    </PageContainer>
  );
}

// -----------------------------------------------------------------------------
// PO card
// -----------------------------------------------------------------------------
function PoCard({
  po,
  expanded,
  onToggleExpand,
  search,
  onSearch,
  sort,
  onSort,
  selected,
  onToggleLine,
  onToggleAll,
}: {
  po: ApexPo;
  expanded: boolean;
  onToggleExpand: () => void;
  search: string;
  onSearch: (v: string) => void;
  sort: { field: SortField; dir: SortDir };
  onSort: (field: SortField) => void;
  selected: Set<string>;
  onToggleLine: (id: string) => void;
  onToggleAll: (visibleIds: string[], checked: boolean) => void;
}) {
  const visibleLines = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = po.lines;
    if (q) {
      rows = rows.filter(
        (l) =>
          (l.size ?? '').toLowerCase().includes(q) ||
          l.description.toLowerCase().includes(q) ||
          String(l.line_number).includes(q) ||
          (l.vendor ?? '').toLowerCase().includes(q) ||
          (l.lead_time ?? '').toLowerCase().includes(q)
      );
    }
    rows = [...rows].sort((a, b) => {
      const dir = sort.dir === 'asc' ? 1 : -1;
      const va = valueFor(a, sort.field);
      const vb = valueFor(b, sort.field);
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
    return rows;
  }, [po.lines, search, sort]);

  const visibleIds = visibleLines.map((l) => l.id);
  const selectedInPo = visibleLines.filter((l) => selected.has(l.id)).length;
  const allChecked = visibleLines.length > 0 && selectedInPo === visibleLines.length;
  const someChecked = selectedInPo > 0 && !allChecked;

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--border)] px-5 py-4">
        <button
          type="button"
          onClick={onToggleExpand}
          className="flex items-start gap-2 text-left"
        >
          {expanded ? (
            <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-[var(--text-muted)]" />
          ) : (
            <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-[var(--text-muted)]" />
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-[var(--text)]">{po.po_number}</span>
              <Badge tone="brand">{po.ewp}</Badge>
              {po.gle_package && <Badge tone="info">{po.gle_package}</Badge>}
            </div>
            {po.description && (
              <div className="mt-1 text-sm text-[var(--text-muted)]">{po.description}</div>
            )}
          </div>
        </button>
        <div className="flex flex-wrap items-center gap-4 text-right">
          <div>
            <div className="text-xs uppercase tracking-wider text-[var(--text-muted)]">Total</div>
            <div className="tabular text-sm font-semibold text-[var(--text)]">
              {formatMoney(po.total_amount)}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-[var(--text-muted)]">Lines</div>
            <div className="tabular text-sm font-semibold text-[var(--text)]">{po.line_count}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-[var(--text-muted)]">Dated</div>
            <div className="tabular text-sm font-semibold text-[var(--text)]">
              {po.lines_dated} / {po.line_count}
            </div>
          </div>
        </div>
      </div>

      {expanded && (
        <>
          <div className="flex flex-wrap items-center gap-3 border-b border-[var(--border)] px-5 py-3">
            <label className="flex flex-1 items-center gap-2 min-w-[200px]">
              <Search className="h-4 w-4 text-[var(--text-muted)]" />
              <input
                value={search}
                onChange={(e) => onSearch(e.target.value)}
                placeholder="Search size, description, vendor, line #…"
                className="w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-sm text-[var(--text)]"
              />
            </label>
            <div className="text-xs text-[var(--text-muted)]">
              Showing <span className="tabular font-semibold text-[var(--text)]">{visibleLines.length}</span>{' '}
              of <span className="tabular font-semibold text-[var(--text)]">{po.line_count}</span>
              {search && (
                <button
                  type="button"
                  onClick={() => onSearch('')}
                  className="ml-2 text-[var(--info)] hover:underline"
                >
                  clear
                </button>
              )}
            </div>
          </div>

          {visibleLines.length === 0 ? (
            <EmptyState title="No lines match this search" />
          ) : (
            <TableWrap>
              <table className="w-full">
                <thead className="bg-[var(--surface-2)]">
                  <tr>
                    <Th className="w-8">
                      <input
                        type="checkbox"
                        checked={allChecked}
                        ref={(el) => {
                          if (el) el.indeterminate = someChecked;
                        }}
                        onChange={(e) => onToggleAll(visibleIds, e.target.checked)}
                      />
                    </Th>
                    <SortableTh field="line_number" sort={sort} onSort={onSort}>#</SortableTh>
                    <SortableTh field="size" sort={sort} onSort={onSort}>Size</SortableTh>
                    <SortableTh field="description" sort={sort} onSort={onSort}>Description</SortableTh>
                    <SortableTh field="quantity" sort={sort} onSort={onSort} right>Qty</SortableTh>
                    <Th right>Unit cost</Th>
                    <SortableTh field="amount" sort={sort} onSort={onSort} right>Amount</SortableTh>
                    <Th>Lead</Th>
                    <SortableTh field="ship_date" sort={sort} onSort={onSort}>Ship date</SortableTh>
                    <Th>Received</Th>
                  </tr>
                </thead>
                <tbody>
                  {visibleLines.map((l) => {
                    const isSelected = selected.has(l.id);
                    return (
                      <tr
                        key={l.id}
                        className={`border-t border-[var(--border)] ${
                          isSelected ? 'bg-[var(--info-bg)]' : ''
                        }`}
                      >
                        <Td>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => onToggleLine(l.id)}
                          />
                        </Td>
                        <Td right mono>{l.line_number}</Td>
                        <Td mono>{l.size ?? '—'}</Td>
                        <Td>{l.description}</Td>
                        <Td right mono>{formatQty(l.quantity, l.uom)}</Td>
                        <Td right mono>{formatMoney(l.unit_cost)}</Td>
                        <Td right mono>{formatMoney(l.amount)}</Td>
                        <Td muted>{l.lead_time ?? '—'}</Td>
                        <Td mono>
                          {l.ship_date ? (
                            <Badge tone="info">{formatDate(l.ship_date)}</Badge>
                          ) : (
                            <span className="text-[var(--text-muted)]">—</span>
                          )}
                        </Td>
                        <Td mono>
                          {l.received_date ? (
                            <Badge tone="under">{formatDate(l.received_date)}</Badge>
                          ) : (
                            <span className="text-[var(--text-muted)]">—</span>
                          )}
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TableWrap>
          )}
        </>
      )}
    </Card>
  );
}

// -----------------------------------------------------------------------------
// helpers
// -----------------------------------------------------------------------------
function valueFor(l: ApexLineItem, field: SortField): string | number {
  switch (field) {
    case 'line_number': return l.line_number;
    case 'size':        return l.size ?? '';
    case 'description': return l.description;
    case 'quantity':    return l.quantity;
    case 'amount':      return l.amount;
    case 'ship_date':   return l.ship_date ?? '~~~'; // nulls last on asc
    default:            return 0;
  }
}

function SortableTh({
  field,
  sort,
  onSort,
  right,
  children,
}: {
  field: SortField;
  sort: { field: SortField; dir: SortDir };
  onSort: (f: SortField) => void;
  right?: boolean;
  children: React.ReactNode;
}) {
  const active = sort.field === field;
  const arrow = active ? (sort.dir === 'asc' ? '▲' : '▼') : '';
  return (
    <Th right={right}>
      <button
        type="button"
        onClick={() => onSort(field)}
        className={`inline-flex items-center gap-1 uppercase tracking-wider ${
          active ? 'text-[var(--text)]' : 'hover:text-[var(--text)]'
        }`}
      >
        <span>{children}</span>
        {arrow && <span className="text-[10px]">{arrow}</span>}
      </button>
    </Th>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? 'bg-enbridge-black text-white'
          : 'bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface-2)]'
      }`}
    >
      {children}
    </button>
  );
}

function ViewToggleButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded px-2.5 py-1 text-xs font-semibold uppercase tracking-wide transition-colors ${
        active
          ? 'bg-enbridge-black text-white'
          : 'text-[var(--text-muted)] hover:bg-[var(--surface-2)]'
      }`}
    >
      {children}
    </button>
  );
}

function BarModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold uppercase tracking-wide transition-colors ${
        active
          ? 'bg-enbridge-black text-white'
          : 'text-[var(--text-muted)] hover:bg-[var(--surface-2)]'
      }`}
    >
      {children}
    </button>
  );
}

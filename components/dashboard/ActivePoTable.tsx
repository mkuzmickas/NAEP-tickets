'use client';

import { useMemo, useState } from 'react';
import { formatMoney, formatPct } from '@/lib/money';
import type { ActivePoSummary } from '@/types/database';

type SortKey =
  | 'po_number'
  | 'vendor_display_name'
  | 'committed'
  | 'lem_to_date'
  | 'remaining'
  | 'pct_used'
  | 'ticket_count';
type SortDir = 'asc' | 'desc';

const NUMERIC_KEYS: SortKey[] = [
  'committed',
  'lem_to_date',
  'remaining',
  'pct_used',
  'ticket_count',
];

export function ActivePoTable({ rows }: { rows: ActivePoSummary[] }) {
  const [search, setSearch] = useState('');
  const [vendorFilter, setVendorFilter] = useState<string>('all');
  const [sortKey, setSortKey] = useState<SortKey>('pct_used');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const vendorOptions = useMemo(
    () => Array.from(new Set(rows.map((r) => r.vendor_display_name))).sort(),
    [rows]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let result = rows;
    if (q) {
      result = result.filter(
        (r) =>
          r.po_number.toLowerCase().includes(q) ||
          r.vendor_display_name.toLowerCase().includes(q) ||
          (r.scope ?? '').toLowerCase().includes(q)
      );
    }
    if (vendorFilter !== 'all') {
      result = result.filter((r) => r.vendor_display_name === vendorFilter);
    }
    return [...result].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      let cmp = 0;
      if (typeof av === 'number' && typeof bv === 'number') cmp = av - bv;
      else cmp = String(av ?? '').localeCompare(String(bv ?? ''));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [rows, search, vendorFilter, sortKey, sortDir]);

  const filteredTotals = useMemo(
    () => ({
      committed: filtered.reduce((s, r) => s + r.committed, 0),
      lem: filtered.reduce((s, r) => s + r.lem_to_date, 0),
    }),
    [filtered]
  );

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(NUMERIC_KEYS.includes(key) ? 'desc' : 'asc');
    }
  }

  function clearFilters() {
    setSearch('');
    setVendorFilter('all');
  }

  const filtersActive = !!(search || vendorFilter !== 'all');

  return (
    <div className="bg-white rounded-lg border border-black/10 overflow-hidden">
      <div className="px-5 py-3 border-b border-black/10 space-y-3">
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <h2 className="text-base font-semibold tracking-tight">
            Active Purchase Orders
          </h2>
          <span className="text-xs text-enbridge-black/55 tabular-nums">
            Showing <strong>{filtered.length}</strong> of {rows.length} · LEM
            {' '}{formatMoney(filteredTotals.lem)} of{' '}
            {formatMoney(filteredTotals.committed)} committed
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr,200px] gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search PO #, vendor, or description"
            className="rounded border border-black/20 px-3 py-1.5 text-sm focus:outline-none focus:border-enbridge-black"
          />
          <select
            value={vendorFilter}
            onChange={(e) => setVendorFilter(e.target.value)}
            className="rounded border border-black/20 px-3 py-1.5 text-sm bg-white focus:outline-none focus:border-enbridge-black"
          >
            <option value="all">All vendors</option>
            {vendorOptions.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>
        {filtersActive && (
          <button
            onClick={clearFilters}
            className="text-xs text-enbridge-black/60 underline hover:text-enbridge-black"
          >
            Clear filters
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-enbridge-paper text-enbridge-black/70">
            <tr>
              <SortableTh
                active={sortKey === 'po_number'}
                dir={sortDir}
                onClick={() => toggleSort('po_number')}
              >
                PO Number
              </SortableTh>
              <SortableTh
                active={sortKey === 'vendor_display_name'}
                dir={sortDir}
                onClick={() => toggleSort('vendor_display_name')}
              >
                Vendor
              </SortableTh>
              <Th>Description</Th>
              <SortableTh
                right
                active={sortKey === 'committed'}
                dir={sortDir}
                onClick={() => toggleSort('committed')}
              >
                Committed
              </SortableTh>
              <SortableTh
                right
                active={sortKey === 'lem_to_date'}
                dir={sortDir}
                onClick={() => toggleSort('lem_to_date')}
              >
                LEM-to-Date
              </SortableTh>
              <SortableTh
                right
                active={sortKey === 'remaining'}
                dir={sortDir}
                onClick={() => toggleSort('remaining')}
              >
                Remaining
              </SortableTh>
              <SortableTh
                right
                active={sortKey === 'pct_used'}
                dir={sortDir}
                onClick={() => toggleSort('pct_used')}
              >
                % Used
              </SortableTh>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr
                key={r.id}
                className="border-t border-black/5 hover:bg-enbridge-paper/60"
              >
                <Td mono>{r.po_number}</Td>
                <Td>{r.vendor_display_name}</Td>
                <Td className="max-w-xs">
                  <span className="text-enbridge-black/80 line-clamp-2">
                    {r.scope ?? '—'}
                  </span>
                </Td>
                <Td right>{formatMoney(r.committed)}</Td>
                <Td right>{formatMoney(r.lem_to_date)}</Td>
                <Td right>{formatMoney(r.remaining)}</Td>
                <PctCell value={r.pct_used} />
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-enbridge-black/55 text-sm"
                >
                  {rows.length === 0
                    ? 'No active POs yet. A PO becomes active once its first ticket is logged.'
                    : 'No POs match the current filters.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({
  children,
  right,
}: {
  children: React.ReactNode;
  right?: boolean;
}) {
  return (
    <th
      className={`px-4 py-2 text-xs font-medium uppercase tracking-wide ${
        right ? 'text-right' : 'text-left'
      }`}
    >
      {children}
    </th>
  );
}

function SortableTh({
  children,
  active,
  dir,
  onClick,
  right,
}: {
  children: React.ReactNode;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
  right?: boolean;
}) {
  return (
    <th
      className={`px-4 py-2 text-xs font-medium uppercase tracking-wide ${
        right ? 'text-right' : 'text-left'
      }`}
    >
      <button
        onClick={onClick}
        className="inline-flex items-center gap-1 hover:text-enbridge-black"
      >
        {children}
        <span className="text-enbridge-black/40">
          {active ? (dir === 'asc' ? '▲' : '▼') : '▾'}
        </span>
      </button>
    </th>
  );
}

function Td({
  children,
  right,
  mono,
  className,
}: {
  children: React.ReactNode;
  right?: boolean;
  mono?: boolean;
  className?: string;
}) {
  return (
    <td
      className={[
        'px-4 py-3 align-top',
        right ? 'text-right tabular-nums' : '',
        mono ? 'font-mono text-xs' : '',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </td>
  );
}

function PctCell({ value }: { value: number }) {
  let bg = '';
  let text = 'text-enbridge-black/75';
  if (value > 100) {
    bg = 'bg-red-100';
    text = 'text-red-900 font-semibold';
  } else if (value > 80) {
    bg = 'bg-amber-100';
    text = 'text-amber-900 font-semibold';
  }
  return (
    <td className={`px-4 py-3 text-right tabular-nums ${bg} ${text}`}>
      {formatPct(value)}
    </td>
  );
}

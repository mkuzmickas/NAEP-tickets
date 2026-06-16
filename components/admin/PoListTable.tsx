'use client';

import { useMemo, useState } from 'react';
import { formatMoney } from '@/lib/money';
import type { PoReferenceRow } from '@/lib/pos';

type SortKey =
  | 'is_active'
  | 'po_number'
  | 'vendor_display_name'
  | 'task_wbs'
  | 'committed_amount';
type SortDir = 'asc' | 'desc';
type StatusFilter = 'all' | 'active' | 'inactive';

const NUMERIC_OR_FLAG_KEYS: SortKey[] = ['is_active', 'committed_amount'];

export function PoListTable({ rows }: { rows: PoReferenceRow[] }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('is_active');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let result = rows;
    if (q) {
      result = result.filter(
        (r) =>
          r.po_number.toLowerCase().includes(q) ||
          r.vendor_display_name.toLowerCase().includes(q) ||
          r.vendor_legal_name.toLowerCase().includes(q) ||
          (r.scope ?? '').toLowerCase().includes(q) ||
          (r.task_wbs ?? '').toLowerCase().includes(q)
      );
    }
    if (statusFilter === 'active') result = result.filter((r) => r.is_active);
    if (statusFilter === 'inactive') result = result.filter((r) => !r.is_active);

    return [...result].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'is_active') {
        cmp = (a.is_active ? 1 : 0) - (b.is_active ? 1 : 0);
        if (cmp === 0) cmp = a.committed_amount - b.committed_amount;
      } else {
        const av = a[sortKey];
        const bv = b[sortKey];
        if (typeof av === 'number' && typeof bv === 'number') {
          cmp = av - bv;
        } else if (av == null) {
          cmp = bv == null ? 0 : 1;
        } else if (bv == null) {
          cmp = -1;
        } else {
          cmp = String(av).localeCompare(String(bv));
        }
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [rows, search, statusFilter, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(NUMERIC_OR_FLAG_KEYS.includes(key) ? 'desc' : 'asc');
    }
  }

  function clearFilters() {
    setSearch('');
    setStatusFilter('all');
  }

  const filtersActive = !!(search || statusFilter !== 'all');
  const activeCount = filtered.filter((p) => p.is_active).length;
  const filteredCommitted = filtered.reduce(
    (s, r) => s + r.committed_amount,
    0
  );

  return (
    <div className="bg-white rounded-lg border border-black/10 overflow-hidden">
      <div className="px-5 py-3 border-b border-black/10 space-y-3">
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <h2 className="text-base font-semibold tracking-tight">All POs</h2>
          <span className="text-xs text-enbridge-black/55 tabular-nums">
            Showing <strong>{filtered.length}</strong> of {rows.length} ·{' '}
            {activeCount} active · {formatMoney(filteredCommitted)} committed
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr,180px] gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search PO #, vendor, WBS, or description"
            className="rounded border border-black/20 px-3 py-1.5 text-sm focus:outline-none focus:border-enbridge-black"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="rounded border border-black/20 px-3 py-1.5 text-sm bg-white focus:outline-none focus:border-enbridge-black"
          >
            <option value="all">All statuses</option>
            <option value="active">Active only</option>
            <option value="inactive">Inactive only</option>
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
                active={sortKey === 'is_active'}
                dir={sortDir}
                onClick={() => toggleSort('is_active')}
              >
                Status
              </SortableTh>
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
              <SortableTh
                active={sortKey === 'task_wbs'}
                dir={sortDir}
                onClick={() => toggleSort('task_wbs')}
              >
                Task/WBS
              </SortableTh>
              <Th>Scope</Th>
              <SortableTh
                right
                active={sortKey === 'committed_amount'}
                dir={sortDir}
                onClick={() => toggleSort('committed_amount')}
              >
                Committed
              </SortableTh>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr
                key={p.id}
                className="border-t border-black/5 hover:bg-enbridge-paper/60"
              >
                <td className="px-4 py-3 align-top">
                  {p.is_active ? (
                    <span className="text-[10px] uppercase tracking-wide bg-green-100 text-green-900 px-1.5 py-0.5 rounded">
                      Active
                    </span>
                  ) : (
                    <span className="text-[10px] uppercase tracking-wide bg-black/5 text-enbridge-black/60 px-1.5 py-0.5 rounded">
                      Inactive
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 align-top font-mono text-xs whitespace-nowrap">
                  {p.po_number}
                </td>
                <td className="px-4 py-3 align-top">
                  {p.vendor_display_name}
                  <div className="text-[10px] text-enbridge-black/55">
                    {p.vendor_legal_name}
                  </div>
                </td>
                <td className="px-4 py-3 align-top font-mono text-xs whitespace-nowrap">
                  {p.task_wbs ?? '—'}
                </td>
                <td className="px-4 py-3 align-top max-w-md">
                  <span className="text-enbridge-black/80 line-clamp-2">
                    {p.scope ?? '—'}
                  </span>
                </td>
                <td className="px-4 py-3 align-top text-right tabular-nums whitespace-nowrap">
                  {formatMoney(p.committed_amount)}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-enbridge-black/55 text-sm"
                >
                  {rows.length === 0
                    ? 'No POs on file yet. Use the form above to add the first one.'
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

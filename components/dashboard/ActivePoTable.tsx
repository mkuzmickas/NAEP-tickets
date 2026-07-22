'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatMoney, formatPct } from '@/lib/money';
import type { ActivePoSummary } from '@/types/database';

type SortKey =
  | 'po_number'
  | 'project_cost_code'
  | 'vendor_display_name'
  | 'committed'
  | 'lem_to_date'
  | 'vendor_system_incurred'
  | 'vendor_gap'
  | 'remaining'
  | 'pct_used'
  | 'ticket_count';
type SortDir = 'asc' | 'desc';

const NUMERIC_KEYS: SortKey[] = [
  'committed',
  'lem_to_date',
  'vendor_system_incurred',
  'vendor_gap',
  'remaining',
  'pct_used',
  'ticket_count',
];

export function ActivePoTable({ rows }: { rows: ActivePoSummary[] }) {
  const router = useRouter();
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
          (r.scope ?? '').toLowerCase().includes(q) ||
          (r.project_cost_code ?? '').toLowerCase().includes(q)
      );
    }
    if (vendorFilter !== 'all') {
      result = result.filter((r) => r.vendor_display_name === vendorFilter);
    }
    return [...result].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      let cmp = 0;
      if (av == null && bv == null) cmp = 0;
      else if (av == null) cmp = 1;
      else if (bv == null) cmp = -1;
      else if (typeof av === 'number' && typeof bv === 'number') cmp = av - bv;
      else cmp = String(av).localeCompare(String(bv));
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
            Purchase Orders
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
            placeholder="Search PO #, cost code, vendor, or description"
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
                active={sortKey === 'project_cost_code'}
                dir={sortDir}
                onClick={() => toggleSort('project_cost_code')}
              >
                Project Cost Code
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
                active={sortKey === 'vendor_system_incurred'}
                dir={sortDir}
                onClick={() => toggleSort('vendor_system_incurred')}
              >
                Vendor Incurred
              </SortableTh>
              <SortableTh
                right
                active={sortKey === 'vendor_gap'}
                dir={sortDir}
                onClick={() => toggleSort('vendor_gap')}
              >
                Gap
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
                onClick={() =>
                  router.push(`/tickets?po=${encodeURIComponent(r.po_number)}`)
                }
                className="border-t border-black/5 hover:bg-enbridge-paper/60 cursor-pointer"
                title={`Click to see all tickets for ${r.po_number}`}
              >
                <Td mono>{r.po_number}</Td>
                <Td mono>{r.project_cost_code ?? '—'}</Td>
                <Td>{r.vendor_display_name}</Td>
                <Td className="max-w-xs">
                  <span className="text-enbridge-black/80 line-clamp-2">
                    {r.scope ?? '—'}
                  </span>
                </Td>
                <Td right>{formatMoney(r.committed)}</Td>
                <Td right>{formatMoney(r.lem_to_date)}</Td>
                <VendorIncurredCell
                  poId={r.id}
                  value={r.vendor_system_incurred}
                  onSaved={() => router.refresh()}
                />
                <GapCell value={r.vendor_gap} />
                <Td right>{formatMoney(r.remaining)}</Td>
                <PctCell value={r.pct_used} />
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={10}
                  className="px-4 py-8 text-center text-enbridge-black/55 text-sm"
                >
                  {rows.length === 0
                    ? 'No POs on file yet. Add one in the POs admin page.'
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

function GapCell({ value }: { value: number | null }) {
  if (value == null) {
    return <td className="px-4 py-3 text-right text-enbridge-black/35 tabular-nums">—</td>;
  }
  let bg = '';
  let text = 'text-enbridge-black/75';
  const abs = Math.abs(value);
  if (abs < 0.5) {
    text = 'text-green-800 font-medium';
  } else if (value > 0) {
    bg = 'bg-red-100';
    text = 'text-red-900 font-semibold';
  } else {
    bg = 'bg-amber-100';
    text = 'text-amber-900 font-semibold';
  }
  return (
    <td className={`px-4 py-3 text-right tabular-nums ${bg} ${text}`}>
      {formatMoney(value)}
    </td>
  );
}

function VendorIncurredCell({
  poId,
  value,
  onSaved,
}: {
  poId: string;
  value: number | null;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string>(value == null ? '' : String(value));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function startEdit(e: React.MouseEvent) {
    e.stopPropagation();
    setDraft(value == null ? '' : String(value));
    setEditing(true);
    setError('');
  }

  function cancel() {
    setEditing(false);
    setError('');
    setDraft(value == null ? '' : String(value));
  }

  async function commit() {
    const trimmed = draft.trim();
    const next = trimmed === '' ? null : Number(trimmed);
    if (next !== null && (!Number.isFinite(next) || next < 0)) {
      setError('Enter a number ≥ 0, or leave blank to clear.');
      return;
    }
    if (next === value) {
      setEditing(false);
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/pos/${poId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendor_system_incurred: next }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Save failed (${res.status})`);
      }
      setEditing(false);
      onSaved();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <td
      className="px-4 py-3 text-right tabular-nums"
      onClick={(e) => e.stopPropagation()}
    >
      {editing ? (
        <div className="flex flex-col items-end gap-1">
          <input
            type="number"
            step="0.01"
            min="0"
            autoFocus
            value={draft}
            disabled={saving}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit();
              else if (e.key === 'Escape') cancel();
            }}
            placeholder="blank = clear"
            className="w-28 rounded border border-enbridge-black px-2 py-1 text-right text-sm focus:outline-none"
          />
          {error && <span className="text-[10px] text-red-700">{error}</span>}
        </div>
      ) : (
        <button
          onClick={startEdit}
          title="Click to edit — what the vendor's system says they've submitted"
          className="w-full text-right hover:bg-black/[0.04] hover:ring-1 hover:ring-black/10 rounded px-1 py-0.5"
        >
          {value == null ? (
            <span className="text-enbridge-black/35">—</span>
          ) : (
            formatMoney(value)
          )}
        </button>
      )}
    </td>
  );
}

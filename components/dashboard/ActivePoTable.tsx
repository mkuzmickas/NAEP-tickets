'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatMoney, formatPct } from '@/lib/money';
import { Card, CardHeader, EmptyState } from '@/components/ui/Primitives';
import type { ActivePoSummary } from '@/types/database';

type SortKey =
  | 'po_number'
  | 'project_cost_code'
  | 'vendor_display_name'
  | 'vendor_job_ref'
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
          (r.project_cost_code ?? '').toLowerCase().includes(q) ||
          (r.vendor_job_ref ?? '').toLowerCase().includes(q)
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
    <Card>
      <CardHeader
        title="Purchase Orders"
        subtitle={
          <>
            Showing <span className="tabular font-medium text-[var(--text)]">{filtered.length}</span> of {rows.length} ·{' '}
            <span className="tabular font-medium text-[var(--text)]">{formatMoney(filteredTotals.lem)}</span>
            {' '}LEM of{' '}
            <span className="tabular font-medium text-[var(--text)]">{formatMoney(filteredTotals.committed)}</span>
            {' '}committed
          </>
        }
      />
      <div className="px-5 py-3 border-b border-[var(--border)] flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search PO #, cost code, vendor, or description"
          className="flex-1 min-w-[240px] rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm focus:outline-none focus:border-[var(--text)]"
        />
        <select
          value={vendorFilter}
          onChange={(e) => setVendorFilter(e.target.value)}
          className="w-[200px] rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm focus:outline-none focus:border-[var(--text)]"
        >
          <option value="all">All vendors</option>
          {vendorOptions.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
        {filtersActive && (
          <button
            onClick={clearFilters}
            className="text-xs text-[var(--text-muted)] underline hover:text-[var(--text)]"
          >
            Clear filters
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)]">
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
              <SortableTh
                active={sortKey === 'vendor_job_ref'}
                dir={sortDir}
                onClick={() => toggleSort('vendor_job_ref')}
              >
                Vendor Job #
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
                className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)] cursor-pointer"
                title={`Click to see all tickets for ${r.po_number}`}
              >
                <Td mono>{r.po_number}</Td>
                <Td mono muted>{r.project_cost_code ?? '—'}</Td>
                <Td>{r.vendor_display_name}</Td>
                <VendorJobRefCell
                  poId={r.id}
                  value={r.vendor_job_ref}
                  onSaved={() => router.refresh()}
                />
                <Td className="max-w-xs">
                  <span className="text-[var(--text)] line-clamp-2">
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
                <td colSpan={11} className="p-0">
                  <EmptyState
                    title={
                      rows.length === 0
                        ? 'No POs on file yet.'
                        : 'No POs match the current filters.'
                    }
                    hint={
                      rows.length === 0
                        ? 'Add one from the Purchase Orders page.'
                        : undefined
                    }
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
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
      className={`px-3 py-2 text-xs font-medium uppercase tracking-wider text-[var(--text-muted)] ${
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
      className={`px-3 py-2 text-xs font-medium uppercase tracking-wider text-[var(--text-muted)] ${
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
  muted,
  className,
}: {
  children: React.ReactNode;
  right?: boolean;
  mono?: boolean;
  muted?: boolean;
  className?: string;
}) {
  return (
    <td
      className={[
        'px-3 py-2.5 align-top',
        right ? 'text-right tabular' : '',
        mono ? 'font-mono text-xs tabular' : 'text-sm',
        muted ? 'text-[var(--text-muted)]' : '',
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
  let cls = 'text-[var(--text)]';
  if (value > 100) {
    cls = 'text-[var(--over)] font-semibold';
  } else if (value > 80) {
    cls = 'text-[var(--warn)] font-semibold';
  } else if (value >= 0) {
    cls = 'text-[var(--text-muted)]';
  }
  return (
    <td className={`px-3 py-2.5 text-right tabular ${cls}`}>
      {formatPct(value)}
    </td>
  );
}

function GapCell({ value }: { value: number | null }) {
  if (value == null) {
    return (
      <td className="px-3 py-2.5 text-right text-[var(--text-muted)]/50 tabular">
        —
      </td>
    );
  }
  const abs = Math.abs(value);
  let cls = 'text-[var(--text-muted)]';
  if (abs < 0.5) {
    cls = 'text-[var(--under)]';
  } else if (value > 0) {
    cls = 'text-[var(--over)] font-semibold';
  } else {
    cls = 'text-[var(--warn)] font-semibold';
  }
  return (
    <td className={`px-3 py-2.5 text-right tabular ${cls}`}>
      {formatMoney(value)}
    </td>
  );
}

function VendorJobRefCell({
  poId,
  value,
  onSaved,
}: {
  poId: string;
  value: string | null;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string>(value ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function startEdit(e: React.MouseEvent) {
    e.stopPropagation();
    setDraft(value ?? '');
    setEditing(true);
    setError('');
  }

  function cancel() {
    setEditing(false);
    setError('');
    setDraft(value ?? '');
  }

  async function commit() {
    const trimmed = draft.trim();
    const next = trimmed === '' ? null : trimmed;
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
        body: JSON.stringify({ vendor_job_ref: next }),
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
      className="px-4 py-3 align-top text-xs font-mono"
      onClick={(e) => e.stopPropagation()}
    >
      {editing ? (
        <div className="flex flex-col gap-1">
          <input
            type="text"
            autoFocus
            value={draft}
            disabled={saving}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit();
              else if (e.key === 'Escape') cancel();
            }}
            placeholder="Job # / ref"
            className="w-32 rounded border border-enbridge-black px-2 py-1 text-xs font-mono focus:outline-none"
          />
          {error && <span className="text-[10px] text-red-700 font-sans">{error}</span>}
        </div>
      ) : (
        <button
          onClick={startEdit}
          title="Click to enter the vendor's internal job # or reference"
          className="text-left hover:bg-black/[0.04] hover:ring-1 hover:ring-black/10 rounded px-1 py-0.5 min-w-[80px] block"
        >
          {value ? value : <span className="text-enbridge-black/35 font-sans">—</span>}
        </button>
      )}
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

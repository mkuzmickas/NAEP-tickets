'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatMoney, formatPct } from '@/lib/money';
import { Card, CardHeader, EmptyState } from '@/components/ui/Primitives';
import type { ActivePoSummary } from '@/types/database';

type SortKey =
  | 'po_number'
  | 'vendor_display_name'
  | 'committed'
  | 'lem_to_date'
  | 'pct_used'
  | 'vendor_gap';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'pct_used', label: '% Used' },
  { key: 'lem_to_date', label: 'LEM-to-Date' },
  { key: 'committed', label: 'Committed' },
  { key: 'vendor_gap', label: 'Reconciliation Gap' },
  { key: 'vendor_display_name', label: 'Vendor' },
  { key: 'po_number', label: 'PO Number' },
];

export function ActivePoTable({ rows }: { rows: ActivePoSummary[] }) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [vendorFilter, setVendorFilter] = useState<string>('all');
  const [sortKey, setSortKey] = useState<SortKey>('pct_used');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

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
            Showing{' '}
            <span className="tabular font-medium text-[var(--text)]">
              {filtered.length}
            </span>{' '}
            of {rows.length} ·{' '}
            <span className="tabular font-medium text-[var(--text)]">
              {formatMoney(filteredTotals.lem)}
            </span>{' '}
            LEM of{' '}
            <span className="tabular font-medium text-[var(--text)]">
              {formatMoney(filteredTotals.committed)}
            </span>{' '}
            committed
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
          className="w-[180px] rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm focus:outline-none focus:border-[var(--text)]"
        >
          <option value="all">All vendors</option>
          {vendorOptions.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm focus:outline-none focus:border-[var(--text)]"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.key} value={o.key}>
              Sort: {o.label}
            </option>
          ))}
        </select>
        <button
          onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
          title={sortDir === 'asc' ? 'Sort ascending' : 'Sort descending'}
          className="rounded-md border border-[var(--border)] bg-[var(--surface)] w-8 h-8 text-sm text-[var(--text-muted)] hover:text-[var(--text)]"
        >
          {sortDir === 'asc' ? '▲' : '▼'}
        </button>
        {filtersActive && (
          <button
            onClick={clearFilters}
            className="text-xs text-[var(--text-muted)] underline hover:text-[var(--text)]"
          >
            Clear
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
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
      ) : (
        <div className="p-5 grid grid-cols-1 xl:grid-cols-2 gap-4">
          {filtered.map((po) => (
            <PoSummaryCard
              key={po.id}
              po={po}
              onClick={() =>
                router.push(`/tickets?po=${encodeURIComponent(po.po_number)}`)
              }
              onRefresh={() => router.refresh()}
            />
          ))}
        </div>
      )}
    </Card>
  );
}

function PoSummaryCard({
  po,
  onClick,
  onRefresh,
}: {
  po: ActivePoSummary;
  onClick: () => void;
  onRefresh: () => void;
}) {
  const pctTone =
    po.pct_used > 100
      ? 'bg-[var(--over-bg)] text-[var(--over)]'
      : po.pct_used > 80
        ? 'bg-[var(--warn-bg)] text-[var(--warn)]'
        : 'bg-[var(--surface-2)] text-[var(--text-muted)]';

  const remainingTone =
    po.remaining < 0
      ? 'text-[var(--over)]'
      : po.pct_used > 80
        ? 'text-[var(--warn)]'
        : 'text-[var(--text)]';

  return (
    <div
      onClick={onClick}
      className="group border border-[var(--border)] rounded-lg bg-[var(--surface)] p-5 hover:border-[var(--text)]/40 hover:shadow-sm cursor-pointer transition-all"
      title={`Click to see all tickets for ${po.po_number}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          <div className="font-mono text-sm font-semibold tracking-wide uppercase text-[var(--text)]">
            {po.po_number}
          </div>
          <div className="text-xs text-[var(--text-muted)] mt-0.5 truncate">
            {po.vendor_display_name}
            {po.project_cost_code && (
              <> · <span className="font-mono">{po.project_cost_code}</span></>
            )}
          </div>
        </div>
        <div
          className={`text-xs font-semibold tabular px-2 py-1 rounded whitespace-nowrap ${pctTone}`}
        >
          {formatPct(po.pct_used)}
        </div>
      </div>

      {/* Scope */}
      <p className="text-sm text-[var(--text)]/85 line-clamp-2 mb-4 min-h-[2.5rem]">
        {po.scope ?? <span className="text-[var(--text-muted)] italic">No description</span>}
      </p>

      {/* Money grid */}
      <div className="grid grid-cols-3 gap-3 mb-3">
        <MiniStat label="Committed" value={formatMoney(po.committed)} />
        <MiniStat label="LEM-to-Date" value={formatMoney(po.lem_to_date)} />
        <MiniStat
          label="Remaining"
          value={formatMoney(po.remaining)}
          valueClass={remainingTone}
        />
      </div>

      {/* Progress bar */}
      <ProgressBar pct={po.pct_used} />

      {/* Vendor reconciliation row */}
      <div
        className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-[var(--border)]"
        onClick={(e) => e.stopPropagation()}
      >
        <EditableJobRef
          poId={po.id}
          value={po.vendor_job_ref}
          onSaved={onRefresh}
        />
        <EditableIncurred
          poId={po.id}
          value={po.vendor_system_incurred}
          onSaved={onRefresh}
        />
        <GapMini value={po.vendor_gap} />
      </div>

      {/* Ticket count */}
      <div className="mt-3 flex items-center justify-between text-[11px] text-[var(--text-muted)]">
        <span className="tabular">
          {po.ticket_count} ticket{po.ticket_count === 1 ? '' : 's'}
        </span>
        <span className="text-[var(--text-muted)]/60 group-hover:text-[var(--text)] transition-colors">
          View tickets →
        </span>
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  valueClass = 'text-[var(--text)]',
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-medium">
        {label}
      </div>
      <div className={`tabular text-sm font-semibold mt-0.5 ${valueClass}`}>
        {value}
      </div>
    </div>
  );
}

function GapMini({ value }: { value: number | null }) {
  const label = 'Gap';
  if (value == null) {
    return (
      <div>
        <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-medium">
          {label}
        </div>
        <div className="tabular text-sm mt-0.5 text-[var(--text-muted)]/60">
          —
        </div>
      </div>
    );
  }
  const abs = Math.abs(value);
  const cls =
    abs < 0.5
      ? 'text-[var(--under)]'
      : value > 0
        ? 'text-[var(--over)]'
        : 'text-[var(--warn)]';
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-medium">
        {label}
      </div>
      <div className={`tabular text-sm font-semibold mt-0.5 ${cls}`}>
        {formatMoney(value)}
      </div>
    </div>
  );
}

function ProgressBar({ pct }: { pct: number }) {
  const capped = Math.min(Math.max(pct, 0), 100);
  const overflow = Math.max(pct - 100, 0);
  const tone =
    pct > 100
      ? 'bg-[var(--over)]'
      : pct > 80
        ? 'bg-[var(--warn)]'
        : 'bg-[var(--under)]';
  return (
    <div className="flex h-1.5 overflow-hidden rounded-full bg-[var(--surface-2)]">
      <div
        className={`h-full transition-all ${tone}`}
        style={{ width: `${capped}%` }}
      />
      {overflow > 0 && (
        <div
          className="h-full bg-[var(--over)] opacity-60"
          style={{ width: `${Math.min(overflow, 100)}%` }}
        />
      )}
    </div>
  );
}

/* ---------- Inline editors ------------------------------------------------ */

function EditableJobRef({
  poId,
  value,
  onSaved,
}: {
  poId: string;
  value: string | null;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

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
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-medium">
        Vendor Job #
      </div>
      {editing ? (
        <input
          type="text"
          autoFocus
          value={draft}
          disabled={saving}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            else if (e.key === 'Escape') {
              setEditing(false);
              setDraft(value ?? '');
            }
          }}
          placeholder="Job # / ref"
          className="w-full mt-0.5 rounded border border-[var(--text)] px-1.5 py-0.5 text-sm font-mono focus:outline-none"
        />
      ) : (
        <button
          onClick={() => {
            setDraft(value ?? '');
            setEditing(true);
          }}
          className="mt-0.5 w-full text-left font-mono text-sm hover:bg-[var(--surface-2)] hover:ring-1 hover:ring-[var(--border)] rounded px-1 py-0.5"
          title="Click to enter the vendor's internal job # or reference"
        >
          {value ? (
            value
          ) : (
            <span className="text-[var(--text-muted)]/60">—</span>
          )}
        </button>
      )}
      {error && <span className="block text-[10px] text-[var(--over)] mt-0.5">{error}</span>}
    </div>
  );
}

function EditableIncurred({
  poId,
  value,
  onSaved,
}: {
  poId: string;
  value: number | null;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value == null ? '' : String(value));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function commit() {
    const trimmed = draft.trim();
    const next = trimmed === '' ? null : Number(trimmed);
    if (next !== null && (!Number.isFinite(next) || next < 0)) {
      setError('Enter a number ≥ 0');
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
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-medium">
        Vendor Incurred
      </div>
      {editing ? (
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
            else if (e.key === 'Escape') {
              setEditing(false);
              setDraft(value == null ? '' : String(value));
            }
          }}
          placeholder="blank = clear"
          className="w-full mt-0.5 rounded border border-[var(--text)] px-1.5 py-0.5 text-sm tabular focus:outline-none"
        />
      ) : (
        <button
          onClick={() => {
            setDraft(value == null ? '' : String(value));
            setEditing(true);
          }}
          className="mt-0.5 w-full text-left tabular text-sm font-semibold hover:bg-[var(--surface-2)] hover:ring-1 hover:ring-[var(--border)] rounded px-1 py-0.5"
          title="Click to edit — what the vendor's system says they've submitted"
        >
          {value == null ? (
            <span className="text-[var(--text-muted)]/60 font-normal">—</span>
          ) : (
            formatMoney(value)
          )}
        </button>
      )}
      {error && <span className="block text-[10px] text-[var(--over)] mt-0.5">{error}</span>}
    </div>
  );
}

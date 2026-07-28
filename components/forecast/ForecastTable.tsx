'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Search,
  X,
  ChevronUp,
  ChevronDown,
  AlertCircle,
} from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Primitives';
import { formatMoney } from '@/lib/money';
import {
  computeFac,
  forecastContribution,
  type ForecastPo,
} from '@/lib/forecast.shared';

type SortKey =
  | 'po_number'
  | 'vendor_display_name'
  | 'committed'
  | 'lem'
  | 'percent_complete'
  | 'fac'
  | 'overrun';

export function ForecastTable({ rows: initialRows }: { rows: ForecastPo[] }) {
  const [rows, setRows] = useState<ForecastPo[]>(initialRows);
  const [search, setSearch] = useState('');
  const [vendorFilter, setVendorFilter] = useState<string>('all');
  const [showForecastedOnly, setShowForecastedOnly] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('committed');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Keep local state in sync if the server refetches with different data.
  useEffect(() => setRows(initialRows), [initialRows]);

  const vendorOptions = useMemo(
    () =>
      Array.from(new Set(rows.map((r) => r.vendor_display_name))).sort(),
    [rows]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let out = rows;
    if (q) {
      out = out.filter(
        (r) =>
          r.po_number.toLowerCase().includes(q) ||
          r.vendor_display_name.toLowerCase().includes(q) ||
          (r.scope ?? '').toLowerCase().includes(q)
      );
    }
    if (vendorFilter !== 'all') {
      out = out.filter((r) => r.vendor_display_name === vendorFilter);
    }
    if (showForecastedOnly) {
      out = out.filter(
        (r) => r.percent_complete != null && r.percent_complete > 0
      );
    }
    return [...out].sort((a, b) => {
      const av = a[sortKey] as number | string | null | undefined;
      const bv = b[sortKey] as number | string | null | undefined;
      let cmp = 0;
      if (av == null && bv == null) cmp = 0;
      else if (av == null) cmp = 1;
      else if (bv == null) cmp = -1;
      else if (typeof av === 'number' && typeof bv === 'number') cmp = av - bv;
      else cmp = String(av).localeCompare(String(bv));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [rows, search, vendorFilter, showForecastedOnly, sortKey, sortDir]);

  const totals = useMemo(() => {
    return filtered.reduce(
      (acc, r) => ({
        committed: acc.committed + r.committed,
        lem: acc.lem + r.lem,
        fac: acc.fac + forecastContribution(r),
        overrun: acc.overrun + (r.overrun ?? 0),
        forecastedCount: acc.forecastedCount + (r.fac == null ? 0 : 1),
      }),
      { committed: 0, lem: 0, fac: 0, overrun: 0, forecastedCount: 0 }
    );
  }, [filtered]);

  const filtersActive =
    !!search || vendorFilter !== 'all' || showForecastedOnly;

  function clearFilters() {
    setSearch('');
    setVendorFilter('all');
    setShowForecastedOnly(false);
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  async function savePercent(
    poId: string,
    next: number | null
  ): Promise<{ ok: boolean; error?: string }> {
    // Optimistic local recompute — the row's FAC + overrun should update
    // instantly on tab-out, so Mike can see the impact before the round-trip
    // returns.
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== poId) return r;
        const fac = computeFac(r.lem, next);
        const overrun = fac == null ? null : fac - r.committed;
        return { ...r, percent_complete: next, fac, overrun };
      })
    );

    try {
      const res = await fetch(`/api/pos/${poId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ percent_complete: next }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        return {
          ok: false,
          error: body.error ?? `Save failed (${res.status})`,
        };
      }
      return { ok: true };
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }

  return (
    <Card>
      <CardHeader
        title="Forecast at Completion"
        subtitle={
          <>
            Showing{' '}
            <span className="tabular font-medium text-[var(--text)]">
              {filtered.length}
            </span>{' '}
            of {rows.length} PO{rows.length === 1 ? '' : 's'} ·{' '}
            <span className="tabular font-medium text-[var(--text)]">
              {totals.forecastedCount}
            </span>{' '}
            forecasted · FAC total{' '}
            <span className="tabular font-medium text-[var(--text)]">
              {formatMoney(totals.fac)}
            </span>
          </>
        }
      />

      {/* Filter bar */}
      <div className="px-4 py-3 border-b border-[var(--border)] flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-md rounded-md border border-[var(--border)] px-2 py-1.5">
          <Search
            className="h-4 w-4 text-[var(--text-muted)] shrink-0"
            strokeWidth={2}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search PO, vendor, or scope"
            className="flex-1 bg-transparent focus:outline-none text-sm placeholder:text-[var(--text-muted)]"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="text-[var(--text-muted)] hover:text-[var(--text)]"
              title="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <select
          value={vendorFilter}
          onChange={(e) => setVendorFilter(e.target.value)}
          className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-sm"
        >
          <option value="all">All vendors</option>
          {vendorOptions.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
        <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={showForecastedOnly}
            onChange={(e) => setShowForecastedOnly(e.target.checked)}
            className="rounded border-[var(--border)]"
          />
          Forecasted only
        </label>
        {filtersActive && (
          <button
            onClick={clearFilters}
            className="inline-flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--text)]"
          >
            <X className="h-3.5 w-3.5" />
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="w-full overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]">
              <SortableTh
                k="po_number"
                sortKey={sortKey}
                sortDir={sortDir}
                onClick={toggleSort}
              >
                PO
              </SortableTh>
              <SortableTh
                k="vendor_display_name"
                sortKey={sortKey}
                sortDir={sortDir}
                onClick={toggleSort}
              >
                Vendor
              </SortableTh>
              <SortableTh
                k="committed"
                sortKey={sortKey}
                sortDir={sortDir}
                onClick={toggleSort}
                right
              >
                Committed
              </SortableTh>
              <SortableTh
                k="lem"
                sortKey={sortKey}
                sortDir={sortDir}
                onClick={toggleSort}
                right
              >
                LEM
              </SortableTh>
              <SortableTh
                k="percent_complete"
                sortKey={sortKey}
                sortDir={sortDir}
                onClick={toggleSort}
                right
              >
                % Complete
              </SortableTh>
              <SortableTh
                k="fac"
                sortKey={sortKey}
                sortDir={sortDir}
                onClick={toggleSort}
                right
              >
                Forecast
              </SortableTh>
              <SortableTh
                k="overrun"
                sortKey={sortKey}
                sortDir={sortDir}
                onClick={toggleSort}
                right
              >
                Overrun
              </SortableTh>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-sm text-[var(--text-muted)]"
                >
                  No POs match the current filters.
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <ForecastRow key={r.id} row={r} onSavePercent={savePercent} />
              ))
            )}
            {filtered.length > 0 && (
              <tr className="border-t-2 border-[var(--text)]/40 bg-[var(--surface-2)]">
                <td
                  colSpan={2}
                  className="px-3 py-3 text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-semibold"
                >
                  Totals · {filtered.length} PO
                  {filtered.length === 1 ? '' : 's'}
                </td>
                <td className="px-3 py-3 text-right tabular font-semibold">
                  {formatMoney(totals.committed)}
                </td>
                <td className="px-3 py-3 text-right tabular font-semibold">
                  {formatMoney(totals.lem)}
                </td>
                <td className="px-3 py-3"></td>
                <td className="px-3 py-3 text-right tabular font-semibold text-[var(--text)]">
                  {formatMoney(totals.fac)}
                </td>
                <td
                  className={`px-3 py-3 text-right tabular font-semibold ${
                    totals.overrun > 0.5
                      ? 'text-[var(--over)]'
                      : totals.overrun < -0.5
                        ? 'text-[var(--under)]'
                        : 'text-[var(--text-muted)]'
                  }`}
                >
                  {totals.overrun > 0 ? '+' : ''}
                  {formatMoney(totals.overrun)}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// -----------------------------------------------------------------------------
// Header + row
// -----------------------------------------------------------------------------

function SortableTh({
  children,
  k,
  sortKey,
  sortDir,
  onClick,
  right,
}: {
  children: React.ReactNode;
  k: SortKey;
  sortKey: SortKey;
  sortDir: 'asc' | 'desc';
  onClick: (k: SortKey) => void;
  right?: boolean;
}) {
  const active = sortKey === k;
  return (
    <th
      className={`px-3 py-2 text-[10px] uppercase tracking-wider font-medium ${
        right ? 'text-right' : 'text-left'
      }`}
    >
      <button
        type="button"
        onClick={() => onClick(k)}
        className={`inline-flex items-center gap-1 transition-colors ${
          active
            ? 'text-[var(--text)] font-semibold'
            : 'text-[var(--text-muted)] hover:text-[var(--text)]'
        } ${right ? 'ml-auto' : ''}`}
      >
        {children}
        {active ? (
          sortDir === 'asc' ? (
            <ChevronUp className="h-3 w-3" strokeWidth={2.5} />
          ) : (
            <ChevronDown className="h-3 w-3" strokeWidth={2.5} />
          )
        ) : (
          <span className="w-3" />
        )}
      </button>
    </th>
  );
}

function ForecastRow({
  row,
  onSavePercent,
}: {
  row: ForecastPo;
  onSavePercent: (
    poId: string,
    next: number | null
  ) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [draft, setDraft] = useState(
    row.percent_complete == null ? '' : String(row.percent_complete)
  );
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Sync draft with row when the outer state changes (e.g. after external
  // refresh). Guarded so an in-progress edit doesn't get blown away.
  useEffect(() => {
    if (!saving) {
      setDraft(row.percent_complete == null ? '' : String(row.percent_complete));
    }
  }, [row.percent_complete, saving]);

  async function commit() {
    const trimmed = draft.trim();
    const next = trimmed === '' ? null : Number(trimmed);
    if (next !== null && (!Number.isFinite(next) || next < 0 || next > 100)) {
      setError('0–100 only');
      return;
    }
    if (next === row.percent_complete) {
      setError('');
      return;
    }
    setError('');
    setSaving(true);
    const result = await onSavePercent(row.id, next);
    setSaving(false);
    if (!result.ok) {
      setError(result.error ?? 'Save failed');
      // Revert draft to last saved value so the input matches state.
      setDraft(
        row.percent_complete == null ? '' : String(row.percent_complete)
      );
    }
  }

  const overrunTone =
    row.overrun == null
      ? 'text-[var(--text-muted)]/60'
      : row.overrun > 0.5
        ? 'text-[var(--over)] font-semibold'
        : row.overrun < -0.5
          ? 'text-[var(--under)]'
          : 'text-[var(--text-muted)]';

  return (
    <tr className="border-b border-[var(--border)] hover:bg-[var(--surface-2)]/50">
      <td className="px-3 py-2.5 font-mono text-xs">
        <div>{row.po_number}</div>
        {row.scope && (
          <div className="text-[10px] text-[var(--text-muted)] font-sans truncate max-w-xs mt-0.5">
            {row.scope}
          </div>
        )}
      </td>
      <td className="px-3 py-2.5">{row.vendor_display_name}</td>
      <td className="px-3 py-2.5 text-right tabular">
        {formatMoney(row.committed)}
      </td>
      <td className="px-3 py-2.5 text-right tabular">{formatMoney(row.lem)}</td>
      <td className="px-3 py-2.5 text-right">
        <div className="inline-flex items-center gap-1">
          <input
            type="number"
            min="0"
            max="100"
            step="0.5"
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              if (error) setError('');
            }}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.currentTarget.blur();
              } else if (e.key === 'Escape') {
                setDraft(
                  row.percent_complete == null
                    ? ''
                    : String(row.percent_complete)
                );
                setError('');
                e.currentTarget.blur();
              }
            }}
            disabled={saving}
            placeholder="—"
            className={`w-16 text-right tabular rounded border px-1.5 py-0.5 text-sm focus:outline-none disabled:opacity-60 ${
              error
                ? 'border-[var(--over)] focus:border-[var(--over)]'
                : 'border-[var(--border)] focus:border-[var(--brand-orange)]'
            }`}
          />
          <span className="text-xs text-[var(--text-muted)] w-3">%</span>
        </div>
        {error && (
          <div className="text-[10px] text-[var(--over)] mt-0.5 inline-flex items-center gap-1 justify-end">
            <AlertCircle className="h-3 w-3" strokeWidth={2.5} />
            {error}
          </div>
        )}
      </td>
      <td className="px-3 py-2.5 text-right tabular">
        {row.fac == null ? (
          <span className="text-[var(--text-muted)]/50">—</span>
        ) : (
          formatMoney(row.fac)
        )}
      </td>
      <td className={`px-3 py-2.5 text-right tabular ${overrunTone}`}>
        {row.overrun == null ? (
          <span className="text-[var(--text-muted)]/50">—</span>
        ) : (
          <>
            {row.overrun > 0 ? '+' : ''}
            {formatMoney(row.overrun)}
          </>
        )}
      </td>
    </tr>
  );
}

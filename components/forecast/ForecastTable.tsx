'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Search,
  X,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Primitives';
import { formatMoney } from '@/lib/money';
import { computeFac, type ForecastPo } from '@/lib/forecast.shared';

// -----------------------------------------------------------------------------
// Accent palette — same deterministic hash used on the Vendors grid so a
// vendor's colour is the same everywhere they appear. Gives each vendor
// row a small piece of visual identity so the page reads as a set of
// vendor cards, not an anonymous grid.
// -----------------------------------------------------------------------------
const ACCENT_PALETTE = [
  { fg: '#1F4E79', bg: '#e6eef6' },
  { fg: '#0f766e', bg: '#e6f2f0' },
  { fg: '#7c3aed', bg: '#efe9fe' },
  { fg: '#a16207', bg: '#fbf1d9' },
  { fg: '#be123c', bg: '#fce7ed' },
  { fg: '#0369a1', bg: '#e0f0fa' },
  { fg: '#65a30d', bg: '#eef7dd' },
  { fg: '#c2410c', bg: '#fbe8dc' },
];

function accentFor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return ACCENT_PALETTE[h % ACCENT_PALETTE.length];
}

function initials(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

type SortKey =
  | 'po_number'
  | 'committed'
  | 'lem'
  | 'percent_complete'
  | 'fac'
  | 'overrun';

// -----------------------------------------------------------------------------
// Per-PO derived numbers — one place, so the row cells + the vendor
// rollup + the totals footer all agree. When there's no manual
// percent_complete yet, everything falls back to the implied % that
// makes FAC exactly equal to committed.
// -----------------------------------------------------------------------------
function derive(p: ForecastPo) {
  const impliedPct =
    p.committed > 0 && p.lem > 0
      ? Math.min(100, (p.lem / p.committed) * 100)
      : null;
  const isImplied = p.percent_complete == null;
  const displayFac = p.fac ?? (impliedPct != null ? p.committed : null);
  const displayOverrun = p.overrun ?? (impliedPct != null ? 0 : null);
  return { impliedPct, isImplied, displayFac, displayOverrun };
}

// -----------------------------------------------------------------------------
// Top-level table
// -----------------------------------------------------------------------------

export function ForecastTable({ rows: initialRows }: { rows: ForecastPo[] }) {
  const [rows, setRows] = useState<ForecastPo[]>(initialRows);
  const [search, setSearch] = useState('');
  const [vendorFilter, setVendorFilter] = useState<string>('all');
  const [showForecastedOnly, setShowForecastedOnly] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('committed');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [expandedVendors, setExpandedVendors] = useState<Set<string>>(new Set());

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

  // Vendors always alphabetical, POs inside each vendor follow the sort
  // column. Feels natural to scan and matches how construction thinks
  // about the world ("give me every Sureline PO").
  const groups = useMemo(() => {
    const byVendor = new Map<string, ForecastPo[]>();
    for (const r of filtered) {
      const arr = byVendor.get(r.vendor_display_name) ?? [];
      arr.push(r);
      byVendor.set(r.vendor_display_name, arr);
    }
    return Array.from(byVendor.entries()).sort(([a], [b]) =>
      a.localeCompare(b)
    );
  }, [filtered]);

  const totals = useMemo(() => {
    return filtered.reduce(
      (acc, r) => {
        const d = derive(r);
        return {
          committed: acc.committed + r.committed,
          lem: acc.lem + r.lem,
          fac: acc.fac + (d.displayFac ?? r.committed),
          overrun: acc.overrun + (d.displayOverrun ?? 0),
          forecastedCount: acc.forecastedCount + (r.fac == null ? 0 : 1),
        };
      },
      { committed: 0, lem: 0, fac: 0, overrun: 0, forecastedCount: 0 }
    );
  }, [filtered]);

  const filtersActive =
    !!search || vendorFilter !== 'all' || showForecastedOnly;

  // Auto-expand every vendor group when a filter is active, so search hits
  // are visible without the user having to click chevrons. Manual expand
  // state is preserved when filters clear.
  const effectivelyExpanded = useMemo(() => {
    if (filtersActive) return new Set(groups.map(([n]) => n));
    return expandedVendors;
  }, [filtersActive, groups, expandedVendors]);

  const allExpanded = useMemo(
    () => groups.every(([name]) => effectivelyExpanded.has(name)),
    [groups, effectivelyExpanded]
  );

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

  function toggleVendor(name: string) {
    setExpandedVendors((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function expandAll() {
    setExpandedVendors(new Set(groups.map(([n]) => n)));
  }

  function collapseAll() {
    setExpandedVendors(new Set());
  }

  async function saveScope(
    poId: string,
    nextScope: string | null
  ): Promise<{ ok: boolean; error?: string }> {
    setRows((prev) =>
      prev.map((r) => (r.id === poId ? { ...r, scope: nextScope } : r))
    );
    try {
      const res = await fetch(`/api/pos/${poId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scope: nextScope }),
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

  async function savePercent(
    poId: string,
    next: number | null
  ): Promise<{ ok: boolean; error?: string }> {
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
            of {rows.length} PO{rows.length === 1 ? '' : 's'} across{' '}
            <span className="tabular font-medium text-[var(--text)]">
              {groups.length}
            </span>{' '}
            vendor{groups.length === 1 ? '' : 's'} ·{' '}
            <span className="tabular font-medium text-[var(--text)]">
              {totals.forecastedCount}
            </span>{' '}
            manually forecasted · FAC total{' '}
            <span className="tabular font-semibold text-[var(--text)]">
              {formatMoney(totals.fac)}
            </span>
          </>
        }
        action={
          groups.length > 0 && (
            <button
              type="button"
              onClick={allExpanded ? collapseAll : expandAll}
              className="text-xs font-semibold text-[var(--brand-orange)] hover:opacity-80"
            >
              {allExpanded ? 'Collapse all' : 'Expand all'}
            </button>
          )
        }
      />

      {/* Filter bar */}
      <div className="px-5 py-3.5 border-b border-[var(--border)] flex flex-wrap items-center gap-3 bg-[var(--surface-2)]/30">
        <div className="flex items-center gap-2 flex-1 min-w-[220px] max-w-md rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5">
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
          className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-sm"
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
        <table className="w-full text-[15px]">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]">
              <SortableTh
                k="po_number"
                sortKey={sortKey}
                sortDir={sortDir}
                onClick={toggleSort}
              >
                Vendor / PO
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
            {groups.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-14 text-center text-base text-[var(--text-muted)]"
                >
                  No POs match the current filters.
                </td>
              </tr>
            ) : (
              groups.map(([vendorName, pos]) => (
                <VendorGroup
                  key={vendorName}
                  vendorName={vendorName}
                  pos={pos}
                  expanded={effectivelyExpanded.has(vendorName)}
                  onToggle={() => toggleVendor(vendorName)}
                  onSavePercent={savePercent}
                  onSaveScope={saveScope}
                />
              ))
            )}
            {groups.length > 0 && (
              <tr className="border-t-2 border-[var(--text)]/40 bg-[var(--surface-2)] text-[15px]">
                <td className="px-4 py-4 text-xs uppercase tracking-widest text-[var(--text-muted)] font-semibold">
                  Project totals · {filtered.length} PO
                  {filtered.length === 1 ? '' : 's'} across {groups.length}{' '}
                  vendor{groups.length === 1 ? '' : 's'}
                </td>
                <td className="px-4 py-4 text-right tabular font-semibold">
                  {formatMoney(totals.committed)}
                </td>
                <td className="px-4 py-4 text-right tabular font-semibold">
                  {formatMoney(totals.lem)}
                </td>
                <td className="px-4 py-4"></td>
                <td className="px-4 py-4 text-right tabular font-semibold">
                  {formatMoney(totals.fac)}
                </td>
                <td
                  className={`px-4 py-4 text-right tabular font-semibold ${
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
// Vendor group — accordion header + child PO rows when expanded
// -----------------------------------------------------------------------------

function VendorGroup({
  vendorName,
  pos,
  expanded,
  onToggle,
  onSavePercent,
  onSaveScope,
}: {
  vendorName: string;
  pos: ForecastPo[];
  expanded: boolean;
  onToggle: () => void;
  onSavePercent: (
    poId: string,
    next: number | null
  ) => Promise<{ ok: boolean; error?: string }>;
  onSaveScope: (
    poId: string,
    nextScope: string | null
  ) => Promise<{ ok: boolean; error?: string }>;
}) {
  const accent = accentFor(vendorName);

  const agg = useMemo(() => {
    return pos.reduce(
      (acc, p) => {
        const d = derive(p);
        return {
          committed: acc.committed + p.committed,
          lem: acc.lem + p.lem,
          fac: acc.fac + (d.displayFac ?? p.committed),
          overrun: acc.overrun + (d.displayOverrun ?? 0),
          manualCount: acc.manualCount + (p.fac == null ? 0 : 1),
        };
      },
      { committed: 0, lem: 0, fac: 0, overrun: 0, manualCount: 0 }
    );
  }, [pos]);

  const anyManual = agg.manualCount > 0;
  const pctUsed =
    agg.committed > 0 ? (agg.lem / agg.committed) * 100 : 0;
  const overrunTone =
    agg.overrun > 0.5
      ? 'bg-[var(--over-bg)] text-[var(--over)] border-[var(--over)]/30'
      : agg.overrun < -0.5
        ? 'bg-[var(--under-bg)] text-[var(--under)] border-[var(--under)]/30'
        : 'bg-[var(--surface-2)] text-[var(--text-muted)] border-[var(--border)]';

  return (
    <>
      {/* Vendor rollup / accordion header */}
      <tr
        onClick={onToggle}
        className="cursor-pointer border-b border-[var(--border)] hover:bg-[var(--surface-2)]/70 transition-colors"
        style={{
          background: `linear-gradient(to right, ${accent.bg}55 0%, ${accent.bg}20 45%, transparent 100%)`,
        }}
      >
        <td className="px-4 py-3.5">
          <div className="flex items-center gap-3">
            <ChevronRight
              className={`h-4 w-4 text-[var(--text-muted)] shrink-0 transition-transform ${
                expanded ? 'rotate-90' : ''
              }`}
              strokeWidth={2.5}
            />
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-semibold shrink-0"
              style={{ background: accent.bg, color: accent.fg }}
            >
              {initials(vendorName)}
            </div>
            <div className="min-w-0">
              <div className="text-base font-semibold text-[var(--text)] leading-tight">
                {vendorName}
              </div>
              <div className="text-xs text-[var(--text-muted)] tabular mt-0.5">
                {pos.length} PO{pos.length === 1 ? '' : 's'} ·{' '}
                {pctUsed.toFixed(1)}% burn
                {agg.manualCount > 0 && (
                  <>
                    {' '}·{' '}
                    <span className="text-[var(--brand-orange)] font-medium">
                      {agg.manualCount} forecasted
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </td>
        <td className="px-4 py-3.5 text-right tabular font-semibold text-[var(--text)]">
          {formatMoney(agg.committed)}
        </td>
        <td className="px-4 py-3.5 text-right tabular text-[var(--text)]">
          {formatMoney(agg.lem)}
        </td>
        <td className="px-4 py-3.5"></td>
        <td className="px-4 py-3.5 text-right tabular font-semibold">
          {anyManual ? (
            <span className="text-[var(--text)]">{formatMoney(agg.fac)}</span>
          ) : (
            <span
              className="text-[var(--text-muted)]/70 italic"
              title="Implied — all POs auto-set to LEM ÷ committed"
            >
              ~{formatMoney(agg.fac)}
            </span>
          )}
        </td>
        <td className="px-4 py-3.5 text-right">
          <span
            className={`inline-block tabular font-semibold text-sm rounded-full border px-2.5 py-0.5 ${overrunTone} ${
              !anyManual ? 'opacity-60' : ''
            }`}
          >
            {agg.overrun > 0 ? '+' : ''}
            {formatMoney(agg.overrun)}
          </span>
        </td>
      </tr>

      {/* Child PO rows */}
      {expanded &&
        pos.map((po, i) => (
          <ForecastRow
            key={po.id}
            row={po}
            accent={accent}
            zebra={i % 2 === 1}
            onSavePercent={onSavePercent}
            onSaveScope={onSaveScope}
          />
        ))}
    </>
  );
}

// -----------------------------------------------------------------------------
// Individual PO row (nested inside a vendor group)
// -----------------------------------------------------------------------------

function ForecastRow({
  row,
  accent,
  zebra,
  onSavePercent,
  onSaveScope,
}: {
  row: ForecastPo;
  accent: { fg: string; bg: string };
  zebra: boolean;
  onSavePercent: (
    poId: string,
    next: number | null
  ) => Promise<{ ok: boolean; error?: string }>;
  onSaveScope: (
    poId: string,
    nextScope: string | null
  ) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [draft, setDraft] = useState(
    row.percent_complete == null ? '' : String(row.percent_complete)
  );
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

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
      setDraft(
        row.percent_complete == null ? '' : String(row.percent_complete)
      );
    }
  }

  const { impliedPct, isImplied, displayFac, displayOverrun } = derive(row);

  const overrunTone =
    displayOverrun == null
      ? 'text-[var(--text-muted)]/60'
      : displayOverrun > 0.5
        ? isImplied
          ? 'text-[var(--over)]/60'
          : 'text-[var(--over)] font-semibold'
        : displayOverrun < -0.5
          ? isImplied
            ? 'text-[var(--under)]/60'
            : 'text-[var(--under)]'
          : 'text-[var(--text-muted)]';

  const bg = zebra ? 'bg-[var(--surface-2)]/25' : 'bg-transparent';

  return (
    <tr
      className={`border-b border-[var(--border)]/60 hover:bg-[var(--surface-2)]/60 transition-colors ${bg}`}
    >
      <td className="pl-12 pr-4 py-3 align-top border-l-2" style={{ borderLeftColor: accent.fg + '40' }}>
        <div className="font-mono text-sm font-medium text-[var(--text)]">
          {row.po_number}
        </div>
        <EditableScope
          scope={row.scope}
          onSave={(next) => onSaveScope(row.id, next)}
        />
      </td>
      <td className="px-4 py-3 text-right tabular align-top">
        {formatMoney(row.committed)}
      </td>
      <td className="px-4 py-3 text-right tabular align-top">
        {formatMoney(row.lem)}
      </td>
      <td className="px-4 py-3 text-right align-top">
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
            placeholder={impliedPct != null ? impliedPct.toFixed(1) : '—'}
            className={`w-20 text-right tabular rounded border px-2 py-1 text-[15px] focus:outline-none disabled:opacity-60 placeholder:italic placeholder:text-[var(--text-muted)]/60 ${
              error
                ? 'border-[var(--over)] focus:border-[var(--over)]'
                : 'border-[var(--border)] focus:border-[var(--brand-orange)]'
            }`}
          />
          <span className="text-sm text-[var(--text-muted)] w-3">%</span>
        </div>
        {error && (
          <div className="text-xs text-[var(--over)] mt-1 inline-flex items-center gap-1 justify-end">
            <AlertCircle className="h-3.5 w-3.5" strokeWidth={2.5} />
            {error}
          </div>
        )}
      </td>
      <td className="px-4 py-3 text-right tabular align-top">
        {displayFac == null ? (
          <span className="text-[var(--text-muted)]/50">—</span>
        ) : isImplied ? (
          <span
            className="text-[var(--text-muted)]/70 italic"
            title="Implied from LEM ÷ committed. Type a % to override."
          >
            ~{formatMoney(displayFac)}
          </span>
        ) : (
          formatMoney(displayFac)
        )}
      </td>
      <td className={`px-4 py-3 text-right tabular align-top ${overrunTone}`}>
        {displayOverrun == null ? (
          <span className="text-[var(--text-muted)]/50">—</span>
        ) : isImplied ? (
          <span
            className="italic"
            title="Implied from LEM ÷ committed. Type a % to override."
          >
            ~{displayOverrun > 0 ? '+' : ''}
            {formatMoney(displayOverrun)}
          </span>
        ) : (
          <>
            {displayOverrun > 0 ? '+' : ''}
            {formatMoney(displayOverrun)}
          </>
        )}
      </td>
    </tr>
  );
}

// -----------------------------------------------------------------------------
// Sortable column header
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
      className={`px-4 py-3 text-xs uppercase tracking-wider font-medium ${
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
            <ChevronUp className="h-3.5 w-3.5" strokeWidth={2.5} />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" strokeWidth={2.5} />
          )
        ) : (
          <span className="w-3.5" />
        )}
      </button>
    </th>
  );
}

// -----------------------------------------------------------------------------
// EditableScope — click the scope text to swap in a textarea; blur/Enter
// commits, Escape reverts. Empty scope shows an italic prompt so the click
// target is obvious even when nothing is written yet.
// -----------------------------------------------------------------------------

function EditableScope({
  scope,
  onSave,
}: {
  scope: string | null;
  onSave: (
    next: string | null
  ) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(scope ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!editing) setDraft(scope ?? '');
  }, [scope, editing]);

  async function commit() {
    const trimmed = draft.trim();
    const next = trimmed === '' ? null : trimmed;
    if (next === (scope ?? null)) {
      setEditing(false);
      setError('');
      return;
    }
    setSaving(true);
    const result = await onSave(next);
    setSaving(false);
    if (result.ok) {
      setEditing(false);
      setError('');
    } else {
      setError(result.error ?? 'Save failed');
    }
  }

  function cancel() {
    setDraft(scope ?? '');
    setError('');
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="mt-1.5">
        <textarea
          autoFocus
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            if (error) setError('');
          }}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.blur();
            } else if (e.key === 'Escape') {
              cancel();
            }
          }}
          disabled={saving}
          rows={2}
          placeholder="Description…"
          className="w-full max-w-lg rounded border border-[var(--brand-orange)] px-2 py-1.5 text-sm font-sans focus:outline-none disabled:opacity-60 resize-y min-h-[3rem]"
        />
        <div className="mt-0.5 text-[11px] text-[var(--text-muted)] italic">
          Enter to save · Shift+Enter for a new line · Esc to cancel
        </div>
        {error && (
          <div className="text-xs text-[var(--over)] mt-1 inline-flex items-center gap-1">
            <AlertCircle className="h-3.5 w-3.5" strokeWidth={2.5} />
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        setEditing(true);
      }}
      title="Click to edit description"
      className="mt-1.5 block text-left text-sm text-[var(--text-muted)] font-sans max-w-md hover:text-[var(--text)] hover:bg-[var(--surface-2)] rounded px-1.5 -mx-1.5 py-0.5 -my-0.5 transition-colors w-full"
    >
      {scope ?? (
        <span className="italic text-[var(--text-muted)]/70">
          Click to add description
        </span>
      )}
    </button>
  );
}

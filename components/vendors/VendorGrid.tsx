'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { CheckCircle2, XCircle, ArrowUpRight, Building2 } from 'lucide-react';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/Primitives';
import { formatMoney } from '@/lib/money';
import type { VendorSummary } from '@/lib/vendors';

/* --------------------------------------------------------------------------
   Deterministic accent colour per vendor — a subtle badge tint so cards read
   like "portraits" of each vendor at a glance rather than an anonymous grid.
   -------------------------------------------------------------------------- */
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

export function VendorGrid({ vendors }: { vendors: VendorSummary[] }) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return vendors;
    return vendors.filter(
      (v) =>
        v.vendor_display_name.toLowerCase().includes(q) ||
        v.vendor_legal_name.toLowerCase().includes(q) ||
        v.pos.some((p) => p.po_number.toLowerCase().includes(q))
    );
  }, [vendors, search]);

  const grandTotals = useMemo(
    () => ({
      committed: vendors.reduce((s, v) => s + v.total_committed, 0),
      lem: vendors.reduce((s, v) => s + v.total_lem, 0),
      atRisk: vendors.reduce((s, v) => s + v.total_pending_value, 0),
    }),
    [vendors]
  );

  return (
    <PageContainer>
      <div className="space-y-6">
        <PageHeader
          title="Vendors"
          subtitle={
            <>
              <span className="tabular font-medium text-[var(--text)]">{vendors.length}</span> vendors ·{' '}
              <span className="tabular font-medium text-[var(--text)]">
                {formatMoney(grandTotals.committed)}
              </span>{' '}
              committed ·{' '}
              <span className="tabular font-medium text-[var(--text)]">
                {formatMoney(grandTotals.lem)}
              </span>{' '}
              LEM-to-date{grandTotals.atRisk > 0 && (
                <>
                  {' '}·{' '}
                  <span className="tabular font-medium text-[var(--over)]">
                    {formatMoney(grandTotals.atRisk)}
                  </span>{' '}
                  at risk
                </>
              )}
            </>
          }
        />

        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by vendor name or PO number"
            className="w-full bg-transparent text-sm placeholder:text-[var(--text-muted)] focus:outline-none"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-12 text-center">
            <Building2 className="w-8 h-8 mx-auto text-[var(--text-muted)]/40 mb-3" />
            <p className="text-sm font-medium text-[var(--text)]">
              {vendors.length === 0
                ? 'No vendors on file yet.'
                : 'No vendors match that search.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((v) => (
              <VendorCard key={v.slug} vendor={v} />
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  );
}

function VendorCard({ vendor }: { vendor: VendorSummary }) {
  const pctUsed =
    vendor.total_committed > 0
      ? (vendor.total_lem / vendor.total_committed) * 100
      : 0;
  const accent = accentFor(vendor.vendor_display_name);
  const barTone =
    pctUsed > 100
      ? 'bg-[var(--over)]'
      : pctUsed > 80
        ? 'bg-[var(--warn)]'
        : 'bg-[var(--under)]';

  return (
    <Link
      href={`/vendors?v=${encodeURIComponent(vendor.slug)}`}
      className="group flex flex-col rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 hover:border-[var(--text)]/25 hover:shadow-[0_4px_20px_-8px_rgba(0,0,0,0.15)] transition-all"
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-5">
        <div
          className="shrink-0 w-11 h-11 rounded-lg flex items-center justify-center text-sm font-semibold tabular"
          style={{ background: accent.bg, color: accent.fg }}
        >
          {initials(vendor.vendor_display_name)}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-[var(--text)] tracking-tight leading-tight truncate">
            {vendor.vendor_display_name}
          </h3>
          <p className="text-[11px] text-[var(--text-muted)] truncate mt-0.5">
            {vendor.vendor_legal_name}
          </p>
        </div>
        <span className="shrink-0 tabular text-[11px] font-medium text-[var(--text-muted)] bg-[var(--surface-2)] px-2 py-0.5 rounded">
          {vendor.po_count} PO{vendor.po_count === 1 ? '' : 's'}
        </span>
      </div>

      {/* Committed */}
      <div className="mb-5">
        <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-semibold">
          Total Committed
        </div>
        <div className="text-[26px] font-semibold tabular tracking-tight leading-tight mt-1 text-[var(--text)]">
          {formatMoney(vendor.total_committed)}
        </div>
      </div>

      {/* LEM + progress */}
      <div className="mb-5">
        <div className="flex items-baseline justify-between text-[11px] mb-1.5">
          <span className="text-[var(--text-muted)] uppercase tracking-wider font-semibold">
            LEM-to-Date
          </span>
          <span className="tabular font-medium text-[var(--text)]">
            {formatMoney(vendor.total_lem)}{' '}
            <span className="text-[var(--text-muted)]">
              · {pctUsed.toFixed(1)}%
            </span>
          </span>
        </div>
        <div className="flex h-1.5 overflow-hidden rounded-full bg-[var(--surface-2)]">
          <div
            className={`h-full transition-all ${barTone}`}
            style={{ width: `${Math.min(pctUsed, 100)}%` }}
          />
          {pctUsed > 100 && (
            <div
              className="h-full bg-[var(--over)] opacity-60"
              style={{ width: `${Math.min(pctUsed - 100, 100)}%` }}
            />
          )}
        </div>
      </div>

      {/* Footer stats */}
      <div className="mt-auto pt-4 border-t border-[var(--border)] flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          {vendor.ticket_count === 0 ? (
            <span className="text-[var(--text-muted)]">No tickets yet</span>
          ) : (
            <>
              <span className="inline-flex items-center gap-1 text-[var(--under)] font-medium tabular">
                <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.5} />
                {vendor.approved_count}
              </span>
              <span className="inline-flex items-center gap-1 text-[var(--over)] font-medium tabular">
                <XCircle className="h-3.5 w-3.5" strokeWidth={2.5} />
                {vendor.pending_count}
              </span>
              {vendor.total_pending_value > 0 && (
                <span className="tabular text-[var(--over)] font-medium">
                  {formatMoney(vendor.total_pending_value)}{' '}
                  <span className="text-[var(--text-muted)] font-normal">
                    at risk
                  </span>
                </span>
              )}
            </>
          )}
        </div>
        <span className="inline-flex items-center gap-0.5 text-[var(--text-muted)] group-hover:text-[var(--text)] transition-colors">
          Open
          <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2.25} />
        </span>
      </div>
    </Link>
  );
}

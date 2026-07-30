'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ChevronRight,
  AlertTriangle,
  Clock,
  Search,
  X,
} from 'lucide-react';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader, StatTile, Card } from '@/components/ui/Primitives';
import { formatMoney } from '@/lib/money';
import type {
  UnapprovedData,
  UnapprovedPo,
  UnapprovedTicket,
  UnapprovedVendor,
} from '@/lib/unapproved';

// Same deterministic accent palette used everywhere else so a vendor's
// colour stays consistent across Vendors grid, Forecast, and here.
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

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function UnapprovedView({ data }: { data: UnapprovedData }) {
  const [search, setSearch] = useState('');
  const [expandedVendors, setExpandedVendors] = useState<Set<string>>(
    new Set(data.vendors.map((v) => v.vendor_display_name))
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data.vendors;
    return data.vendors
      .map((v) => {
        const matchesVendor =
          v.vendor_display_name.toLowerCase().includes(q) ||
          v.vendor_legal_name.toLowerCase().includes(q);
        const pos = v.pos
          .map((p) => {
            const matchesPo =
              p.po_number.toLowerCase().includes(q) ||
              (p.scope ?? '').toLowerCase().includes(q) ||
              (p.vendor_job_ref ?? '').toLowerCase().includes(q);
            const tix = p.tickets.filter((t) =>
              t.ticket_number.toLowerCase().includes(q)
            );
            if (matchesVendor || matchesPo) return p;
            if (tix.length > 0)
              return { ...p, tickets: tix, ticket_count: tix.length };
            return null;
          })
          .filter((p): p is UnapprovedPo => p !== null);
        if (matchesVendor || pos.length > 0) return { ...v, pos };
        return null;
      })
      .filter((v): v is UnapprovedVendor => v !== null);
  }, [data.vendors, search]);

  const filtersActive = !!search;

  function toggleVendor(name: string) {
    setExpandedVendors((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function expandAll() {
    setExpandedVendors(new Set(filtered.map((v) => v.vendor_display_name)));
  }
  function collapseAll() {
    setExpandedVendors(new Set());
  }
  const allExpanded = filtered.every((v) =>
    expandedVendors.has(v.vendor_display_name)
  );

  const oldestDays = useMemo(() => {
    if (!data.totals.oldest_ticket_date) return 0;
    const [y, m, d] = data.totals.oldest_ticket_date.split('-').map(Number);
    if (!y || !m || !d) return 0;
    const then = new Date(y, m - 1, d);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return Math.round(
      (now.getTime() - then.getTime()) / (24 * 60 * 60 * 1000)
    );
  }, [data.totals.oldest_ticket_date]);

  return (
    <PageContainer>
      <div className="space-y-6">
        <PageHeader
          title="Unapproved Tickets"
          subtitle={
            <>
              Every ticket currently at{' '}
              <span className="text-[var(--over)] font-medium">
                pending sign-off
              </span>
              . Grouped by vendor, then by PO, sorted by exposure. Approval
              only lands from an Aimsio CSV import or a signed-PDF upload.
            </>
          }
        />

        {/* Summary tiles */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatTile
            label="Total Value at Risk"
            value={formatMoney(data.totals.at_risk)}
            sub={`${data.totals.ticket_count} ticket${data.totals.ticket_count === 1 ? '' : 's'} pending`}
            tone="over"
            emphasis
          />
          <StatTile
            label="Vendors Affected"
            value={String(data.totals.vendor_count)}
            sub={`across ${data.totals.po_count} PO${data.totals.po_count === 1 ? '' : 's'}`}
            tone="over"
          />
          <StatTile
            label="Oldest Pending"
            value={
              data.totals.oldest_ticket_date
                ? formatDate(data.totals.oldest_ticket_date)
                : '—'
            }
            sub={oldestDays > 0 ? `${oldestDays} days ago` : 'today'}
            tone={oldestDays > 30 ? 'over' : oldestDays > 14 ? 'warn' : 'neutral'}
          />
          <StatTile
            label="Avg per Ticket"
            value={
              data.totals.ticket_count > 0
                ? formatMoney(data.totals.at_risk / data.totals.ticket_count)
                : '—'
            }
            sub="mean value at risk"
          />
        </div>

        <Card>
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
                placeholder="Search vendor, PO, scope, or ticket #"
                className="flex-1 bg-transparent focus:outline-none text-sm placeholder:text-[var(--text-muted)]"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="text-[var(--text-muted)] hover:text-[var(--text)]"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            {filtered.length > 0 && (
              <button
                type="button"
                onClick={allExpanded ? collapseAll : expandAll}
                className="text-xs font-semibold text-[var(--brand-orange)] hover:opacity-80"
              >
                {allExpanded ? 'Collapse all' : 'Expand all'}
              </button>
            )}
            {filtersActive && (
              <button
                onClick={() => setSearch('')}
                className="inline-flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--text)]"
              >
                <X className="h-3.5 w-3.5" />
                Clear filters
              </button>
            )}
          </div>

          {filtered.length === 0 ? (
            <div className="px-5 py-14 text-center">
              {data.vendors.length === 0 ? (
                <>
                  <div className="inline-flex items-center gap-2 text-[var(--under)] mb-2">
                    <span className="text-2xl">✓</span>
                  </div>
                  <p className="text-base font-medium">
                    No unapproved tickets in the portal.
                  </p>
                  <p className="text-sm text-[var(--text-muted)] mt-1">
                    Every ticket has either landed at &ldquo;Approved by
                    Client/PM&rdquo; on Aimsio or was assumed approved on
                    upload.
                  </p>
                </>
              ) : (
                <p className="text-sm text-[var(--text-muted)]">
                  Nothing matches &ldquo;{search}&rdquo;. Clear the search to
                  see everything.
                </p>
              )}
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {filtered.map((v) => (
                <VendorAccordion
                  key={v.vendor_display_name}
                  vendor={v}
                  expanded={expandedVendors.has(v.vendor_display_name)}
                  onToggle={() => toggleVendor(v.vendor_display_name)}
                />
              ))}
            </div>
          )}
        </Card>
      </div>
    </PageContainer>
  );
}

function VendorAccordion({
  vendor,
  expanded,
  onToggle,
}: {
  vendor: UnapprovedVendor;
  expanded: boolean;
  onToggle: () => void;
}) {
  const accent = accentFor(vendor.vendor_display_name);
  const oldestDays = vendor.oldest_ticket_date
    ? (() => {
        const [y, m, d] = vendor.oldest_ticket_date!.split('-').map(Number);
        if (!y || !m || !d) return 0;
        const then = new Date(y, m - 1, d);
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        return Math.round(
          (now.getTime() - then.getTime()) / (24 * 60 * 60 * 1000)
        );
      })()
    : 0;

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-5 py-4 flex items-center justify-between gap-4 hover:bg-[var(--surface-2)]/70 transition-colors text-left"
        style={{
          background: `linear-gradient(to right, ${accent.bg}44 0%, ${accent.bg}18 45%, transparent 100%)`,
        }}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <ChevronRight
            className={`h-4 w-4 text-[var(--text-muted)] shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`}
            strokeWidth={2.5}
          />
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-semibold shrink-0"
            style={{ background: accent.bg, color: accent.fg }}
          >
            {initials(vendor.vendor_display_name)}
          </div>
          <div className="min-w-0">
            <Link
              href={`/vendors?v=${encodeURIComponent(vendor.slug)}`}
              onClick={(e) => e.stopPropagation()}
              className="text-base font-semibold text-[var(--text)] leading-tight hover:text-[var(--brand-orange)] hover:underline underline-offset-2 decoration-2 transition-colors"
            >
              {vendor.vendor_display_name}
            </Link>
            <div className="text-xs text-[var(--text-muted)] tabular mt-0.5">
              {vendor.po_count} PO{vendor.po_count === 1 ? '' : 's'} ·{' '}
              {vendor.ticket_count} ticket
              {vendor.ticket_count === 1 ? '' : 's'} · oldest{' '}
              {formatDate(vendor.oldest_ticket_date)}
              {oldestDays > 30 && (
                <span className="ml-1 text-[var(--over)] font-medium">
                  ({oldestDays}d)
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-lg font-semibold tabular text-[var(--over)]">
            {formatMoney(vendor.at_risk)}
          </div>
          <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-semibold">
            at risk
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-[var(--border)] bg-[var(--surface-2)]/20">
          <div className="px-5 py-4 space-y-3">
            {vendor.pos.map((po) => (
              <PoBlock key={po.id} po={po} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PoBlock({ po }: { po: UnapprovedPo }) {
  const burn = po.committed > 0 ? (po.lem / po.committed) * 100 : 0;
  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--border)] flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/tickets?po=${encodeURIComponent(po.po_number)}`}
              className="font-mono text-sm font-semibold tracking-wide uppercase text-[var(--text)] hover:text-[var(--brand-orange)] hover:underline underline-offset-2 decoration-2 transition-colors"
              title={`View every ticket logged against ${po.po_number}`}
            >
              {po.po_number}
            </Link>
            {po.vendor_job_ref && (
              <span
                className="font-mono text-[10px] font-semibold tracking-wide uppercase text-[var(--text-muted)] bg-[var(--surface-2)] border border-[var(--border)] px-1.5 py-0.5 rounded"
                title="Vendor's own job number"
              >
                {po.vendor_job_ref}
              </span>
            )}
            {po.ewp_tracked && (
              <span
                className="inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider bg-[var(--amber)] text-[var(--text)]"
                title="Tracked by EWP on the Ticket Map"
              >
                EWP
              </span>
            )}
          </div>
          {po.scope && (
            <p className="text-xs text-[var(--text)]/85 mt-1 max-w-xl">
              {po.scope}
            </p>
          )}
          <div className="text-[11px] text-[var(--text-muted)] mt-1 tabular">
            LEM {formatMoney(po.lem)} of {formatMoney(po.committed)} committed
            {po.committed > 0 && <> · {burn.toFixed(1)}% burn</>}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-base font-semibold tabular text-[var(--over)]">
            {formatMoney(po.at_risk)}
          </div>
          <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-semibold">
            {po.ticket_count} ticket{po.ticket_count === 1 ? '' : 's'} pending
          </div>
        </div>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]/30">
            <th className="px-3 py-2 text-left text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-medium">
              Ticket
            </th>
            <th className="px-3 py-2 text-left text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-medium">
              Date
            </th>
            <th className="px-3 py-2 text-left text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-medium">
              Status
            </th>
            <th className="px-3 py-2 text-right text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-medium">
              Age
            </th>
            <th className="px-3 py-2 text-right text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-medium">
              Billable
            </th>
          </tr>
        </thead>
        <tbody>
          {po.tickets.map((t) => (
            <TicketRow key={t.id} ticket={t} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TicketRow({ ticket }: { ticket: UnapprovedTicket }) {
  const ageTone =
    ticket.days_old > 30
      ? 'text-[var(--over)] font-semibold'
      : ticket.days_old > 14
        ? 'text-[var(--warn)] font-medium'
        : 'text-[var(--text-muted)]';
  const statusLabel = ticket.approval_status ?? 'no approval record';
  return (
    <tr className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)]/40">
      <td className="px-3 py-2 font-mono text-xs">{ticket.ticket_number}</td>
      <td className="px-3 py-2 text-xs text-[var(--text-muted)] tabular">
        {formatDate(ticket.ticket_date)}
      </td>
      <td className="px-3 py-2">
        <span className="inline-flex items-center rounded border border-[var(--over)] bg-[var(--over-bg)] text-[var(--over)] text-[10px] font-medium px-1.5 py-0.5">
          {statusLabel}
        </span>
      </td>
      <td className={`px-3 py-2 text-right tabular text-xs ${ageTone}`}>
        {ticket.days_old === 0
          ? 'today'
          : ticket.days_old === 1
            ? '1 day'
            : `${ticket.days_old} days`}
      </td>
      <td className="px-3 py-2 text-right tabular text-sm font-medium">
        {formatMoney(ticket.face_value)}
      </td>
    </tr>
  );
}

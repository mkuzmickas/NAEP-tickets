'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, XCircle, Plus, Printer } from 'lucide-react';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader, StatTile, Card } from '@/components/ui/Primitives';
import { AddPoDialog } from '@/components/vendors/AddPoDialog';
import { PrintVendorReport } from '@/components/vendors/PrintVendorReport';
import { formatMoney, formatPct } from '@/lib/money';
import type { PoWithTickets, TicketBrief, VendorSummary } from '@/lib/vendors';
import { EWP_LABEL } from '@/lib/ewp/ticket-ewp';

export function VendorDetail({ vendor }: { vendor: VendorSummary }) {
  const [addPoOpen, setAddPoOpen] = useState(false);
  const pctUsed =
    vendor.total_committed > 0
      ? (vendor.total_lem / vendor.total_committed) * 100
      : 0;
  const pctApproved =
    vendor.ticket_count > 0
      ? Math.round((vendor.approved_count / vendor.ticket_count) * 100)
      : 0;

  return (
    <>
    <div className="no-print h-full">
    <PageContainer>
      <div className="space-y-6">
        <div>
          <Link
            href="/vendors"
            className="inline-flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--text)] mb-2 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.25} />
            All vendors
          </Link>
          <PageHeader
            title={vendor.vendor_display_name}
            subtitle={
              <>
                {vendor.vendor_legal_name} ·{' '}
                <span className="tabular">{vendor.po_count} PO{vendor.po_count === 1 ? '' : 's'}</span> ·{' '}
                <span className="tabular">{vendor.ticket_count} ticket{vendor.ticket_count === 1 ? '' : 's'}</span>
              </>
            }
            action={
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--text-muted)]/40 transition-colors"
                  title="Print a light, greyscale-safe snapshot of this vendor's POs and tickets"
                >
                  <Printer className="h-4 w-4" strokeWidth={2.5} />
                  Print report
                </button>
                <button
                  type="button"
                  onClick={() => setAddPoOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-md bg-[var(--brand-orange)] text-white px-4 py-2 text-sm font-semibold hover:opacity-90"
                >
                  <Plus className="h-4 w-4" strokeWidth={2.5} />
                  Add PO
                </button>
              </div>
            }
          />
        </div>

        {addPoOpen && <AddPoDialog onClose={() => setAddPoOpen(false)} />}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatTile
            label="Total Committed"
            value={formatMoney(vendor.total_committed)}
            sub={`${vendor.po_count} PO${vendor.po_count === 1 ? '' : 's'} on file`}
          />
          <StatTile
            label="LEM-to-Date"
            value={formatMoney(vendor.total_lem)}
            sub={`${pctUsed.toFixed(1)}% of commitment`}
            emphasis
          />
          <StatTile
            label="Forecast at Completion"
            value={formatMoney(vendor.total_forecast)}
            sub={
              vendor.forecasted_po_count === 0
                ? `0 of ${vendor.po_count} POs forecasted`
                : `${vendor.forecasted_po_count} of ${vendor.po_count} POs · ${vendor.total_forecast - vendor.total_committed >= 0 ? '+' : ''}${formatMoney(vendor.total_forecast - vendor.total_committed)} vs committed`
            }
            tone={
              vendor.total_forecast - vendor.total_committed > 0.5
                ? 'over'
                : vendor.total_forecast - vendor.total_committed < -0.5
                  ? 'under'
                  : 'neutral'
            }
          />
          <StatTile
            label="Approved by Enbridge"
            value={String(vendor.approved_count)}
            sub={`${pctApproved}% of ${vendor.ticket_count} tickets`}
            tone="under"
          />
          <StatTile
            label="Value at Risk"
            value={formatMoney(vendor.total_pending_value)}
            sub={`${vendor.pending_count} pending sign-off`}
            tone="over"
          />
        </div>

        <div className="space-y-4">
          {vendor.pos.map((po) => (
            <VendorPoCard key={po.id} po={po} />
          ))}
        </div>
      </div>
    </PageContainer>
    </div>
    <PrintVendorReport vendor={vendor} />
    </>
  );
}

function VendorPoCard({ po }: { po: PoWithTickets }) {
  const total = po.tickets.length;
  // Coloring rule matches Ticket Map: approved = client-side sign-off
  // (Aimsio "Approved by Client/PM"). Everything else — pending, Sent to
  // Client via Portal, See Notes, blank — reads red.
  const approved = po.tickets.filter((t) => t.approved).length;
  const pending = total - approved;
  const pctApp = total > 0 ? Math.round((approved / total) * 100) : 0;
  const pctUsed = po.committed > 0 ? (po.lem / po.committed) * 100 : 0;

  // Approval status is only set by (1) an Aimsio CSV import (reads
  // "Approved by Client/PM" from the vendor's own tracker) or (2)
  // uploading a signed PDF whose Aitken Creek stamp block the parser
  // verifies. No casual bulk-approve from this card.

  const pctTone =
    pctUsed > 100
      ? 'text-[var(--over)] bg-[var(--over-bg)]'
      : pctUsed > 80
        ? 'text-[var(--warn)] bg-[var(--warn-bg)]'
        : 'text-[var(--text-muted)] bg-[var(--surface-2)]';

  return (
    <Card>
      {/* Header */}
      <div className="px-6 py-5 border-b border-[var(--border)] flex items-start justify-between gap-4 flex-wrap">
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
                className="inline-flex items-center rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-[var(--amber)] text-[var(--text)]"
                title="This PO is broken down by EWP on the Ticket Map"
              >
                Tracked by EWP
              </span>
            )}
          </div>
          {po.project_cost_code && (
            <div className="font-mono text-[10px] text-[var(--text-muted)] mt-0.5">
              {po.project_cost_code}
            </div>
          )}
          <p className="text-sm text-[var(--text)]/85 mt-2 max-w-xl">
            {po.scope ?? (
              <span className="italic text-[var(--text-muted)]">
                No description
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <div
            className={`text-xs font-semibold tabular px-2.5 py-1 rounded ${pctTone}`}
          >
            {formatPct(pctUsed)}
          </div>
          {total > 0 && (
            <div className="flex items-center gap-3 text-xs">
              <span className="inline-flex items-center gap-1 text-[var(--under)] font-medium tabular">
                <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.5} />
                {approved}
              </span>
              <span className="inline-flex items-center gap-1 text-[var(--over)] font-medium tabular">
                <XCircle className="h-3.5 w-3.5" strokeWidth={2.5} />
                {pending}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Money strip */}
      <div className="px-6 py-4 grid grid-cols-2 md:grid-cols-4 gap-6 border-b border-[var(--border)]">
        <MoneyStat label="Committed" value={po.committed} />
        <MoneyStat label="LEM-to-Date" value={po.lem} />
        <ForecastStat
          fac={po.forecast}
          committed={po.committed}
          pct={po.percent_complete}
        />
        <MoneyStat
          label="Remaining"
          value={po.committed - po.lem}
          tone={po.committed - po.lem < 0 ? 'over' : undefined}
        />
      </div>

      {/* Approval progress — bar only, no bulk-approve action. */}
      {total > 0 && (
        <div className="px-6 pt-4">
          <div className="flex h-1.5 rounded-full overflow-hidden bg-[var(--over-bg)]">
            <div
              className="h-full bg-[var(--under)] transition-all"
              style={{ width: `${pctApp}%` }}
            />
          </div>
          <div className="mt-1.5 text-[11px] text-[var(--text-muted)] tabular">
            {pctApp}% approved · {approved} of {total} · {formatMoney(po.lem)} logged
          </div>
        </div>
      )}

      {/* Ticket chips — flat grid for most POs, EWP sub-buckets for
          those flagged as broken-down (2001285 today). Matches the
          Ticket Map's rendering pattern so the two views agree. */}
      <div className="px-6 py-5">
        {total === 0 ? (
          <p className="text-xs italic text-[var(--text-muted)]">
            No tickets on file yet.
          </p>
        ) : po.is_ewp_broken_down ? (
          <div className="space-y-3">
            {bucketVendorTicketsByEwp(po.tickets).map((bucket) => (
              <EwpBucket
                key={bucket.kind + '-' + (bucket.ewp_no ?? 'x')}
                bucket={bucket}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {po.tickets.map((t) => (
              <TicketChip key={t.id} ticket={t} />
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

// EWP-bucket types + helpers, mirroring lib/ticketMap.shared.ts but scoped
// to TicketBrief so we don't have to widen the vendor lib to MapTicket.
type VendorEwpBucket = {
  kind: 'ewp' | 'multiple' | 'unassigned';
  ewp_no: number | null;
  title: string;
  tickets: TicketBrief[];
  count: number;
  sum_billable: number;
};

function bucketVendorTicketsByEwp(
  tickets: TicketBrief[]
): VendorEwpBucket[] {
  const byEwp = new Map<number, TicketBrief[]>();
  const multiple: TicketBrief[] = [];
  const unassigned: TicketBrief[] = [];

  for (const t of tickets) {
    if (t.is_multiple_ewp) {
      multiple.push(t);
    } else if (t.ewp_no == null) {
      unassigned.push(t);
    } else {
      const arr = byEwp.get(t.ewp_no) ?? [];
      arr.push(t);
      byEwp.set(t.ewp_no, arr);
    }
  }

  const buckets: VendorEwpBucket[] = Array.from(byEwp.entries())
    .sort(([a], [b]) => a - b)
    .map(([ewp, ts]) => ({
      kind: 'ewp' as const,
      ewp_no: ewp,
      title: EWP_LABEL[ewp] ?? `EWP ${ewp}`,
      tickets: ts,
      count: ts.length,
      sum_billable: ts.reduce((s, t) => s + t.face_value, 0),
    }));

  if (multiple.length > 0) {
    buckets.push({
      kind: 'multiple',
      ewp_no: null,
      title: 'Multiple EWPs',
      tickets: multiple,
      count: multiple.length,
      sum_billable: multiple.reduce((s, t) => s + t.face_value, 0),
    });
  }
  if (unassigned.length > 0) {
    buckets.push({
      kind: 'unassigned',
      ewp_no: null,
      title: 'Unassigned to EWP',
      tickets: unassigned,
      count: unassigned.length,
      sum_billable: unassigned.reduce((s, t) => s + t.face_value, 0),
    });
  }

  return buckets;
}

function EwpBucket({ bucket }: { bucket: VendorEwpBucket }) {
  const leftBorderCls =
    bucket.kind === 'unassigned'
      ? 'border-l-[var(--warn)]'
      : bucket.kind === 'multiple'
        ? 'border-l-[var(--brand-orange)]'
        : 'border-l-[var(--amber)]';
  const outerBorderCls =
    bucket.kind === 'unassigned'
      ? 'border-[var(--warn)]/30'
      : bucket.kind === 'multiple'
        ? 'border-[var(--brand-orange)]/30'
        : 'border-[var(--border)]';

  return (
    <div
      className={`rounded-md border ${outerBorderCls} bg-[var(--surface)] overflow-hidden`}
    >
      <div
        className={`flex items-center justify-between gap-3 px-4 py-2.5 border-l-4 ${leftBorderCls} border-b border-b-[var(--border)]`}
      >
        <div className="min-w-0">
          {bucket.kind === 'unassigned' ? (
            <span className="font-semibold text-sm text-[var(--warn)]">
              Unassigned to EWP
            </span>
          ) : bucket.kind === 'multiple' ? (
            <>
              <span className="font-semibold text-sm text-[var(--brand-orange)]">
                Multiple EWPs
              </span>
              <span className="ml-2 text-xs text-[var(--text-muted)]">
                Ticket spans more than one EWP
              </span>
            </>
          ) : (
            <>
              <span className="font-semibold text-sm text-[var(--text)]">
                EWP #{bucket.ewp_no}
              </span>
              <span className="ml-2 text-xs text-[var(--text-muted)]">
                {bucket.title}
              </span>
            </>
          )}
        </div>
        <div className="text-xs tabular text-[var(--text-muted)] shrink-0">
          {bucket.count} · {formatMoney(bucket.sum_billable)}
        </div>
      </div>
      {bucket.kind === 'unassigned' && (
        <div className="px-4 pt-2.5 text-[11px] text-[var(--warn)] font-medium">
          ⚠ No WTP number yet.
        </div>
      )}
      <div className="px-4 py-3 flex flex-wrap gap-1.5">
        {bucket.tickets.map((t) => (
          <TicketChip key={t.id} ticket={t} />
        ))}
      </div>
    </div>
  );
}

function ForecastStat({
  fac,
  committed,
  pct,
}: {
  fac: number | null;
  committed: number;
  pct: number | null;
}) {
  if (fac == null) {
    return (
      <div>
        <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-semibold">
          Forecast
        </div>
        <div className="tabular text-lg font-semibold mt-1 tracking-tight text-[var(--text-muted)]/60">
          —
        </div>
        <div className="text-[10px] text-[var(--text-muted)] mt-0.5 italic">
          Enter % complete on Forecast page
        </div>
      </div>
    );
  }
  const delta = fac - committed;
  const tone =
    delta > 0.5
      ? 'text-[var(--over)]'
      : delta < -0.5
        ? 'text-[var(--under)]'
        : 'text-[var(--text)]';
  const deltaTone =
    delta > 0.5
      ? 'text-[var(--over)]'
      : delta < -0.5
        ? 'text-[var(--under)]'
        : 'text-[var(--text-muted)]';
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-semibold">
        Forecast
      </div>
      <div className={`tabular text-lg font-semibold mt-1 tracking-tight ${tone}`}>
        {formatMoney(fac)}
      </div>
      <div className={`text-[10px] mt-0.5 tabular ${deltaTone}`}>
        {pct != null && (
          <span className="text-[var(--text-muted)]">
            {pct}% ·{' '}
          </span>
        )}
        {delta >= 0 ? '+' : ''}
        {formatMoney(delta)}
      </div>
    </div>
  );
}

function MoneyStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: 'over' | 'under' | 'warn';
}) {
  const cls =
    tone === 'over'
      ? 'text-[var(--over)]'
      : tone === 'under'
        ? 'text-[var(--under)]'
        : tone === 'warn'
          ? 'text-[var(--warn)]'
          : 'text-[var(--text)]';
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-semibold">
        {label}
      </div>
      <div className={`tabular text-lg font-semibold mt-1 tracking-tight ${cls}`}>
        {formatMoney(value)}
      </div>
    </div>
  );
}

function TicketChip({ ticket }: { ticket: TicketBrief }) {
  const router = useRouter();
  // Colour by client-side approval, not internal invoicing state — a
  // ticket sitting at 'invoiced' with approval_status = 'Sent to Client
  // via Portal' still isn't approved by the client and shouldn't render
  // green. Matches Ticket Map exactly.
  const cls = ticket.approved
    ? 'border-[var(--under)] bg-[var(--under-bg)] text-[var(--under)] hover:brightness-95'
    : 'border-[var(--over)] bg-[var(--over-bg)] text-[var(--over)] hover:brightness-95';
  const approvalNote = ticket.approval_status ?? 'no approval record';
  const label = ticket.ticket_number_short || ticket.ticket_number;
  return (
    <button
      onClick={() =>
        router.push(
          `/tickets?search=${encodeURIComponent(ticket.ticket_number)}`
        )
      }
      title={`${ticket.ticket_number} · ${ticket.ticket_date} · ${formatMoney(ticket.face_value)} · ${approvalNote}`}
      className={`tabular rounded border px-1.5 py-1 text-[0.7rem] font-medium ${cls}`}
    >
      {label}
    </button>
  );
}

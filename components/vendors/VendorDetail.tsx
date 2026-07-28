'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, XCircle, Plus, Check } from 'lucide-react';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader, StatTile, Card } from '@/components/ui/Primitives';
import { AddPoDialog } from '@/components/vendors/AddPoDialog';
import { formatMoney, formatPct } from '@/lib/money';
import type { PoWithTickets, TicketBrief, VendorSummary } from '@/lib/vendors';

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
              <button
                onClick={() => setAddPoOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-md bg-[var(--brand-orange)] text-white px-4 py-2 text-sm font-semibold hover:opacity-90"
              >
                <Plus className="h-4 w-4" strokeWidth={2.5} />
                Add PO
              </button>
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
  );
}

function VendorPoCard({ po }: { po: PoWithTickets }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const total = po.tickets.length;
  const approved = po.tickets.filter((t) => t.status === 'invoiced').length;
  const pending = total - approved;
  const pendingIds = po.tickets
    .filter((t) => t.status === 'pending')
    .map((t) => t.id);
  const pctApp = total > 0 ? Math.round((approved / total) * 100) : 0;
  const pctUsed = po.committed > 0 ? (po.lem / po.committed) * 100 : 0;

  async function approveAllPending() {
    if (pendingIds.length === 0 || busy) return;
    const ok = window.confirm(
      `Mark ${pendingIds.length} pending ticket${pendingIds.length === 1 ? '' : 's'} on ${po.po_number} as approved by Enbridge?`
    );
    if (!ok) return;
    setBusy(true);
    const results = await Promise.allSettled(
      pendingIds.map((id) =>
        fetch(`/api/tickets/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'invoiced' }),
        }).then((r) => {
          if (!r.ok) throw new Error(`Failed (${r.status})`);
          return r;
        })
      )
    );
    const failed = results.filter((r) => r.status === 'rejected').length;
    if (failed > 0) {
      alert(`${failed} of ${pendingIds.length} tickets failed to update. Try again.`);
    }
    router.refresh();
    setBusy(false);
  }

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

      {/* Approval progress */}
      {total > 0 && (
        <div className="px-6 pt-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 flex h-1.5 rounded-full overflow-hidden bg-[var(--over-bg)]">
              <div
                className="h-full bg-[var(--under)] transition-all"
                style={{ width: `${pctApp}%` }}
              />
            </div>
            {pending > 0 && (
              <button
                onClick={approveAllPending}
                disabled={busy}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--under)] hover:text-[var(--surface)] hover:bg-[var(--under)] border border-[var(--under)] rounded-md px-2 py-1 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                title="Flip every pending ticket on this PO to invoiced/approved"
              >
                <Check className="h-3 w-3" strokeWidth={3} />
                {busy ? 'Approving…' : `Approve all ${pending}`}
              </button>
            )}
          </div>
          <div className="mt-1.5 text-[11px] text-[var(--text-muted)] tabular">
            {pctApp}% approved · {approved} of {total} · {formatMoney(po.lem)} logged
          </div>
        </div>
      )}

      {/* Ticket chips */}
      <div className="px-6 py-5">
        {total === 0 ? (
          <p className="text-xs italic text-[var(--text-muted)]">
            No tickets on file yet.
          </p>
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
  const cls =
    ticket.status === 'invoiced'
      ? 'border-[var(--under)] bg-[var(--under-bg)] text-[var(--under)] hover:brightness-95'
      : 'border-[var(--over)] bg-[var(--over-bg)] text-[var(--over)] hover:brightness-95';
  return (
    <button
      onClick={() =>
        router.push(
          `/tickets?search=${encodeURIComponent(ticket.ticket_number)}`
        )
      }
      title={`${ticket.ticket_number} · ${ticket.ticket_date} · ${formatMoney(ticket.face_value)} · ${ticket.status}`}
      className={`tabular rounded border px-1.5 py-1 text-[0.7rem] font-medium ${cls}`}
    >
      {ticket.ticket_number}
    </button>
  );
}

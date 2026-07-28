'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { CheckCircle2, XCircle, Printer, ExternalLink } from 'lucide-react';
import { PageContainer } from '@/components/ui/PageContainer';
import {
  PageHeader,
  StatTile,
  Card,
  EmptyState,
} from '@/components/ui/Primitives';
import { formatMoney } from '@/lib/money';
import {
  bucketTicketsByEwp,
  type MapEwpBucket,
  type MapPo,
  type MapTicket,
  type TicketMapData,
} from '@/lib/ticketMap.shared';
import { PrintUnapproved } from './PrintUnapproved';

// -----------------------------------------------------------------------------
// Top-level TicketMap
// -----------------------------------------------------------------------------

export function TicketMap({ data }: { data: TicketMapData }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // URL-driven filters so a view is a shareable link (spec §3.3).
  const approvalFilter: 'all' | 'not_approved' =
    searchParams.get('approval') === 'not_approved' ? 'not_approved' : 'all';
  const jobFilter = searchParams.get('job');

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(Array.from(searchParams.entries()));
    if (!value || value === 'all') next.delete(key);
    else next.set(key, value);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  // Apply filters. Tiles always show unfiltered totals; only the PO cards
  // and their chips narrow, so the "state of the world" numbers stay stable
  // regardless of how you're slicing the map.
  const visiblePos = useMemo<MapPo[]>(() => {
    return data.pos
      .filter((p) => !jobFilter || p.job_number === jobFilter)
      .map((p) => {
        if (approvalFilter === 'all') return p;
        const filtered = p.tickets.filter((t) => !t.approved);
        return {
          ...p,
          tickets: filtered,
          ticket_count: filtered.length,
          approved_count: 0,
          not_approved_count: filtered.length,
          total_billable: filtered.reduce((s, t) => s + t.face_value, 0),
          value_at_risk: filtered.reduce((s, t) => s + t.face_value, 0),
        };
      })
      // When "not approved only" is on, empty PO cards are just noise — drop
      // them. When "all" is on, keep empty POs so the map still lists them.
      .filter(
        (p) =>
          approvalFilter === 'all' ? true : p.tickets.length > 0
      );
  }, [data.pos, jobFilter, approvalFilter]);

  const pctApproved =
    data.totals.tickets > 0
      ? Math.round((data.totals.approved / data.totals.tickets) * 100)
      : 0;

  return (
    <>
      <div className="no-print">
        <PageContainer>
          <div className="space-y-6">
            <PageHeader
              title="Ticket Map"
          subtitle={
            <>
              Every field ticket, coloured by client approval status (
              <span className="text-[var(--under)] font-medium">
                Approved by Client/PM
              </span>{' '}
              = green).
            </>
          }
          action={
            <div className="flex items-center gap-2">
              <Link
                href="/vendors"
                className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--text-muted)]/40 transition-colors"
              >
                Vendor view
                <ExternalLink className="h-3.5 w-3.5" strokeWidth={2.25} />
              </Link>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 rounded-md bg-[var(--over)] text-white px-4 py-2 text-sm font-semibold hover:opacity-90"
                title="Prints a light, greyscale-safe PDF grouped by PO"
              >
                <Printer className="h-4 w-4" strokeWidth={2.5} />
                Print unapproved
              </button>
            </div>
          }
        />

        {/* Four summary tiles (§3.2) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatTile
            label="Tickets issued"
            value={String(data.totals.tickets)}
            sub={`across ${data.totals.jobs} job${data.totals.jobs === 1 ? '' : 's'}`}
          />
          <StatTile
            label="Approved by Client/PM"
            value={String(data.totals.approved)}
            sub={`${pctApproved}% approved & billable`}
            tone="under"
          />
          <StatTile
            label="Not yet approved"
            value={String(data.totals.not_approved)}
            sub="sent, on hold, or no record"
            tone="over"
            emphasis
          />
          <StatTile
            label="Value at risk"
            value={formatMoney(data.totals.value_at_risk)}
            sub="not yet billable"
            tone="over"
          />
        </div>

        {/* Legend + filter bar (§3.3) */}
        <Card>
          <div className="px-5 py-4 border-b border-[var(--border)] flex items-center gap-5 flex-wrap">
            <LegendChip tone="under">Approved by Client/PM</LegendChip>
            <LegendChip tone="over">Not yet approved — at risk</LegendChip>
          </div>
          <div className="p-5 space-y-3">
            <FilterRow label="Show">
              <FilterPill
                active={approvalFilter === 'all'}
                onClick={() => setParam('approval', null)}
              >
                All tickets
              </FilterPill>
              <FilterPill
                active={approvalFilter === 'not_approved'}
                tone="over"
                onClick={() => setParam('approval', 'not_approved')}
              >
                Not approved only
              </FilterPill>
            </FilterRow>
            {data.jobs.length > 1 && (
              <FilterRow label="Job">
                <FilterPill
                  active={!jobFilter}
                  onClick={() => setParam('job', null)}
                >
                  All jobs
                </FilterPill>
                {data.jobs.map((job) => (
                  <FilterPill
                    key={job}
                    active={jobFilter === job}
                    mono
                    onClick={() => setParam('job', job)}
                  >
                    {job}
                  </FilterPill>
                ))}
              </FilterRow>
            )}
          </div>
        </Card>

        {/* Per-PO cards (§3.4) */}
        {visiblePos.length === 0 ? (
          <Card>
            <EmptyState
              title="No tickets match the current filter."
              hint="Clear the filters above to see every PO card."
            />
          </Card>
        ) : (
          <div className="space-y-4">
            {visiblePos.map((po) => (
              <PoCard key={po.id} po={po} />
            ))}
          </div>
        )}

        {/* Footer note (§3.7) */}
        <p className="text-xs text-[var(--text-muted)] leading-relaxed max-w-3xl">
          Green tickets are <span className="text-[var(--under)] font-medium">Approved by Client/PM</span>
          {' '}and can be billed. Red tickets are not yet approved — sent to the client, on hold, or with no row in the export — and represent{' '}
          <span className="font-semibold text-[var(--over)]">
            {formatMoney(data.totals.value_at_risk)}
          </span>{' '}
          that cannot be invoiced until approval lands. Source: client Aimsio &ldquo;Office Approval Status&rdquo; export.
        </p>
          </div>
        </PageContainer>
      </div>
      <PrintUnapproved data={data} />
    </>
  );
}

// -----------------------------------------------------------------------------
// Legend + filter controls
// -----------------------------------------------------------------------------

function LegendChip({
  tone,
  children,
}: {
  tone: 'under' | 'over';
  children: React.ReactNode;
}) {
  const cls =
    tone === 'under'
      ? 'border-[var(--under)] bg-[var(--under-bg)]'
      : 'border-[var(--over)] bg-[var(--over-bg)]';
  return (
    <div className="inline-flex items-center gap-2 text-xs text-[var(--text-muted)]">
      <span className={`inline-block w-4 h-4 rounded border ${cls}`} />
      {children}
    </div>
  );
}

function FilterRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-semibold w-16 shrink-0">
        {label}
      </span>
      {children}
    </div>
  );
}

function FilterPill({
  children,
  active,
  tone,
  mono,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  tone?: 'over';
  mono?: boolean;
  onClick: () => void;
}) {
  const activeCls =
    tone === 'over'
      ? 'bg-[var(--over)] text-white border-[var(--over)]'
      : 'bg-[var(--brand-orange)] text-white border-[var(--brand-orange)]';
  const idleCls =
    'border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--text-muted)]/40';
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
        active ? activeCls : idleCls
      } ${mono ? 'font-mono' : ''}`}
    >
      {children}
    </button>
  );
}

// -----------------------------------------------------------------------------
// PO card + EWP sub-buckets + chip
// -----------------------------------------------------------------------------

function PoCard({ po }: { po: MapPo }) {
  const pctApproved =
    po.ticket_count > 0
      ? Math.round((po.approved_count / po.ticket_count) * 100)
      : 0;

  return (
    <Card>
      <div className="px-6 py-5 border-b border-[var(--border)]">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href={`/tickets?po=${encodeURIComponent(po.po_number)}`}
                className="font-mono text-sm font-semibold tracking-wide uppercase text-[var(--text)] hover:text-[var(--brand-orange)] hover:underline underline-offset-2 decoration-2 transition-colors"
              >
                {po.po_number}
              </Link>
              {po.ewp_tracked && (
                <span
                  className="inline-flex items-center rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-[var(--amber)] text-[var(--text)]"
                  title="This PO is broken down by EWP on the Ticket Map"
                >
                  Tracked by EWP
                </span>
              )}
            </div>
            {po.job_number && (
              <div className="font-mono text-[10px] text-[var(--text-muted)] mt-0.5">
                job {po.job_number}
              </div>
            )}
            {po.scope && (
              <p className="text-sm text-[var(--text)]/85 mt-2 max-w-xl">
                {po.scope}
              </p>
            )}
          </div>

          {po.ticket_count > 0 && (
            <div className="flex items-center gap-3 text-xs shrink-0">
              <span className="inline-flex items-center gap-1 text-[var(--under)] font-medium tabular">
                <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.5} />
                {po.approved_count}
              </span>
              <span className="inline-flex items-center gap-1 text-[var(--over)] font-medium tabular">
                <XCircle className="h-3.5 w-3.5" strokeWidth={2.5} />
                {po.not_approved_count}
              </span>
            </div>
          )}
        </div>

        {po.ticket_count > 0 && (
          <div className="mt-4">
            <div className="flex h-1.5 overflow-hidden rounded-full border border-[var(--over)]/40 bg-[var(--over-bg)]">
              <div
                className="h-full bg-[var(--under)]"
                style={{ width: `${pctApproved}%` }}
              />
            </div>
            <div className="mt-1.5 text-[11px] text-[var(--text-muted)] tabular">
              {pctApproved}% approved · {po.ticket_count} ticket
              {po.ticket_count === 1 ? '' : 's'}
              {po.value_at_risk > 0 && (
                <>
                  {' · '}
                  <span className="text-[var(--over)] font-medium">
                    {formatMoney(po.value_at_risk)} at risk
                  </span>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="px-6 py-5">
        {po.tickets.length === 0 ? (
          <p className="text-xs italic text-[var(--text-muted)]">
            No tickets on file yet.
          </p>
        ) : po.is_ewp_broken_down ? (
          <div className="space-y-3">
            {bucketTicketsByEwp(po.tickets).map((bucket) => (
              <EwpBucket
                key={bucket.ewp_no ?? 'unassigned'}
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

function EwpBucket({ bucket }: { bucket: MapEwpBucket }) {
  // Three visual variants:
  //   ewp        → amber accent, "EWP #N + title"
  //   multiple   → brand-orange accent, "Multiple EWPs + subtitle"
  //   unassigned → warn accent, "Unassigned to EWP" + warning line
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

function TicketChip({ ticket }: { ticket: MapTicket }) {
  const cls = ticket.approved
    ? 'border-[var(--under)] bg-[var(--under-bg)] text-[var(--under)]'
    : 'border-[var(--over)] bg-[var(--over-bg)] text-[var(--over)]';
  const approvalNote = ticket.approval_status ?? 'no approval record';
  const title = `${ticket.ticket_number} · ${ticket.ticket_date} · ${formatMoney(ticket.face_value)} · ${approvalNote}`;
  return (
    <span
      title={title}
      className={`tabular rounded border px-1.5 py-1 text-[0.7rem] font-medium ${cls}`}
    >
      {ticket.ticket_number_short}
    </span>
  );
}

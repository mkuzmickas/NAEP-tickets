'use client';

import { useMemo } from 'react';
import { Card, CardHeader } from '@/components/ui/Primitives';
import { formatMoney } from '@/lib/money';
import { bucketOf } from '@/lib/shippingBuckets';
import type { TrackerPackage } from '@/lib/shippingTracker';

type BucketStatus =
  | 'complete'            // every package shipped + every package has ≥1 ticket
  | 'partial_ticketed'    // shipped, some tickets on file, some packages still waiting
  | 'shipped_no_tickets'  // shipped past date, zero tickets — truly nothing invoiced
  | 'in_progress'         // some packages shipped, others still upcoming
  | 'upcoming'            // no package has shipped yet
  | 'undated';            // no ship date set on any package

type Bucket = {
  key: string;
  ewp: string;
  packages: TrackerPackage[];
  budget: number;
  actual: number;
  ticketCount: number;
  earliestShip: string | null;
  latestShip: string | null;
  status: BucketStatus;
};

function today(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

function buildBuckets(packages: TrackerPackage[]): Bucket[] {
  const map = new Map<string, TrackerPackage[]>();
  for (const p of packages) {
    const key = bucketOf(p.tag);
    const arr = map.get(key) ?? [];
    arr.push(p);
    map.set(key, arr);
  }

  const todayIso = today();
  const out: Bucket[] = [];

  for (const [key, pkgs] of map) {
    const budget = pkgs.reduce((s, p) => s + p.budget_total, 0);
    const actual = pkgs.reduce((s, p) => s + p.actual, 0);
    const ticketCount = pkgs.reduce((s, p) => s + p.ticket_count, 0);
    const dates = pkgs
      .map((p) => p.planned_ship_date)
      .filter((d): d is string => !!d)
      .sort();
    const earliestShip = dates[0] ?? null;
    const latestShip = dates[dates.length - 1] ?? null;
    const ewp = pkgs[0]?.ewp ?? '';

    let status: BucketStatus;
    if (!latestShip) {
      status = 'undated';
    } else if (latestShip <= todayIso) {
      // Every package in the bucket has a past ship date. Three cases:
      //   • every pkg individually has ≥1 ticket → complete (green)
      //   • some tickets exist but at least one pkg still has zero → partial
      //   • zero tickets across the whole bucket → truly shipped-no-tickets
      const everyPkgTicketed = pkgs.every((p) => p.ticket_count > 0);
      if (everyPkgTicketed) status = 'complete';
      else if (ticketCount > 0) status = 'partial_ticketed';
      else status = 'shipped_no_tickets';
    } else if (earliestShip && earliestShip <= todayIso) {
      status = 'in_progress';
    } else {
      status = 'upcoming';
    }

    out.push({
      key,
      ewp,
      packages: pkgs,
      budget,
      actual,
      ticketCount,
      earliestShip,
      latestShip,
      status,
    });
  }

  // Sort order: upcoming first (what to watch), then in progress, then
  // shipped-no-tickets (chase invoices), then complete (done), undated last.
  // Sort surfaces what needs action first: waiting for an invoice at the
  // top, then the in-progress shipments, then the ones with no ship date
  // set, then upcoming (nothing to do yet), then complete (already done).
  const order: Record<BucketStatus, number> = {
    shipped_no_tickets: 0,
    partial_ticketed: 1,
    in_progress: 2,
    undated: 3,
    upcoming: 4,
    complete: 5,
  };
  out.sort((a, b) => {
    if (order[a.status] !== order[b.status]) return order[a.status] - order[b.status];
    return (a.earliestShip ?? '9999').localeCompare(b.earliestShip ?? '9999');
  });

  return out;
}

const STATUS_META: Record<
  BucketStatus,
  { label: string; ring: string; chip: string; dot: string }
> = {
  complete: {
    label: 'Ticketed',
    ring: 'border-emerald-500 bg-emerald-50',
    chip: 'bg-emerald-600 text-white',
    dot: 'bg-emerald-500',
  },
  partial_ticketed: {
    label: 'Partially ticketed',
    ring: 'border-amber-400 bg-amber-50',
    chip: 'bg-amber-500 text-white',
    dot: 'bg-amber-500',
  },
  shipped_no_tickets: {
    label: 'Shipped · no tickets',
    ring: 'border-rose-400 bg-rose-50',
    chip: 'bg-rose-500 text-white',
    dot: 'bg-rose-500',
  },
  in_progress: {
    label: 'In progress',
    ring: 'border-sky-400 bg-sky-50',
    chip: 'bg-sky-600 text-white',
    dot: 'bg-sky-500',
  },
  upcoming: {
    label: 'Upcoming',
    ring: 'border-[var(--border)] bg-[var(--surface)]',
    chip: 'bg-[var(--surface-2)] text-[var(--text-muted)]',
    dot: 'bg-[var(--text-muted)]',
  },
  undated: {
    label: 'No date',
    ring: 'border-[var(--border)] bg-[var(--surface-2)]/40',
    chip: 'bg-[var(--surface-2)] text-[var(--text-muted)]',
    dot: 'bg-[var(--text-muted)]',
  },
};

function fmtShort(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function shipRange(earliest: string | null, latest: string | null): string {
  if (!earliest) return 'No date';
  if (!latest || earliest === latest) return fmtShort(earliest);
  return `${fmtShort(earliest)} → ${fmtShort(latest)}`;
}

export function PackageBucketCards({ packages }: { packages: TrackerPackage[] }) {
  const buckets = useMemo(() => buildBuckets(packages), [packages]);

  const counts = useMemo(() => {
    const c: Record<BucketStatus, number> = {
      complete: 0,
      partial_ticketed: 0,
      shipped_no_tickets: 0,
      in_progress: 0,
      upcoming: 0,
      undated: 0,
    };
    for (const b of buckets) c[b.status] += 1;
    return c;
  }, [buckets]);

  return (
    <Card>
      <CardHeader
        title="Shipping Buckets"
        subtitle="One card per shipping system. Green = every package in the system has shipped and has at least one ticket. Amber = shipped, some tickets on file but not all packages invoiced yet. Rose = shipped with zero tickets on file. Blue = mid-shipment. Neutral = upcoming."
      />
      <div className="px-5 pt-3 flex flex-wrap items-center gap-3 text-[11px]">
        <LegendChip meta={STATUS_META.complete} n={counts.complete} />
        <LegendChip meta={STATUS_META.partial_ticketed} n={counts.partial_ticketed} />
        <LegendChip meta={STATUS_META.shipped_no_tickets} n={counts.shipped_no_tickets} />
        <LegendChip meta={STATUS_META.in_progress} n={counts.in_progress} />
        <LegendChip meta={STATUS_META.upcoming} n={counts.upcoming} />
        {counts.undated > 0 && (
          <LegendChip meta={STATUS_META.undated} n={counts.undated} />
        )}
      </div>
      <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {buckets.map((b) => (
          <BucketCard key={b.key} bucket={b} />
        ))}
      </div>
    </Card>
  );
}

function LegendChip({
  meta,
  n,
}: {
  meta: (typeof STATUS_META)[BucketStatus];
  n: number;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block w-2 h-2 rounded-full ${meta.dot}`} />
      <span className="text-[var(--text-muted)]">
        {meta.label}
      </span>
      <span className="tabular font-semibold text-[var(--text)]">{n}</span>
    </span>
  );
}

function BucketCard({ bucket }: { bucket: Bucket }) {
  const meta = STATUS_META[bucket.status];
  const diff = bucket.actual - bucket.budget;
  const diffCls =
    Math.abs(diff) < 0.5
      ? 'text-[var(--text-muted)]'
      : diff > 0
        ? 'text-[var(--over)]'
        : 'text-[var(--under)]';

  return (
    <div className={`rounded-lg border-2 p-3.5 ${meta.ring}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <div className="text-sm font-bold truncate text-[var(--text)]">
            {bucket.key}
          </div>
          <div className="text-[10px] text-[var(--text-muted)] truncate mt-0.5">
            {bucket.ewp}
          </div>
        </div>
        <span
          className={`shrink-0 text-[9px] uppercase tracking-widest font-bold px-1.5 py-0.5 rounded whitespace-nowrap ${meta.chip}`}
        >
          {meta.label}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-3">
        <StatBlock label="Budget" value={formatMoney(bucket.budget)} />
        <StatBlock label="Actual" value={formatMoney(bucket.actual)} />
        <StatBlock label="Δ" value={formatMoney(diff)} valueCls={diffCls} />
      </div>

      <div className="mt-3 pt-2 border-t border-black/10 flex items-center justify-between text-[10px] text-[var(--text-muted)]">
        <span>
          {bucket.packages.length} pkg · {bucket.ticketCount} ticket
          {bucket.ticketCount === 1 ? '' : 's'}
        </span>
        <span className="tabular">{shipRange(bucket.earliestShip, bucket.latestShip)}</span>
      </div>

      {bucket.packages.length > 1 && (
        <details className="mt-2">
          <summary className="text-[10px] text-[var(--text-muted)] cursor-pointer hover:text-[var(--text)]">
            Show {bucket.packages.length} packages
          </summary>
          <ul className="mt-1.5 space-y-0.5 text-[10px] text-[var(--text-muted)]">
            {bucket.packages.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2">
                <span className="truncate">{p.tag}</span>
                <span className="tabular whitespace-nowrap">
                  {p.ticket_count > 0 ? (
                    <span className="text-emerald-700 font-semibold">✓</span>
                  ) : (
                    <span className="text-[var(--text-muted)]/60">·</span>
                  )}{' '}
                  {p.planned_ship_date ? fmtShort(p.planned_ship_date) : '—'}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function StatBlock({
  label,
  value,
  valueCls,
}: {
  label: string;
  value: string;
  valueCls?: string;
}) {
  return (
    <div>
      <div className="text-[9px] uppercase tracking-wider text-[var(--text-muted)] font-semibold">
        {label}
      </div>
      <div className={`tabular text-xs font-semibold ${valueCls ?? 'text-[var(--text)]'}`}>
        {value}
      </div>
    </div>
  );
}

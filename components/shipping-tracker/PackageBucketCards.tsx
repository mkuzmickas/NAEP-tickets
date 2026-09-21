'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
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
    // Bucket-level dates: use the baseline commitment if there is one,
    // otherwise fall back to the current planned date. The card also
    // shows earliest actual ship date so you can eyeball slippage.
    const baselines = pkgs
      .map((p) => p.baseline_ship_date ?? p.planned_ship_date)
      .filter((d): d is string => !!d)
      .sort();
    const earliestShip = baselines[0] ?? null;
    const latestShip = baselines[baselines.length - 1] ?? null;
    const ewp = pkgs[0]?.ewp ?? '';

    // Bucket-level completion rule: one LaPrairie ticket closes the whole
    // convoy, because a single ticket usually covers a main skid + its
    // ship-loose sub-loads (five ship-loose vessels never get their own
    // individual invoices). manually_delivered = true is Mike's override
    // when a package is confirmed at site but no ticket ever lands under
    // its own id (LaPrairie tagged it under a sibling package, ticket
    // paperwork is delayed, etc.) — treat that as shipped for status.
    const anyShipped =
      pkgs.some((p) => !!p.actual_ship_date) ||
      pkgs.some((p) => p.manually_delivered);
    const allBaselinesPast = pkgs.every((p) => {
      const b = p.baseline_ship_date ?? p.planned_ship_date;
      return b !== null && b <= todayIso;
    });
    const allDeliveredOverride = pkgs.every((p) => p.manually_delivered);

    let status: BucketStatus;
    if (!latestShip && !anyShipped) {
      status = 'undated';
    } else if (anyShipped && allBaselinesPast) {
      // If the only reason the bucket 'shipped' is the manual override,
      // treat actual = 0 as still ticketed (Mike is asserting it's at
      // site regardless of the invoice picture).
      status =
        actual > 0 || allDeliveredOverride ? 'complete' : 'partial_ticketed';
    } else if (anyShipped) {
      // Ticketed on part of the bucket but at least one baseline is still
      // in the future — mid-convoy, not done.
      status = 'in_progress';
    } else if (allBaselinesPast) {
      // Every baseline passed and no LaPrairie ticket landed — the bucket
      // is genuinely overdue.
      status = 'shipped_no_tickets';
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
  // Pure chronological order by earliest planned ship date. Buckets with no
  // ship date sink to the very end. This puts completed/partial/upcoming
  // side by side in the order the work actually flows, so the timeline
  // reads left-to-right, top-to-bottom.
  out.sort((a, b) => {
    const aKey = a.earliestShip ?? '9999-99-99';
    const bKey = b.earliestShip ?? '9999-99-99';
    if (aKey !== bKey) return aKey.localeCompare(bKey);
    return a.key.localeCompare(b.key);
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
    label: 'Baseline missed',
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
        subtitle="One card per shipping system, ordered by earliest planned ship date. Green = every package shipped and has ≥1 ticket. Amber = some tickets on file, others still waiting. Rose = shipped, zero tickets. Blue = mid-shipment. Neutral = upcoming."
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

      <DeliveredToggle bucket={bucket} />

      {bucket.packages.length > 1 && (
        <details className="mt-2">
          <summary className="text-[10px] text-[var(--text-muted)] cursor-pointer hover:text-[var(--text)]">
            Show {bucket.packages.length} packages
          </summary>
          <table className="mt-1.5 w-full text-[10px] text-[var(--text-muted)]">
            <thead>
              <tr className="text-[var(--text-muted)]/70">
                <th className="text-left font-medium pb-1">Package</th>
                <th className="text-right font-medium pb-1 whitespace-nowrap">Baseline</th>
                <th className="text-right font-medium pb-1 whitespace-nowrap">Actual</th>
                <th className="text-right font-medium pb-1 whitespace-nowrap">Slip</th>
              </tr>
            </thead>
            <tbody>
              {bucket.packages.map((p) => (
                <PackageRow key={p.id} pkg={p} />
              ))}
            </tbody>
          </table>
        </details>
      )}
    </div>
  );
}

function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  const at = new Date(ay, am - 1, ad).getTime();
  const bt = new Date(by, bm - 1, bd).getTime();
  return Math.round((bt - at) / 86_400_000);
}

function PackageRow({ pkg }: { pkg: TrackerPackage }) {
  const baseline = pkg.baseline_ship_date ?? pkg.planned_ship_date;
  const actual = pkg.actual_ship_date;
  const slip = baseline && actual ? daysBetween(baseline, actual) : null;
  const slipCls =
    slip === null
      ? 'text-[var(--text-muted)]/60'
      : slip > 0
        ? 'text-[var(--over)] font-semibold'
        : slip < 0
          ? 'text-[var(--under)] font-semibold'
          : 'text-[var(--text-muted)]';
  const slipLabel =
    slip === null
      ? actual
        ? '—'
        : baseline && baseline < today()
          ? 'overdue'
          : '—'
      : slip > 0
        ? `+${slip}d`
        : slip < 0
          ? `${slip}d`
          : 'on time';
  return (
    <tr className="border-t border-black/5">
      <td className="pr-2 py-0.5 truncate max-w-[130px]" title={pkg.tag}>
        {pkg.tag}
      </td>
      <td className="pr-2 py-0.5 text-right tabular whitespace-nowrap">
        {baseline ? fmtShort(baseline) : '—'}
      </td>
      <td className="pr-2 py-0.5 text-right tabular whitespace-nowrap">
        {actual ? fmtShort(actual) : <span className="text-[var(--text-muted)]/60">—</span>}
      </td>
      <td className={`py-0.5 text-right tabular whitespace-nowrap ${slipCls}`}>
        {slipLabel}
      </td>
    </tr>
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

/**
 * Manual "at site" override. Flips manually_delivered on every package in
 * the bucket in one shot. Fires the API calls in parallel and refreshes
 * the tracker page once they resolve so the card status updates without a
 * full reload.
 */
function DeliveredToggle({ bucket }: { bucket: Bucket }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const anyMarked = bucket.packages.some((p) => p.manually_delivered);
  const allMarked = bucket.packages.every((p) => p.manually_delivered);

  async function toggle() {
    setError(null);
    const nextValue = !allMarked; // if partial, sweep on; if all, sweep off
    const results = await Promise.allSettled(
      bucket.packages.map((p) =>
        fetch(`/api/schedule/packages/${p.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ manually_delivered: nextValue }),
        }).then(async (res) => {
          if (!res.ok) {
            const b = await res.json().catch(() => ({}));
            throw new Error(b.error ?? `Save failed (${res.status})`);
          }
        })
      )
    );
    const failed = results.find((r) => r.status === 'rejected');
    if (failed && failed.status === 'rejected') {
      setError(String(failed.reason?.message ?? failed.reason));
      return;
    }
    startTransition(() => router.refresh());
  }

  return (
    <div className="mt-2 flex items-center justify-between text-[10px]">
      <button
        type="button"
        onClick={toggle}
        disabled={isPending}
        className={`px-2 py-0.5 rounded border text-[9px] uppercase tracking-widest font-bold ${
          allMarked
            ? 'border-emerald-500 bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
            : 'border-[var(--border)] bg-[var(--surface)] text-[var(--text-muted)] hover:bg-[var(--surface-2)]'
        } disabled:opacity-60`}
        title={
          allMarked
            ? 'Clear the manual "delivered" flag on every package in this bucket. Tracker will go back to reading actual LaPrairie ticket state.'
            : 'Mark every package in this bucket as delivered to site. Bucket will close regardless of whether LaPrairie tickets are tagged.'
        }
      >
        {isPending
          ? 'Saving…'
          : allMarked
            ? '✓ At site (override)'
            : anyMarked
              ? 'Mark all at site'
              : 'Mark at site'}
      </button>
      {error && (
        <span className="text-[var(--over)] truncate ml-2" title={error}>
          {error}
        </span>
      )}
    </div>
  );
}

'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader, StatTile, Card, CardHeader, EmptyState } from '@/components/ui/Primitives';
import { formatMoney } from '@/lib/money';
import { ShippingTrendChart } from '@/components/shipping-tracker/ShippingTrendChart';
import type {
  ShippingTrackerData,
  TrackerPackage,
  TrackerTicket,
} from '@/lib/shippingTracker';

export function ShippingTrackerView({ data }: { data: ShippingTrackerData }) {
  const [assignFor, setAssignFor] = useState<TrackerTicket | null>(null);

  const totals = useMemo(() => {
    const budget = data.packages.reduce((s, p) => s + p.budget_total, 0);
    const actual = data.packages.reduce((s, p) => s + p.actual, 0);
    const diff = actual - budget;
    const pct = budget > 0 ? (actual / budget) * 100 : 0;
    return { budget, actual, diff, pct };
  }, [data.packages]);

  const unassignedByPo = data.ticketsByPo.map((po) => ({
    ...po,
    unassigned: po.tickets.filter((t) => !t.schedule_package_id),
  }));
  const totalUnassigned = unassignedByPo.reduce(
    (s, po) => s + po.unassigned.length,
    0
  );

  const upcomingByDate = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayIso = today.toISOString().slice(0, 10);

    const upcoming = data.packages.filter(
      (p) => p.planned_ship_date && p.planned_ship_date >= todayIso
    );
    upcoming.sort((a, b) =>
      (a.planned_ship_date ?? '').localeCompare(b.planned_ship_date ?? '')
    );

    const m = new Map<string, TrackerPackage[]>();
    for (const p of upcoming) {
      const key = p.planned_ship_date!;
      const arr = m.get(key) ?? [];
      arr.push(p);
      m.set(key, arr);
    }
    return Array.from(m.entries());
  }, [data.packages]);

  return (
    <PageContainer>
      <div className="space-y-6">
        <PageHeader
          title="Shipping Cost Tracker"
          subtitle="Actual LEM cost per shipping package vs. its budgeted estimate. Every ticket logged against a shipping-tracking PO can be tagged to a package here."
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatTile
            label="Total Budget"
            value={formatMoney(totals.budget)}
            sub={`${data.packages.length} package${data.packages.length === 1 ? '' : 's'} on plan`}
          />
          <StatTile
            label="Total Actual"
            value={formatMoney(totals.actual)}
            sub={`${totals.pct.toFixed(1)}% of budget`}
            emphasis
          />
          <StatTile
            label="Variance"
            value={formatMoney(totals.diff)}
            sub={totals.diff > 0 ? 'over budget' : totals.diff < 0 ? 'under budget' : 'on budget'}
            tone={totals.diff > 0 ? 'over' : totals.diff < 0 ? 'under' : 'neutral'}
          />
          <StatTile
            label="Needs Assignment"
            value={String(totalUnassigned)}
            sub={totalUnassigned === 0 ? 'every ticket tagged' : 'tickets awaiting a package'}
            tone={totalUnassigned > 0 ? 'warn' : 'under'}
          />
        </div>

        <ShippingTrendChart
          forecast={data.trend.forecast}
          actual={data.trend.actual}
        />

        {totalUnassigned > 0 && (
          <Card>
            <CardHeader
              title="Needs Assignment"
              subtitle={`Every ticket logged against a shipping PO needs to be tagged to a package (or a new one). ${totalUnassigned} tickets waiting.`}
            />
            <div className="p-5 space-y-4">
              {unassignedByPo.map(
                (po) =>
                  po.unassigned.length > 0 && (
                    <div key={po.po_id}>
                      <div className="text-[11px] uppercase tracking-widest text-[var(--text-muted)] font-semibold mb-2">
                        {po.vendor_display_name} · {po.po_number}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {po.unassigned.map((t) => (
                          <UnassignedRow
                            key={t.id}
                            ticket={t}
                            onAssign={() => setAssignFor(t)}
                          />
                        ))}
                      </div>
                    </div>
                  )
              )}
            </div>
          </Card>
        )}

        <Card>
          <CardHeader
            title="Up Next"
            subtitle="Every package still to ship, chronologically. Actual $ = sum of face_value of tickets tagged to each package."
          />
          <div className="p-5 space-y-5">
            {upcomingByDate.length === 0 ? (
              <EmptyState
                title="Nothing on the near-term ship schedule."
                hint="Every dated package has already shipped — check the Ship Schedule page for the full list."
              />
            ) : (
              upcomingByDate.map(([date, pkgs]) => (
                <UpNextGroup key={date} date={date} pkgs={pkgs} />
              ))
            )}
          </div>
        </Card>
      </div>

      {assignFor && (
        <AssignPackageModal
          ticket={assignFor}
          packages={data.packages}
          onClose={() => setAssignFor(null)}
        />
      )}
    </PageContainer>
  );
}

function UpNextGroup({ date, pkgs }: { date: string; pkgs: TrackerPackage[] }) {
  const [y, m, d] = date.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((dt.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));

  const heading = dt.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: dt.getFullYear() === today.getFullYear() ? undefined : 'numeric',
  });

  const relative =
    days === 0
      ? 'Today'
      : days === 1
        ? 'Tomorrow'
        : days > 0 && days < 7
          ? `In ${days} days`
          : days >= 7 && days < 14
            ? 'Next week'
            : days >= 14 && days < 30
              ? `In ${Math.round(days / 7)} weeks`
              : `In ${Math.round(days / 30)} months`;

  const totalBudget = pkgs.reduce((s, p) => s + p.budget_total, 0);
  const totalActual = pkgs.reduce((s, p) => s + p.actual, 0);
  const totalDiff = totalActual - totalBudget;

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <div className="flex items-baseline gap-3">
          <span className="text-sm font-semibold text-[var(--text)]">
            {heading}
          </span>
          <span
            className={`text-[10px] uppercase tracking-widest font-semibold px-1.5 py-0.5 rounded ${
              days === 0
                ? 'bg-[var(--brand-orange)] text-white'
                : days <= 7
                  ? 'bg-[var(--warn-bg)] text-[var(--warn)]'
                  : 'bg-[var(--surface-2)] text-[var(--text-muted)]'
            }`}
          >
            {relative}
          </span>
          <span className="text-[11px] text-[var(--text-muted)] tabular">
            {pkgs.length} package{pkgs.length === 1 ? '' : 's'}
          </span>
        </div>
        <div className="text-[11px] text-[var(--text-muted)] tabular">
          {formatMoney(totalActual)} of {formatMoney(totalBudget)}
          {totalDiff !== 0 && (
            <span
              className={`ml-2 font-medium ${totalDiff > 0 ? 'text-[var(--over)]' : 'text-[var(--under)]'}`}
            >
              {totalDiff > 0 ? '+' : ''}
              {formatMoney(totalDiff)}
            </span>
          )}
        </div>
      </div>
      <div className="border border-[var(--border)] rounded-lg overflow-hidden divide-y divide-[var(--border)]">
        {pkgs.map((p) => (
          <UpNextRow key={p.id} pkg={p} />
        ))}
      </div>
    </div>
  );
}

function UpNextRow({ pkg }: { pkg: TrackerPackage }) {
  const diff = pkg.actual - pkg.budget_total;
  const diffCls =
    Math.abs(diff) < 0.5
      ? 'text-[var(--text-muted)]'
      : diff > 0
        ? 'text-[var(--over)] font-semibold'
        : 'text-[var(--under)] font-medium';
  return (
    <div className="px-4 py-2.5 grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-4 hover:bg-[var(--surface-2)]">
      <div className="min-w-0">
        <div className="text-sm font-medium truncate">{pkg.tag}</div>
        <div className="text-[10px] text-[var(--text-muted)] truncate">
          {pkg.ewp}
        </div>
      </div>
      <div className="text-right">
        <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-medium">Budget</div>
        <div className="tabular text-sm">{formatMoney(pkg.budget_total)}</div>
      </div>
      <div className="text-right">
        <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-medium">Actual</div>
        <div className="tabular text-sm">{formatMoney(pkg.actual)}</div>
      </div>
      <div className="text-right">
        <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-medium">Variance</div>
        <div className={`tabular text-sm ${diffCls}`}>{formatMoney(diff)}</div>
      </div>
      <div className="text-center min-w-[50px]">
        <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-medium">Tickets</div>
        <div className="tabular text-sm">{pkg.ticket_count}</div>
      </div>
    </div>
  );
}

function UnassignedRow({
  ticket,
  onAssign,
}: {
  ticket: TrackerTicket;
  onAssign: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border border-[var(--border)] rounded-md px-3 py-2 bg-[var(--surface)]">
      <div className="min-w-0">
        <div className="font-mono text-xs font-semibold truncate">
          {ticket.ticket_number}
        </div>
        <div className="text-[10px] text-[var(--text-muted)] tabular">
          {ticket.ticket_date} · {formatMoney(ticket.face_value)}
        </div>
      </div>
      <button
        onClick={onAssign}
        className="shrink-0 text-xs px-3 py-1 rounded-md bg-[var(--text)] text-[var(--surface)] font-semibold hover:opacity-90"
      >
        Assign package
      </button>
    </div>
  );
}

function AssignPackageModal({
  ticket,
  packages,
  onClose,
}: {
  ticket: TrackerTicket;
  packages: TrackerPackage[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string>(
    ticket.schedule_package_id ?? ''
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'pick' | 'new'>('pick');
  const [newPkg, setNewPkg] = useState({
    ewp: '',
    tag: '',
    shipping_cost: '',
    permits_cost: '',
  });

  const [pickSearch, setPickSearch] = useState('');

  const sortedFiltered = useMemo(() => {
    const q = pickSearch.trim().toLowerCase();
    // Sort by planned_ship_date ascending, nulls last, tie-break by tag.
    const sorted = [...packages].sort((a, b) => {
      const aDate = a.planned_ship_date ?? '9999-99-99';
      const bDate = b.planned_ship_date ?? '9999-99-99';
      if (aDate !== bDate) return aDate.localeCompare(bDate);
      return a.tag.localeCompare(b.tag);
    });
    if (!q) return sorted;
    return sorted.filter(
      (p) =>
        p.tag.toLowerCase().includes(q) ||
        p.ewp.toLowerCase().includes(q) ||
        (p.planned_ship_date ?? '').toLowerCase().includes(q)
    );
  }, [packages, pickSearch]);

  // Score every package against the ticket's field notes + date proximity,
  // return the highest-scoring one (if it clears a minimum bar). Runs once
  // when the modal opens.
  const suggestion = useMemo<
    { pkg: TrackerPackage; matched: string[] } | null
  >(() => {
    const notes = (ticket.field_notes ?? '').toLowerCase();
    if (!notes) return null;

    // Break every package tag / EWP into candidate tokens ≥3 chars, dropping
    // stopwords ("ship","loose","load","package", etc.) so common connector
    // words don't inflate scores.
    const STOPWORDS = new Set([
      'ship','loose','load','loads','package','packages','skid','the','and','for','with',
    ]);
    function tokenize(s: string): string[] {
      return s
        .toLowerCase()
        .split(/[\s\-\/(),.]+/)
        .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
    }

    const ticketTs = new Date(ticket.ticket_date + 'T00:00:00').getTime();
    let best: { pkg: TrackerPackage; score: number; matched: string[] } | null = null;

    for (const p of packages) {
      const candidateTokens = Array.from(
        new Set([...tokenize(p.tag), ...tokenize(p.ewp)])
      );
      const matched: string[] = [];
      let score = 0;
      for (const tok of candidateTokens) {
        if (notes.includes(tok)) {
          matched.push(tok);
          // Numbers / mod tags / IDs are far more discriminating than words.
          score += /\d/.test(tok) ? 3 : 1;
        }
      }
      // Small bonus if planned_ship_date is within ±5 days of the ticket date.
      if (score > 0 && p.planned_ship_date) {
        const pkgTs = new Date(p.planned_ship_date + 'T00:00:00').getTime();
        const dayDiff = Math.abs(pkgTs - ticketTs) / 86_400_000;
        if (dayDiff <= 5) score += 0.5;
      }
      if (score > 0 && (best === null || score > best.score)) {
        best = { pkg: p, score, matched };
      }
    }

    if (!best || best.score < 2) return null;
    return { pkg: best.pkg, matched: best.matched };
  }, [ticket, packages]);

  function formatShipDate(iso: string | null): string {
    if (!iso) return 'No ship date';
    const [y, m, d] = iso.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    return dt.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: '2-digit',
    });
  }

  async function assignTo(pkgId: string) {
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/tickets/${ticket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedule_package_id: pkgId }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b.error ?? `Save failed (${res.status})`);
      }
      router.refresh();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  async function saveAndAssignNew() {
    if (!newPkg.ewp.trim() || !newPkg.tag.trim()) {
      setError('EWP and tag are required for a new package.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/schedule/packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ewp: newPkg.ewp.trim(),
          tag: newPkg.tag.trim(),
        }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b.error ?? `Package create failed (${res.status})`);
      }
      const { pkg } = await res.json();
      // The schedule_packages table doesn't hold budget fields via the create
      // endpoint yet — if the user typed a shipping/permits amount, patch it in
      // via a raw upsert would require another endpoint. For now the user can
      // edit the budget from the schedule page. Assign the ticket immediately.
      await fetch(`/api/tickets/${ticket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedule_package_id: pkg.id }),
      });
      router.refresh();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-[var(--surface)] rounded-lg shadow-2xl w-full max-w-lg my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3 border-b border-[var(--border)]">
          <h3 className="text-sm font-semibold tracking-wide uppercase text-[var(--text)]">
            Assign package
          </h3>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Ticket <span className="font-mono">{ticket.ticket_number}</span> ·{' '}
            <span className="tabular">{formatMoney(ticket.face_value)}</span>
          </p>
          {ticket.field_notes && (
            <p className="mt-2 text-[11px] text-[var(--text-muted)] italic line-clamp-2">
              &ldquo;{ticket.field_notes}&rdquo;
            </p>
          )}
        </div>

        {suggestion && (
          <div className="px-5 pt-4">
            <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-semibold mb-1.5">
              Suggested match
            </div>
            <button
              onClick={() => assignTo(suggestion.pkg.id)}
              disabled={saving}
              className="w-full text-left px-3 py-2.5 rounded-md border-2 border-[var(--brand-orange)] bg-[var(--brand-orange)]/5 hover:bg-[var(--brand-orange)]/10 transition-colors disabled:opacity-60"
            >
              <div className="flex items-baseline justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-[var(--text)] truncate">
                    {suggestion.pkg.tag}
                  </div>
                  <div className="text-[10px] text-[var(--text-muted)] truncate mt-0.5">
                    {suggestion.pkg.ewp} · matched: {suggestion.matched.join(', ')}
                  </div>
                </div>
                <div className="shrink-0 text-[10px] uppercase tracking-widest font-semibold text-[var(--brand-orange)] whitespace-nowrap">
                  ↵ Assign
                </div>
              </div>
            </button>
          </div>
        )}

        <div className="px-5 py-4">
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setMode('pick')}
              className={`text-xs px-3 py-1.5 rounded-md ${mode === 'pick' ? 'bg-[var(--text)] text-[var(--surface)]' : 'bg-[var(--surface-2)] text-[var(--text-muted)]'}`}
            >
              Pick existing
            </button>
            <button
              onClick={() => setMode('new')}
              className={`text-xs px-3 py-1.5 rounded-md ${mode === 'new' ? 'bg-[var(--text)] text-[var(--surface)]' : 'bg-[var(--surface-2)] text-[var(--text-muted)]'}`}
            >
              + New package
            </button>
          </div>

          {mode === 'pick' ? (
            <div className="space-y-3">
              <input
                type="text"
                value={pickSearch}
                onChange={(e) => setPickSearch(e.target.value)}
                placeholder="Search by package, EWP, or ship date"
                className="w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm focus:outline-none focus:border-[var(--text)]"
                autoFocus
              />
              <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-semibold">
                {sortedFiltered.length} package{sortedFiltered.length === 1 ? '' : 's'} · sorted by ship date
              </div>
              <div className="max-h-[380px] overflow-y-auto space-y-1">
                {sortedFiltered.length === 0 ? (
                  <div className="text-sm text-[var(--text-muted)] italic py-6 text-center">
                    No packages match that search.
                  </div>
                ) : (
                  sortedFiltered.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setSelected(p.id)}
                      disabled={saving}
                      className={`w-full text-left px-3 py-2 rounded border text-sm ${
                        selected === p.id
                          ? 'border-[var(--text)] bg-[var(--surface-2)]'
                          : 'border-[var(--border)] hover:bg-[var(--surface-2)]'
                      }`}
                    >
                      <div className="flex items-baseline justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="font-medium truncate">{p.tag}</div>
                          <div className="text-[10px] text-[var(--text-muted)] truncate">
                            {p.ewp}
                          </div>
                        </div>
                        <div
                          className={`shrink-0 tabular text-xs font-semibold whitespace-nowrap ${
                            p.planned_ship_date
                              ? 'text-[var(--text)]'
                              : 'text-[var(--text-muted)]/60'
                          }`}
                        >
                          {formatShipDate(p.planned_ship_date)}
                        </div>
                      </div>
                      <div className="text-[10px] text-[var(--text-muted)] tabular mt-1">
                        Budget {formatMoney(p.budget_total)} · Actual {formatMoney(p.actual)} · {p.ticket_count} ticket{p.ticket_count === 1 ? '' : 's'}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-semibold block mb-1">EWP</label>
                <input
                  value={newPkg.ewp}
                  onChange={(e) => setNewPkg({ ...newPkg, ewp: e.target.value })}
                  placeholder='e.g. "North South Rack (EWP 8)"'
                  className="w-full rounded-md border border-[var(--border)] px-3 py-1.5 text-sm focus:outline-none focus:border-[var(--text)]"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-semibold block mb-1">Tag / description</label>
                <input
                  value={newPkg.tag}
                  onChange={(e) => setNewPkg({ ...newPkg, tag: e.target.value })}
                  placeholder="e.g. Ad-hoc equipment move"
                  className="w-full rounded-md border border-[var(--border)] px-3 py-1.5 text-sm focus:outline-none focus:border-[var(--text)]"
                />
              </div>
              <p className="text-[11px] text-[var(--text-muted)] italic">
                Budget fields (shipping/permits/total) can be filled in later from the schedule page. New packages start with $0 budget so the variance highlights them.
              </p>
            </div>
          )}

          {error && (
            <div className="mt-3 text-xs text-[var(--over)] bg-[var(--over-bg)] rounded p-2">
              {error}
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-[var(--border)] flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-3 py-1.5 text-xs rounded-md border border-[var(--border)] hover:bg-[var(--surface-2)] disabled:opacity-60"
          >
            Cancel
          </button>
          {mode === 'pick' ? (
            <button
              onClick={() => selected && assignTo(selected)}
              disabled={saving || !selected}
              className="px-4 py-1.5 text-xs rounded-md bg-[var(--text)] text-[var(--surface)] hover:opacity-90 disabled:opacity-60 font-semibold"
            >
              {saving ? 'Saving…' : 'Assign'}
            </button>
          ) : (
            <button
              onClick={saveAndAssignNew}
              disabled={saving}
              className="px-4 py-1.5 text-xs rounded-md bg-[var(--text)] text-[var(--surface)] hover:opacity-90 disabled:opacity-60 font-semibold"
            >
              {saving ? 'Saving…' : 'Create + Assign'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

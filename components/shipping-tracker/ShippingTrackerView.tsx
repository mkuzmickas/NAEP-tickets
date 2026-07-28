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

  const packagesByEwp = useMemo(() => {
    const m = new Map<string, TrackerPackage[]>();
    for (const p of data.packages) {
      const arr = m.get(p.ewp) ?? [];
      arr.push(p);
      m.set(p.ewp, arr);
    }
    return Array.from(m.entries()).sort(([a], [b]) => a.localeCompare(b));
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
            title="Packages"
            subtitle="Grouped by EWP. Actual $ = sum of face_value of tickets tagged to each package."
          />
          <div className="p-5 space-y-6">
            {packagesByEwp.length === 0 ? (
              <EmptyState title="No shipping packages on file yet." />
            ) : (
              packagesByEwp.map(([ewp, pkgs]) => (
                <div key={ewp}>
                  <div className="text-xs uppercase tracking-widest text-[var(--text-muted)] font-semibold mb-2">
                    {ewp}
                  </div>
                  <div className="border border-[var(--border)] rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]">
                          <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-medium">Package</th>
                          <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-medium">L×W×H · Weight</th>
                          <th className="text-right px-3 py-2 text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-medium">Budget</th>
                          <th className="text-right px-3 py-2 text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-medium">Actual</th>
                          <th className="text-right px-3 py-2 text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-medium">Variance</th>
                          <th className="text-center px-3 py-2 text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-medium">Tickets</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pkgs.map((p) => (
                          <PackageRow key={p.id} pkg={p} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
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

function PackageRow({ pkg }: { pkg: TrackerPackage }) {
  const diff = pkg.actual - pkg.budget_total;
  const pct = pkg.budget_total > 0 ? (pkg.actual / pkg.budget_total) * 100 : null;
  const diffCls =
    diff > 0.5
      ? 'text-[var(--over)] font-semibold'
      : diff < -0.5
        ? 'text-[var(--under)] font-medium'
        : 'text-[var(--text-muted)]';
  const dims =
    pkg.length_ft != null
      ? `${pkg.length_ft}×${pkg.width_ft}×${pkg.height_ft} ft`
      : '—';
  const wt = pkg.weight_lbs ? ` · ${pkg.weight_lbs} lbs` : '';
  return (
    <tr className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)]">
      <td className="px-3 py-2 text-sm font-medium">{pkg.tag}</td>
      <td className="px-3 py-2 text-xs text-[var(--text-muted)] font-mono">
        {dims}
        {wt}
      </td>
      <td className="px-3 py-2 text-right tabular text-sm">
        {formatMoney(pkg.budget_total)}
      </td>
      <td className="px-3 py-2 text-right tabular text-sm">
        {formatMoney(pkg.actual)}
      </td>
      <td className={`px-3 py-2 text-right tabular text-sm ${diffCls}`}>
        {formatMoney(diff)}
        {pct !== null && (
          <span className="ml-1 text-[10px] font-normal text-[var(--text-muted)]">
            ({pct.toFixed(0)}%)
          </span>
        )}
      </td>
      <td className="px-3 py-2 text-center text-xs text-[var(--text-muted)] tabular">
        {pkg.ticket_count}
      </td>
    </tr>
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

  const grouped = useMemo(() => {
    const m = new Map<string, TrackerPackage[]>();
    for (const p of packages) {
      const arr = m.get(p.ewp) ?? [];
      arr.push(p);
      m.set(p.ewp, arr);
    }
    return Array.from(m.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [packages]);

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
        </div>

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
            <div className="max-h-[400px] overflow-y-auto space-y-4">
              {grouped.map(([ewp, pkgs]) => (
                <div key={ewp}>
                  <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-semibold mb-1.5">
                    {ewp}
                  </div>
                  <div className="space-y-1">
                    {pkgs.map((p) => (
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
                        <div className="font-medium">{p.tag}</div>
                        <div className="text-[10px] text-[var(--text-muted)] tabular">
                          Budget {formatMoney(p.budget_total)} · Actual {formatMoney(p.actual)} · {p.ticket_count} ticket{p.ticket_count === 1 ? '' : 's'}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
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

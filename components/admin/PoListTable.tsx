'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatMoney } from '@/lib/money';
import { Card, CardHeader, EmptyState } from '@/components/ui/Primitives';
import type { PoReferenceRow } from '@/lib/pos';

type SortKey =
  | 'po_number'
  | 'project_cost_code'
  | 'vendor_display_name'
  | 'committed_amount';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'committed_amount', label: 'Committed' },
  { key: 'vendor_display_name', label: 'Vendor' },
  { key: 'po_number', label: 'PO Number' },
  { key: 'project_cost_code', label: 'Cost Code' },
];

type EditState = {
  vendor_legal_name: string;
  vendor_display_name: string;
  task_wbs: string;
  project_cost_code: string;
  scope: string;
  committed_amount: string;
};

export function PoListTable({ rows }: { rows: PoReferenceRow[] }) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('committed_amount');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [editingPo, setEditingPo] = useState<PoReferenceRow | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let result = rows;
    if (q) {
      result = result.filter(
        (r) =>
          r.po_number.toLowerCase().includes(q) ||
          r.vendor_display_name.toLowerCase().includes(q) ||
          r.vendor_legal_name.toLowerCase().includes(q) ||
          (r.scope ?? '').toLowerCase().includes(q) ||
          (r.task_wbs ?? '').toLowerCase().includes(q) ||
          (r.project_cost_code ?? '').toLowerCase().includes(q)
      );
    }
    return [...result].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      let cmp = 0;
      if (typeof av === 'number' && typeof bv === 'number') cmp = av - bv;
      else if (av == null) cmp = bv == null ? 0 : 1;
      else if (bv == null) cmp = -1;
      else cmp = String(av).localeCompare(String(bv));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [rows, search, sortKey, sortDir]);

  const filteredCommitted = filtered.reduce(
    (s, r) => s + r.committed_amount,
    0
  );

  return (
    <>
      <Card>
        <CardHeader
          title="All Purchase Orders"
          subtitle={
            <>
              Showing{' '}
              <span className="tabular font-medium text-[var(--text)]">
                {filtered.length}
              </span>{' '}
              of {rows.length} ·{' '}
              <span className="tabular font-medium text-[var(--text)]">
                {formatMoney(filteredCommitted)}
              </span>{' '}
              committed
            </>
          }
        />
        <div className="px-5 py-3 border-b border-[var(--border)] flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search PO #, vendor, cost code, WBS, or description"
            className="flex-1 min-w-[240px] rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm focus:outline-none focus:border-[var(--text)]"
          />
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm focus:outline-none focus:border-[var(--text)]"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.key} value={o.key}>
                Sort: {o.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
            title={sortDir === 'asc' ? 'Sort ascending' : 'Sort descending'}
            className="rounded-md border border-[var(--border)] bg-[var(--surface)] w-8 h-8 text-sm text-[var(--text-muted)] hover:text-[var(--text)]"
          >
            {sortDir === 'asc' ? '▲' : '▼'}
          </button>
          {search && (
            <button
              onClick={() => setSearch('')}
              className="text-xs text-[var(--text-muted)] underline hover:text-[var(--text)]"
            >
              Clear
            </button>
          )}
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            title={
              rows.length === 0
                ? 'No POs on file yet.'
                : 'No POs match the search.'
            }
            hint={
              rows.length === 0
                ? 'Use the form above to add the first one.'
                : undefined
            }
          />
        ) : (
          <div className="p-5 grid grid-cols-1 xl:grid-cols-2 gap-4">
            {filtered.map((po) => (
              <AdminPoCard
                key={po.id}
                po={po}
                onEdit={() => setEditingPo(po)}
              />
            ))}
          </div>
        )}
      </Card>

      {editingPo && (
        <EditPoModal
          po={editingPo}
          onClose={() => setEditingPo(null)}
          onSaved={() => {
            setEditingPo(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

function AdminPoCard({
  po,
  onEdit,
}: {
  po: PoReferenceRow;
  onEdit: () => void;
}) {
  return (
    <div className="border border-[var(--border)] rounded-lg bg-[var(--surface)] p-5">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          <div className="font-mono text-sm font-semibold tracking-wide uppercase text-[var(--text)]">
            {po.po_number}
          </div>
          <div className="text-xs text-[var(--text-muted)] mt-0.5">
            {po.vendor_display_name}
          </div>
        </div>
        <button
          onClick={onEdit}
          className="text-xs text-[var(--text-muted)] hover:text-[var(--text)] px-2 py-1 rounded border border-[var(--border)] hover:border-[var(--text)]/40"
        >
          Edit
        </button>
      </div>

      <p className="text-sm text-[var(--text)]/85 line-clamp-2 mb-4 min-h-[2.5rem]">
        {po.scope ?? (
          <span className="text-[var(--text-muted)] italic">
            No description
          </span>
        )}
      </p>

      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[var(--border)]">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-medium">
            Cost Code
          </div>
          <div className="tabular font-mono text-xs mt-0.5 text-[var(--text)]">
            {po.project_cost_code ?? '—'}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-medium">
            Task / WBS
          </div>
          <div className="tabular font-mono text-xs mt-0.5 text-[var(--text)]">
            {po.task_wbs ?? '—'}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-medium">
            Vendor (legal)
          </div>
          <div className="text-xs mt-0.5 text-[var(--text-muted)] truncate">
            {po.vendor_legal_name}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-medium">
            Committed
          </div>
          <div className="tabular text-sm font-semibold mt-0.5 text-[var(--text)]">
            {formatMoney(po.committed_amount)}
          </div>
        </div>
      </div>
    </div>
  );
}

function EditPoModal({
  po,
  onClose,
  onSaved,
}: {
  po: PoReferenceRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [state, setState] = useState<EditState>({
    vendor_legal_name: po.vendor_legal_name,
    vendor_display_name: po.vendor_display_name,
    task_wbs: po.task_wbs ?? '',
    project_cost_code: po.project_cost_code ?? '',
    scope: po.scope ?? '',
    committed_amount: String(po.committed_amount),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    setError('');
    if (!state.vendor_legal_name.trim()) {
      setError('Vendor legal name is required.');
      return;
    }
    if (!state.vendor_display_name.trim()) {
      setError('Vendor display name is required.');
      return;
    }
    const committed = Number(state.committed_amount);
    if (!Number.isFinite(committed) || committed <= 0) {
      setError('Committed amount must be a positive number.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/pos/${po.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor_legal_name: state.vendor_legal_name.trim(),
          vendor_display_name: state.vendor_display_name.trim(),
          task_wbs: state.task_wbs.trim() || null,
          project_cost_code: state.project_cost_code.trim() || null,
          scope: state.scope.trim() || null,
          committed_amount: committed,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Save failed (${res.status})`);
      }
      onSaved();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  const labelCls =
    'block text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1';
  const inputCls =
    'w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm focus:outline-none focus:border-[var(--text)]';

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[var(--surface)] rounded-lg shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3 border-b border-[var(--border)]">
          <div className="font-mono text-sm font-semibold uppercase tracking-wide">
            Edit {po.po_number}
          </div>
          <div className="text-xs text-[var(--text-muted)] mt-0.5">
            Purchase order details
          </div>
        </div>

        <div className="px-5 py-4 space-y-3">
          <div>
            <label className={labelCls}>Vendor · display name</label>
            <input
              value={state.vendor_display_name}
              onChange={(e) =>
                setState({ ...state, vendor_display_name: e.target.value })
              }
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>Vendor · legal name</label>
            <input
              value={state.vendor_legal_name}
              onChange={(e) =>
                setState({ ...state, vendor_legal_name: e.target.value })
              }
              className={inputCls}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Project Cost Code</label>
              <input
                value={state.project_cost_code}
                onChange={(e) =>
                  setState({ ...state, project_cost_code: e.target.value })
                }
                placeholder="04.P1.X.XXX.XXX"
                className={`${inputCls} font-mono text-xs`}
              />
            </div>
            <div>
              <label className={labelCls}>Task / WBS</label>
              <input
                value={state.task_wbs}
                onChange={(e) =>
                  setState({ ...state, task_wbs: e.target.value })
                }
                placeholder="Optional"
                className={`${inputCls} font-mono text-xs`}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Scope / description</label>
            <textarea
              value={state.scope}
              onChange={(e) => setState({ ...state, scope: e.target.value })}
              rows={3}
              placeholder="What the PO covers"
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>Committed amount ($)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={state.committed_amount}
              onChange={(e) =>
                setState({ ...state, committed_amount: e.target.value })
              }
              className={`${inputCls} tabular text-right`}
            />
          </div>

          {error && (
            <div className="text-xs text-[var(--over)] bg-[var(--over-bg)] border border-[var(--over)]/30 rounded p-2">
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
          <button
            onClick={save}
            disabled={saving}
            className="px-4 py-1.5 text-xs rounded-md bg-[var(--text)] text-[var(--surface)] hover:opacity-90 disabled:opacity-60 font-semibold"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

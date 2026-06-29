'use client';

import { Fragment, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatMoney } from '@/lib/money';
import type { PoReferenceRow } from '@/lib/pos';

type SortKey =
  | 'po_number'
  | 'vendor_display_name'
  | 'task_wbs'
  | 'committed_amount';
type SortDir = 'asc' | 'desc';

const NUMERIC_KEYS: SortKey[] = ['committed_amount'];

type EditState = {
  vendor_legal_name: string;
  vendor_display_name: string;
  task_wbs: string;
  scope: string;
  committed_amount: string;
};

export function PoListTable({ rows }: { rows: PoReferenceRow[] }) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('committed_amount');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

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
          (r.task_wbs ?? '').toLowerCase().includes(q)
      );
    }
    return [...result].sort((a, b) => {
      let cmp = 0;
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === 'number' && typeof bv === 'number') {
        cmp = av - bv;
      } else if (av == null) {
        cmp = bv == null ? 0 : 1;
      } else if (bv == null) {
        cmp = -1;
      } else {
        cmp = String(av).localeCompare(String(bv));
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [rows, search, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(NUMERIC_KEYS.includes(key) ? 'desc' : 'asc');
    }
  }

  function startEdit(r: PoReferenceRow) {
    setEditingId(r.id);
    setEditState({
      vendor_legal_name: r.vendor_legal_name,
      vendor_display_name: r.vendor_display_name,
      task_wbs: r.task_wbs ?? '',
      scope: r.scope ?? '',
      committed_amount: String(r.committed_amount),
    });
    setSaveError('');
  }

  function cancelEdit() {
    setEditingId(null);
    setEditState(null);
    setSaveError('');
  }

  async function saveEdit(r: PoReferenceRow) {
    if (!editState) return;
    setSaving(true);
    setSaveError('');

    if (!editState.vendor_legal_name.trim()) {
      setSaving(false);
      setSaveError('Vendor legal name is required.');
      return;
    }
    if (!editState.vendor_display_name.trim()) {
      setSaving(false);
      setSaveError('Vendor display name is required.');
      return;
    }
    const committed = Number(editState.committed_amount);
    if (!Number.isFinite(committed) || committed <= 0) {
      setSaving(false);
      setSaveError('Committed amount must be a positive number.');
      return;
    }

    try {
      const res = await fetch(`/api/pos/${r.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendor_legal_name: editState.vendor_legal_name.trim(),
          vendor_display_name: editState.vendor_display_name.trim(),
          task_wbs: editState.task_wbs.trim() || null,
          scope: editState.scope.trim() || null,
          committed_amount: committed,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Save failed (${res.status})`);
      }
      setEditingId(null);
      setEditState(null);
      router.refresh();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setSaveError(msg);
    } finally {
      setSaving(false);
    }
  }

  const filtersActive = !!search;
  const filteredCommitted = filtered.reduce((s, r) => s + r.committed_amount, 0);

  return (
    <div className="bg-white rounded-lg border border-black/10 overflow-hidden">
      <div className="px-5 py-3 border-b border-black/10 space-y-3">
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <h2 className="text-base font-semibold tracking-tight">All POs</h2>
          <span className="text-xs text-enbridge-black/55 tabular-nums">
            Showing <strong>{filtered.length}</strong> of {rows.length} ·{' '}
            {formatMoney(filteredCommitted)} committed
          </span>
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search PO #, vendor, WBS, or description"
          className="w-full rounded border border-black/20 px-3 py-1.5 text-sm focus:outline-none focus:border-enbridge-black"
        />
        {filtersActive && (
          <button
            onClick={() => setSearch('')}
            className="text-xs text-enbridge-black/60 underline hover:text-enbridge-black"
          >
            Clear filters
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-enbridge-paper text-enbridge-black/70">
            <tr>
              <SortableTh
                active={sortKey === 'po_number'}
                dir={sortDir}
                onClick={() => toggleSort('po_number')}
              >
                PO Number
              </SortableTh>
              <SortableTh
                active={sortKey === 'vendor_display_name'}
                dir={sortDir}
                onClick={() => toggleSort('vendor_display_name')}
              >
                Vendor
              </SortableTh>
              <SortableTh
                active={sortKey === 'task_wbs'}
                dir={sortDir}
                onClick={() => toggleSort('task_wbs')}
              >
                Task/WBS
              </SortableTh>
              <Th>Scope</Th>
              <SortableTh
                right
                active={sortKey === 'committed_amount'}
                dir={sortDir}
                onClick={() => toggleSort('committed_amount')}
              >
                Committed
              </SortableTh>
              <th className="px-4 py-2 text-right text-xs font-medium uppercase tracking-wide w-24">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <Fragment key={p.id}>
                {editingId === p.id && editState ? (
                  <>
                    <tr className="border-t border-black/5 bg-amber-50">
                      <td className="px-4 py-3 align-top font-mono text-xs whitespace-nowrap">
                        {p.po_number}
                      </td>
                      <td className="px-4 py-3 align-top space-y-1">
                        <input
                          value={editState.vendor_display_name}
                          onChange={(e) =>
                            setEditState({
                              ...editState,
                              vendor_display_name: e.target.value,
                            })
                          }
                          placeholder="Display name"
                          className="w-full rounded border border-black/20 px-2 py-1 text-sm focus:outline-none focus:border-enbridge-black"
                        />
                        <input
                          value={editState.vendor_legal_name}
                          onChange={(e) =>
                            setEditState({
                              ...editState,
                              vendor_legal_name: e.target.value,
                            })
                          }
                          placeholder="Legal name"
                          className="w-full rounded border border-black/20 px-2 py-1 text-xs focus:outline-none focus:border-enbridge-black"
                        />
                      </td>
                      <td className="px-4 py-3 align-top">
                        <input
                          value={editState.task_wbs}
                          onChange={(e) =>
                            setEditState({ ...editState, task_wbs: e.target.value })
                          }
                          placeholder="04.P1.W.WMI.XXX"
                          className="w-full rounded border border-black/20 px-2 py-1 text-xs font-mono focus:outline-none focus:border-enbridge-black"
                        />
                      </td>
                      <td className="px-4 py-3 align-top max-w-md">
                        <textarea
                          value={editState.scope}
                          onChange={(e) =>
                            setEditState({ ...editState, scope: e.target.value })
                          }
                          placeholder="What the PO covers"
                          rows={2}
                          className="w-full rounded border border-black/20 px-2 py-1 text-sm focus:outline-none focus:border-enbridge-black"
                        />
                      </td>
                      <td className="px-4 py-3 align-top">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={editState.committed_amount}
                          onChange={(e) =>
                            setEditState({
                              ...editState,
                              committed_amount: e.target.value,
                            })
                          }
                          placeholder="0.00"
                          className="w-full rounded border border-black/20 px-2 py-1 text-sm text-right tabular-nums focus:outline-none focus:border-enbridge-black"
                        />
                      </td>
                      <td className="px-4 py-3 align-top text-right whitespace-nowrap">
                        <button
                          onClick={() => saveEdit(p)}
                          disabled={saving}
                          className="px-2 py-1 text-xs rounded bg-enbridge-black text-white hover:bg-enbridge-black/90 disabled:opacity-60 mr-1"
                        >
                          {saving ? 'Saving…' : 'Save'}
                        </button>
                        <button
                          onClick={cancelEdit}
                          disabled={saving}
                          className="px-2 py-1 text-xs rounded border border-black/15 hover:bg-white disabled:opacity-60"
                        >
                          Cancel
                        </button>
                      </td>
                    </tr>
                    {saveError && (
                      <tr className="bg-red-50 border-t border-red-200">
                        <td
                          colSpan={6}
                          className="px-4 py-2 text-xs text-red-800"
                        >
                          {saveError}
                        </td>
                      </tr>
                    )}
                  </>
                ) : (
                  <tr className="border-t border-black/5 hover:bg-enbridge-paper/60">
                    <td className="px-4 py-3 align-top font-mono text-xs whitespace-nowrap">
                      {p.po_number}
                    </td>
                    <td className="px-4 py-3 align-top">
                      {p.vendor_display_name}
                      <div className="text-[10px] text-enbridge-black/55">
                        {p.vendor_legal_name}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top font-mono text-xs whitespace-nowrap">
                      {p.task_wbs ?? '—'}
                    </td>
                    <td className="px-4 py-3 align-top max-w-md">
                      <span className="text-enbridge-black/80 line-clamp-2">
                        {p.scope ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top text-right tabular-nums whitespace-nowrap">
                      {formatMoney(p.committed_amount)}
                    </td>
                    <td className="px-4 py-3 align-top text-right">
                      <button
                        onClick={() => startEdit(p)}
                        className="text-xs text-enbridge-black/70 hover:text-enbridge-black underline"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-enbridge-black/55 text-sm"
                >
                  {rows.length === 0
                    ? 'No POs on file yet. Use the form above to add the first one.'
                    : 'No POs match the current search.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({
  children,
  right,
}: {
  children: React.ReactNode;
  right?: boolean;
}) {
  return (
    <th
      className={`px-4 py-2 text-xs font-medium uppercase tracking-wide ${
        right ? 'text-right' : 'text-left'
      }`}
    >
      {children}
    </th>
  );
}

function SortableTh({
  children,
  active,
  dir,
  onClick,
  right,
}: {
  children: React.ReactNode;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
  right?: boolean;
}) {
  return (
    <th
      className={`px-4 py-2 text-xs font-medium uppercase tracking-wide ${
        right ? 'text-right' : 'text-left'
      }`}
    >
      <button
        onClick={onClick}
        className="inline-flex items-center gap-1 hover:text-enbridge-black"
      >
        {children}
        <span className="text-enbridge-black/40">
          {active ? (dir === 'asc' ? '▲' : '▼') : '▾'}
        </span>
      </button>
    </th>
  );
}

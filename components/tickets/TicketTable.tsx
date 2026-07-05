'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { formatMoney } from '@/lib/money';
import type { LineItem, LineItemCategory, TicketRow } from '@/types/database';

type SortKey = 'ticket_date' | 'ticket_number' | 'face_value';
type SortDir = 'asc' | 'desc';

const CATEGORY_LABEL: Record<LineItemCategory, string> = {
  labour: 'Labour',
  equipment: 'Equipment',
  materials: 'Materials',
  loa_other: 'LOA/Other',
};

function categoryTotals(items: LineItem[]) {
  const r = { labour: 0, equipment: 0, materials: 0, loa_other: 0 };
  for (const li of items) r[li.category] += li.final_amount;
  return r;
}

async function viewPdf(path: string) {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from('ticket-pdfs')
    .createSignedUrl(path, 300);
  if (error || !data) {
    alert(`Could not generate PDF link: ${error?.message ?? 'unknown error'}`);
    return;
  }
  window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
}

function csvEscape(v: string | number): string {
  const s = String(v);
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function buildCsv(rows: TicketRow[]): string {
  const headers = [
    'Date', 'Ticket #', 'Vendor', 'Scope', 'PO Number',
    'Labour', 'Equipment', 'Materials', 'LOA/Other', 'Total',
    'Master Ticket', 'Status',
  ];
  const lines = [headers.map(csvEscape).join(',')];

  let sumL = 0, sumE = 0, sumM = 0, sumO = 0, sumT = 0;

  for (const r of rows) {
    const c = categoryTotals(r.line_items);
    sumL += c.labour;
    sumE += c.equipment;
    sumM += c.materials;
    sumO += c.loa_other;
    sumT += r.face_value;
    lines.push([
      r.ticket_date,
      r.ticket_number,
      r.vendor_display_name,
      r.scope ?? '',
      r.po_number,
      c.labour.toFixed(2),
      c.equipment.toFixed(2),
      c.materials.toFixed(2),
      c.loa_other.toFixed(2),
      r.face_value.toFixed(2),
      r.is_master ? 'YES' : '',
      r.status,
    ].map(csvEscape).join(','));
  }

  lines.push([
    '', '', '', '', 'TOTALS',
    sumL.toFixed(2),
    sumE.toFixed(2),
    sumM.toFixed(2),
    sumO.toFixed(2),
    sumT.toFixed(2),
    '', '',
  ].map(csvEscape).join(','));

  return lines.join('\r\n');
}

function downloadCsv(filename: string, content: string) {
  // Prepend BOM so Excel opens as UTF-8 (preserves em-dashes etc.)
  const blob = new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function safeFilenamePart(s: string): string {
  return s.replace(/[^a-z0-9-_]+/gi, '_').replace(/^_+|_+$/g, '');
}

export function TicketTable({
  initialTickets,
  initialPoFilter = 'all',
}: {
  initialTickets: TicketRow[];
  initialPoFilter?: string;
}) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [poFilter, setPoFilter] = useState<string>(initialPoFilter);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('ticket_date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState<TicketRow | null>(null);
  const [deleteStatus, setDeleteStatus] = useState<'idle' | 'deleting' | 'error'>('idle');
  const [deleteError, setDeleteError] = useState('');

  const poOptions = useMemo(() => {
    const map = new Map<string, string>();
    initialTickets.forEach((t) => map.set(t.po_number, t.vendor_display_name));
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [initialTickets]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = initialTickets;
    if (q) {
      rows = rows.filter(
        (t) =>
          t.ticket_number.toLowerCase().includes(q) ||
          t.po_number.toLowerCase().includes(q) ||
          t.vendor_display_name.toLowerCase().includes(q)
      );
    }
    if (poFilter !== 'all') rows = rows.filter((t) => t.po_number === poFilter);
    if (dateFrom) rows = rows.filter((t) => t.ticket_date >= dateFrom);
    if (dateTo) rows = rows.filter((t) => t.ticket_date <= dateTo);

    const sorted = [...rows].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      let cmp = 0;
      if (typeof av === 'number' && typeof bv === 'number') cmp = av - bv;
      else cmp = String(av).localeCompare(String(bv));
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [initialTickets, search, poFilter, dateFrom, dateTo, sortKey, sortDir]);

  const sumFiltered = useMemo(
    () => filtered.reduce((s, t) => s + t.face_value, 0),
    [filtered]
  );

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'ticket_number' ? 'asc' : 'desc');
    }
  }

  function clearFilters() {
    setSearch('');
    setPoFilter('all');
    setDateFrom('');
    setDateTo('');
  }

  async function confirmDelete() {
    if (!deleting) return;
    setDeleteStatus('deleting');
    setDeleteError('');
    const res = await fetch(`/api/tickets/${deleting.id}`, { method: 'DELETE' });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setDeleteStatus('error');
      setDeleteError(body.error ?? 'Delete failed');
      return;
    }
    setDeleting(null);
    setDeleteStatus('idle');
    router.refresh();
  }

  const filtersActive = !!(search || poFilter !== 'all' || dateFrom || dateTo);

  const activeVendor = poFilter !== 'all' && filtered.length > 0 ? filtered[0] : null;

  function handleExport() {
    if (filtered.length === 0) return;
    const today = new Date().toISOString().slice(0, 10);
    const scope = activeVendor
      ? `${safeFilenamePart(activeVendor.vendor_display_name)}_${safeFilenamePart(activeVendor.po_number)}`
      : 'all-tickets';
    const filename = `NAEP_tickets_${scope}_${today}.csv`;
    downloadCsv(filename, buildCsv(filtered));
  }

  return (
    <div className="space-y-4">
      {activeVendor && (
        <div className="bg-enbridge-black text-white rounded-lg px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-widest text-white/60 font-semibold">Viewing tickets for</div>
            <div className="text-xl font-semibold tracking-tight mt-0.5">{activeVendor.vendor_display_name}</div>
            <div className="text-sm text-white/80 mt-0.5 line-clamp-1">{activeVendor.scope ?? '—'}</div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[10px] uppercase tracking-widest text-white/60 font-semibold">PO Number</div>
            <div className="text-sm font-mono mt-0.5">{activeVendor.po_number}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg border border-black/10 p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="lg:col-span-2">
          <label className="block text-xs font-medium text-enbridge-black/70 mb-1">Search</label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Ticket #, PO #, or vendor"
            className="w-full rounded border border-black/20 px-3 py-2 text-sm focus:outline-none focus:border-enbridge-black"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-enbridge-black/70 mb-1">PO</label>
          <select
            value={poFilter}
            onChange={(e) => setPoFilter(e.target.value)}
            className="w-full rounded border border-black/20 px-3 py-2 text-sm bg-white focus:outline-none focus:border-enbridge-black"
          >
            <option value="all">All POs</option>
            {poOptions.map(([po, vendor]) => (
              <option key={po} value={po}>
                {po} — {vendor}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-enbridge-black/70 mb-1">From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full rounded border border-black/20 px-3 py-2 text-sm focus:outline-none focus:border-enbridge-black"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-enbridge-black/70 mb-1">To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full rounded border border-black/20 px-3 py-2 text-sm focus:outline-none focus:border-enbridge-black"
          />
        </div>
        {filtersActive && (
          <div className="sm:col-span-2 lg:col-span-5">
            <button
              onClick={clearFilters}
              className="text-xs text-enbridge-black/60 underline hover:text-enbridge-black"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-black/10 overflow-hidden">
        <div className="px-5 py-3 border-b border-black/10 flex items-center justify-between text-sm gap-3 flex-wrap">
          <span className="text-enbridge-black/70">
            Showing <strong>{filtered.length}</strong> of {initialTickets.length} tickets
          </span>
          <div className="flex items-center gap-4">
            <span className="text-enbridge-black/70 tabular-nums">
              Sum: <strong>{formatMoney(sumFiltered)}</strong>
            </span>
            <button
              onClick={handleExport}
              disabled={filtered.length === 0}
              title="Download the filtered rows plus a totals line as an Excel-compatible CSV"
              className="text-xs px-3 py-1.5 border border-black/20 rounded bg-white hover:bg-enbridge-paper disabled:opacity-50 font-medium inline-flex items-center gap-1.5"
            >
              <span>📊</span>
              <span>Export to Excel</span>
              <span className="text-enbridge-black/50">({filtered.length})</span>
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-enbridge-paper text-enbridge-black/70">
              <tr>
                <th className="w-8" />
                <SortableTh active={sortKey === 'ticket_date'} dir={sortDir} onClick={() => toggleSort('ticket_date')}>
                  Date
                </SortableTh>
                <SortableTh active={sortKey === 'ticket_number'} dir={sortDir} onClick={() => toggleSort('ticket_number')}>
                  Ticket #
                </SortableTh>
                <Th>Scope</Th>
                <Th>PO Number</Th>
                <Th right>Labour</Th>
                <Th right>Equipment</Th>
                <Th right>Materials</Th>
                <Th right>LOA/Other</Th>
                <SortableTh right active={sortKey === 'face_value'} dir={sortDir} onClick={() => toggleSort('face_value')}>
                  Total
                </SortableTh>
                <th className="px-4 py-2 text-right text-xs font-medium uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => {
                const isExpanded = expanded.has(t.id);
                const cats = categoryTotals(t.line_items);
                return (
                  <TicketRowFragment
                    key={t.id}
                    ticket={t}
                    cats={cats}
                    expanded={isExpanded}
                    onToggle={() => toggleExpand(t.id)}
                    onDelete={() => setDeleting(t)}
                  />
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center text-enbridge-black/55 text-sm">
                    No tickets match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {deleting && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
          onClick={() => deleteStatus !== 'deleting' && setDeleting(null)}
        >
          <div
            className="bg-white rounded-lg p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold tracking-tight">Delete ticket?</h3>
            <p className="mt-2 text-sm text-enbridge-black/75">
              Delete ticket <span className="font-mono">{deleting.ticket_number}</span> ({formatMoney(deleting.face_value)})?
              The PO totals on the dashboard will re-flow. This cannot be undone.
            </p>
            {deleting.is_master && (
              <p className="mt-2 text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded p-2">
                This is a master ticket. Its BOL registrations will also be removed, freeing those BOL numbers to be uploaded again.
              </p>
            )}
            {deleteStatus === 'error' && (
              <p className="mt-3 text-sm text-red-700">{deleteError}</p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setDeleting(null)}
                disabled={deleteStatus === 'deleting'}
                className="px-3 py-2 text-sm rounded border border-black/15 hover:bg-enbridge-paper disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleteStatus === 'deleting'}
                className="px-3 py-2 text-sm rounded bg-red-700 text-white hover:bg-red-800 disabled:opacity-60"
              >
                {deleteStatus === 'deleting' ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th className={`px-4 py-2 text-xs font-medium uppercase tracking-wide ${right ? 'text-right' : 'text-left'}`}>
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
    <th className={`px-4 py-2 text-xs font-medium uppercase tracking-wide ${right ? 'text-right' : 'text-left'}`}>
      <button onClick={onClick} className="inline-flex items-center gap-1 hover:text-enbridge-black">
        {children}
        <span className={`text-enbridge-black/40 ${active ? '' : 'opacity-0 group-hover:opacity-100'}`}>
          {active ? (dir === 'asc' ? '▲' : '▼') : '▾'}
        </span>
      </button>
    </th>
  );
}

function TicketRowFragment({
  ticket,
  cats,
  expanded,
  onToggle,
  onDelete,
}: {
  ticket: TicketRow;
  cats: { labour: number; equipment: number; materials: number; loa_other: number };
  expanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <>
      <tr className="border-t border-black/5 hover:bg-enbridge-paper/60">
        <td className="px-2 py-3 text-center align-top">
          <button
            onClick={onToggle}
            aria-label={expanded ? 'Collapse' : 'Expand'}
            className="text-enbridge-black/50 hover:text-enbridge-black"
          >
            {expanded ? '▾' : '▸'}
          </button>
        </td>
        <td className="px-4 py-3 align-top whitespace-nowrap">{ticket.ticket_date}</td>
        <td className="px-4 py-3 align-top whitespace-nowrap font-mono text-xs">
          {ticket.ticket_number}
          {ticket.is_master && (
            <span className="ml-1 inline-block text-[10px] uppercase tracking-wide bg-enbridge-yellow/30 text-enbridge-black px-1 py-0.5 rounded">
              Master
            </span>
          )}
          {ticket.status === 'invoiced' && (
            <span className="ml-1 inline-block text-[10px] uppercase tracking-wide bg-green-100 text-green-900 px-1 py-0.5 rounded">
              Invoiced
            </span>
          )}
        </td>
        <td className="px-4 py-3 align-top max-w-xs">
          <span className="text-enbridge-black/80 line-clamp-2">{ticket.scope ?? '—'}</span>
        </td>
        <td className="px-4 py-3 align-top whitespace-nowrap font-mono text-xs">{ticket.po_number}</td>
        <td className="px-4 py-3 align-top text-right tabular-nums">
          {cats.labour > 0 ? formatMoney(cats.labour) : '—'}
        </td>
        <td className="px-4 py-3 align-top text-right tabular-nums">
          {cats.equipment > 0 ? formatMoney(cats.equipment) : '—'}
        </td>
        <td className="px-4 py-3 align-top text-right tabular-nums">
          {cats.materials > 0 ? formatMoney(cats.materials) : '—'}
        </td>
        <td className="px-4 py-3 align-top text-right tabular-nums">
          {cats.loa_other > 0 ? formatMoney(cats.loa_other) : '—'}
        </td>
        <td className="px-4 py-3 align-top text-right tabular-nums font-semibold">
          {formatMoney(ticket.face_value)}
        </td>
        <td className="px-4 py-3 align-top text-right whitespace-nowrap">
          {ticket.pdf_storage_path && (
            <button
              onClick={() => viewPdf(ticket.pdf_storage_path!)}
              className="text-xs text-enbridge-black/70 hover:text-enbridge-black underline mr-3"
            >
              View PDF
            </button>
          )}
          <button onClick={onDelete} className="text-xs text-red-700 hover:text-red-900 underline">
            Delete
          </button>
        </td>
      </tr>
      {expanded && (
        <tr className="border-t border-black/5 bg-enbridge-paper/40">
          <td className="px-2 py-4 align-top" />
          <td colSpan={10} className="px-4 py-4 align-top">
            <LineItemsView ticket={ticket} />
          </td>
        </tr>
      )}
    </>
  );
}

function LineItemsView({ ticket }: { ticket: TicketRow }) {
  return (
    <div className="space-y-2">
      <h4 className="text-xs uppercase tracking-wide text-enbridge-black/55">Line items</h4>
      <table className="w-full text-xs">
        <thead className="text-enbridge-black/60">
          <tr className="border-b border-black/10">
            <th className="text-left py-1 pr-2">Category</th>
            <th className="text-left py-1 pr-2">Description</th>
            <th className="text-right py-1 px-2">Qty</th>
            <th className="text-left py-1 px-2">Unit</th>
            <th className="text-right py-1 px-2">Rate</th>
            <th className="text-right py-1 px-2">Source</th>
            <th className="text-right py-1 px-2">Markup</th>
            <th className="text-right py-1 pl-2">Final</th>
          </tr>
        </thead>
        <tbody>
          {ticket.line_items.map((li) => (
            <tr key={li.id} className="border-b border-black/5 last:border-0">
              <td className="py-1.5 pr-2">{CATEGORY_LABEL[li.category]}</td>
              <td className="py-1.5 pr-2 text-enbridge-black/80">{li.description}</td>
              <td className="py-1.5 px-2 text-right tabular-nums">{li.quantity ?? '—'}</td>
              <td className="py-1.5 px-2">{li.unit ?? '—'}</td>
              <td className="py-1.5 px-2 text-right tabular-nums">{li.rate ?? '—'}</td>
              <td className="py-1.5 px-2 text-right tabular-nums">{formatMoney(li.source_amount)}</td>
              <td className="py-1.5 px-2 text-right tabular-nums">
                {li.markup_percent > 0 ? `+${li.markup_percent}%` : '—'}
              </td>
              <td className="py-1.5 pl-2 text-right tabular-nums font-medium">{formatMoney(li.final_amount)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-black/15">
            <td colSpan={7} className="py-1.5 pr-2 text-right text-enbridge-black/60">
              Face value (printed total)
            </td>
            <td className="py-1.5 pl-2 text-right tabular-nums font-semibold">
              {formatMoney(ticket.face_value)}
            </td>
          </tr>
        </tfoot>
      </table>
      {ticket.markup_notes && (
        <p className="text-xs text-enbridge-black/60 italic">{ticket.markup_notes}</p>
      )}
    </div>
  );
}

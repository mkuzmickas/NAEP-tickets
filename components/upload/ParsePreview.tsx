'use client';

import { useMemo, useState } from 'react';
import { formatMoney } from '@/lib/money';
import type { LineItemCategory } from '@/types/database';
import type {
  ExistingTicketSnapshot,
  ParseResult,
  ParsedLineItem,
  ParsedTicket,
} from '@/lib/parse/types';

const CATEGORIES: { value: LineItemCategory; label: string }[] = [
  { value: 'labour', label: 'Labour' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'materials', label: 'Materials' },
  { value: 'loa_other', label: 'LOA/Other' },
];

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

const inputCls =
  'w-full rounded border border-black/20 px-2 py-1 text-sm focus:outline-none focus:border-enbridge-black';

type DiffEntry = { field: string; existing: string; incoming: string };

function lineSummary(li: ParsedLineItem): string {
  const markup = li.markup_percent > 0 ? ` +${li.markup_percent}%` : '';
  return `${li.category} "${li.description}" — src ${formatMoney(li.source_amount)}${markup} → ${formatMoney(li.final_amount)}`;
}

function computeDiff(existing: ExistingTicketSnapshot, incoming: ParsedTicket): DiffEntry[] {
  const diffs: DiffEntry[] = [];

  if (existing.ticket_date !== incoming.ticket_date) {
    diffs.push({
      field: 'Date',
      existing: existing.ticket_date,
      incoming: incoming.ticket_date,
    });
  }
  if (existing.po_number !== incoming.po_number) {
    diffs.push({
      field: 'PO Number',
      existing: existing.po_number,
      incoming: incoming.po_number,
    });
  }
  if (Math.abs(existing.face_value - incoming.face_value) >= 0.005) {
    diffs.push({
      field: 'Face value',
      existing: formatMoney(existing.face_value),
      incoming: formatMoney(incoming.face_value),
    });
  }
  if (existing.is_master !== incoming.is_master) {
    diffs.push({
      field: 'Master ticket?',
      existing: existing.is_master ? 'yes' : 'no',
      incoming: incoming.is_master ? 'yes' : 'no',
    });
  }
  const eBols = [...existing.bol_numbers].sort();
  const iBols = [...incoming.bol_numbers].sort();
  if (eBols.length !== iBols.length || eBols.some((b, i) => b !== iBols[i])) {
    diffs.push({
      field: 'BOL numbers',
      existing: eBols.join(', ') || '(none)',
      incoming: iBols.join(', ') || '(none)',
    });
  }

  const maxLen = Math.max(existing.line_items.length, incoming.line_items.length);
  for (let i = 0; i < maxLen; i++) {
    const e = existing.line_items[i];
    const n = incoming.line_items[i];
    const label = `Line ${i + 1}`;
    if (!e) {
      diffs.push({ field: label, existing: '(not present)', incoming: lineSummary(n) });
    } else if (!n) {
      diffs.push({ field: label, existing: lineSummary(e), incoming: '(removed)' });
    } else {
      const lineChanged =
        e.category !== n.category ||
        e.description !== n.description ||
        Math.abs((e.source_amount ?? 0) - (n.source_amount ?? 0)) >= 0.005 ||
        Math.abs((e.markup_percent ?? 0) - (n.markup_percent ?? 0)) >= 0.005 ||
        Math.abs((e.final_amount ?? 0) - (n.final_amount ?? 0)) >= 0.005;
      if (lineChanged) {
        diffs.push({ field: label, existing: lineSummary(e), incoming: lineSummary(n) });
      }
    }
  }

  return diffs;
}

export function ParsePreview({
  filename,
  initialResult,
  onCommit,
  onReject,
}: {
  filename: string;
  initialResult: ParseResult;
  onCommit: (r: ParseResult, replace?: boolean) => Promise<void>;
  onReject: () => void;
}) {
  const [ticket, setTicket] = useState<ParsedTicket>(initialResult.parsed);
  const [committing, setCommitting] = useState(false);
  const [commitError, setCommitError] = useState('');

  const computed_total = useMemo(
    () => round2(ticket.line_items.reduce((s, li) => s + li.final_amount, 0)),
    [ticket.line_items]
  );
  const diff = round2(computed_total - ticket.face_value);
  const reconciled = Math.abs(diff) < 0.005;

  const dup = initialResult.duplicates;
  const existingSnapshot = dup.existing_ticket_snapshot;
  const hasTicketDup = !!dup.ticket_number_collides_with;

  // Re-run the diff on every state change so user edits to the parsed ticket
  // are reflected (typing a different date in the editable field, etc.).
  const diffs = useMemo(
    () => (existingSnapshot ? computeDiff(existingSnapshot, ticket) : []),
    [existingSnapshot, ticket]
  );

  const isIdenticalDuplicate = !!existingSnapshot && diffs.length === 0;
  const isRevision = !!existingSnapshot && diffs.length > 0;

  // BOL collisions where the master_ticket is the same one we're replacing
  // are "self-collisions" — they'll be deleted by the replace operation
  // before the new insert, so they don't block Replace.
  const blockingBolCollisions = useMemo(() => {
    if (existingSnapshot) {
      return dup.bol_collisions.filter(
        (c) => c.master_ticket !== existingSnapshot.ticket_number
      );
    }
    return dup.bol_collisions;
  }, [dup.bol_collisions, existingSnapshot]);

  const hasBlockingBolDup = blockingBolCollisions.length > 0;

  const canCommitFresh =
    reconciled &&
    !hasTicketDup &&
    !hasBlockingBolDup &&
    initialResult.po_exists &&
    !committing;

  const canReplace =
    isRevision &&
    reconciled &&
    !hasBlockingBolDup &&
    initialResult.po_exists &&
    !committing;

  function updateLine(i: number, patch: Partial<ParsedLineItem>) {
    setTicket((t) => ({
      ...t,
      line_items: t.line_items.map((li, idx) => {
        if (idx !== i) return li;
        const merged: ParsedLineItem = { ...li, ...patch };
        merged.final_amount = round2(
          merged.source_amount * (1 + (merged.markup_percent || 0) / 100)
        );
        return merged;
      }),
    }));
  }

  function addLine() {
    setTicket((t) => ({
      ...t,
      line_items: [
        ...t.line_items,
        {
          category: 'labour',
          description: '',
          quantity: null,
          unit: null,
          rate: null,
          source_amount: 0,
          markup_percent: 0,
          final_amount: 0,
        },
      ],
    }));
  }

  function removeLine(i: number) {
    setTicket((t) => ({
      ...t,
      line_items: t.line_items.filter((_, idx) => idx !== i),
    }));
  }

  async function commit(replace: boolean) {
    setCommitting(true);
    setCommitError('');
    try {
      await onCommit({ ...initialResult, parsed: ticket }, replace);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setCommitError(msg);
    } finally {
      setCommitting(false);
    }
  }

  const showBanners =
    initialResult.warnings.length > 0 ||
    hasTicketDup ||
    blockingBolCollisions.length > 0 ||
    !initialResult.po_exists ||
    commitError;

  return (
    <div className="bg-white rounded-lg border border-black/10 overflow-hidden">
      <div className="px-5 py-3 border-b border-black/10 flex items-baseline justify-between bg-enbridge-paper">
        <div>
          <div className="text-sm font-medium">{filename}</div>
          <div className="text-xs text-enbridge-black/55">
            Format hint: <span className="font-mono">{ticket.format_hint}</span> ·
            Vendor guess: {ticket.vendor_guess || '—'}
            {ticket.is_master && (
              <span className="ml-2 inline-block text-[10px] uppercase tracking-wide bg-enbridge-yellow/30 text-enbridge-black px-1 py-0.5 rounded">
                Master ticket
              </span>
            )}
          </div>
        </div>
        <div className="text-xs">
          {reconciled ? (
            <span className="px-2 py-1 rounded bg-green-100 text-green-900 font-medium">
              ✓ Reconciled
            </span>
          ) : (
            <span className="px-2 py-1 rounded bg-red-100 text-red-900 font-medium">
              Off by {formatMoney(Math.abs(diff))}
            </span>
          )}
        </div>
      </div>

      {showBanners && (
        <div className="px-5 py-3 border-b border-black/10 space-y-2">
          {!initialResult.po_exists && (
            <Banner level="error">
              PO <strong className="font-mono">{ticket.po_number}</strong> not
              found. Fix the PO number below or reject this upload.
            </Banner>
          )}

          {isIdenticalDuplicate && (
            <Banner level="warn">
              Ticket #{' '}
              <strong className="font-mono">{ticket.ticket_number}</strong> is
              already on file with <strong>identical data</strong>. True duplicate
              — nothing to commit. Reject this upload.
            </Banner>
          )}

          {isRevision && (
            <div className="rounded p-3 bg-amber-50 border border-amber-200 text-xs text-amber-900">
              <div className="font-medium text-sm">
                Revision detected for ticket #{' '}
                <span className="font-mono">{ticket.ticket_number}</span>
              </div>
              <div className="mt-1 text-amber-900/80">
                Already on file (PO {existingSnapshot?.po_number}). The new upload
                differs from the existing record. Review the changes below; choose{' '}
                <strong>Replace existing ticket</strong> to overwrite or{' '}
                <strong>Reject</strong> to keep the existing version.
              </div>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-amber-900/70 border-b border-amber-200">
                      <th className="text-left py-1 pr-2">Field</th>
                      <th className="text-left py-1 pr-2">On file</th>
                      <th className="text-left py-1 pl-2">New upload</th>
                    </tr>
                  </thead>
                  <tbody>
                    {diffs.map((d, i) => (
                      <tr key={i} className="border-b border-amber-100 last:border-0 align-top">
                        <td className="py-1 pr-2 font-medium whitespace-nowrap">{d.field}</td>
                        <td className="py-1 pr-2 text-amber-900/90">{d.existing}</td>
                        <td className="py-1 pl-2 text-amber-900/90">{d.incoming}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {hasTicketDup && !existingSnapshot && (
            <Banner level="error">
              Ticket #{' '}
              <strong className="font-mono">{ticket.ticket_number}</strong>{' '}
              matches a BOL number already registered
              {dup.ticket_existing ? ` (${dup.ticket_existing.po_number})` : ''}.
              This number cannot be used as a ticket number.
            </Banner>
          )}

          {blockingBolCollisions.map((c) => (
            <Banner key={c.bol_number} level="error">
              BOL <strong className="font-mono">{c.bol_number}</strong>{' '}
              {c.master_ticket
                ? `already consolidated into master ticket ${c.master_ticket}`
                : 'already on file'}
              .
            </Banner>
          ))}

          {initialResult.warnings.map((w, i) => (
            <Banner key={i} level="warn">
              {w}
            </Banner>
          ))}

          {commitError && <Banner level="error">{commitError}</Banner>}
        </div>
      )}

      <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-4 gap-3 border-b border-black/10">
        <Field label="Ticket #">
          <input
            value={ticket.ticket_number}
            onChange={(e) =>
              setTicket({ ...ticket, ticket_number: e.target.value })
            }
            className={inputCls}
          />
        </Field>
        <Field label="Date">
          <input
            type="date"
            value={ticket.ticket_date}
            onChange={(e) =>
              setTicket({ ...ticket, ticket_date: e.target.value })
            }
            className={inputCls}
          />
        </Field>
        <Field label="PO Number">
          <input
            value={ticket.po_number}
            onChange={(e) => setTicket({ ...ticket, po_number: e.target.value })}
            className={`${inputCls} font-mono`}
          />
        </Field>
        <Field label="Face value (printed total)">
          <input
            type="number"
            step="0.01"
            value={ticket.face_value}
            onChange={(e) =>
              setTicket({ ...ticket, face_value: Number(e.target.value) })
            }
            className={`${inputCls} text-right tabular-nums`}
          />
        </Field>
        {ticket.is_master && (
          <Field
            label="BOL numbers consolidated (comma-separated)"
            className="sm:col-span-4"
          >
            <input
              value={ticket.bol_numbers.join(', ')}
              onChange={(e) =>
                setTicket({
                  ...ticket,
                  bol_numbers: e.target.value
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
              className={`${inputCls} font-mono`}
            />
          </Field>
        )}
      </div>

      <div className="px-5 py-4 border-b border-black/10">
        <div className="flex items-baseline justify-between mb-2">
          <h4 className="text-sm font-semibold tracking-tight">Line items</h4>
          <button
            onClick={addLine}
            className="text-xs text-enbridge-black/70 underline hover:text-enbridge-black"
          >
            + Add line
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-enbridge-black/60">
              <tr className="border-b border-black/10">
                <th className="text-left py-1 pr-2 w-32">Category</th>
                <th className="text-left py-1 pr-2">Description</th>
                <th className="text-right py-1 px-2 w-16">Qty</th>
                <th className="text-left py-1 px-2 w-16">Unit</th>
                <th className="text-right py-1 px-2 w-20">Rate</th>
                <th className="text-right py-1 px-2 w-28">Source $</th>
                <th className="text-right py-1 px-2 w-20">Markup %</th>
                <th className="text-right py-1 px-2 w-28">Final $</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {ticket.line_items.map((li, i) => (
                <tr key={i} className="border-b border-black/5">
                  <td className="py-1 pr-2">
                    <select
                      value={li.category}
                      onChange={(e) =>
                        updateLine(i, {
                          category: e.target.value as LineItemCategory,
                        })
                      }
                      className={`${inputCls} bg-white text-xs`}
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-1 pr-2">
                    <input
                      value={li.description}
                      onChange={(e) =>
                        updateLine(i, { description: e.target.value })
                      }
                      className={`${inputCls} text-xs`}
                    />
                  </td>
                  <td className="py-1 px-2">
                    <input
                      type="number"
                      step="0.01"
                      value={li.quantity ?? ''}
                      onChange={(e) =>
                        updateLine(i, {
                          quantity:
                            e.target.value === '' ? null : Number(e.target.value),
                        })
                      }
                      className={`${inputCls} text-xs text-right`}
                    />
                  </td>
                  <td className="py-1 px-2">
                    <input
                      value={li.unit ?? ''}
                      onChange={(e) =>
                        updateLine(i, { unit: e.target.value || null })
                      }
                      className={`${inputCls} text-xs`}
                    />
                  </td>
                  <td className="py-1 px-2">
                    <input
                      type="number"
                      step="0.01"
                      value={li.rate ?? ''}
                      onChange={(e) =>
                        updateLine(i, {
                          rate:
                            e.target.value === '' ? null : Number(e.target.value),
                        })
                      }
                      className={`${inputCls} text-xs text-right`}
                    />
                  </td>
                  <td className="py-1 px-2">
                    <input
                      type="number"
                      step="0.01"
                      value={li.source_amount}
                      onChange={(e) =>
                        updateLine(i, {
                          source_amount: Number(e.target.value),
                        })
                      }
                      className={`${inputCls} text-xs text-right`}
                    />
                  </td>
                  <td className="py-1 px-2">
                    <input
                      type="number"
                      step="0.01"
                      value={li.markup_percent}
                      onChange={(e) =>
                        updateLine(i, {
                          markup_percent: Number(e.target.value),
                        })
                      }
                      className={`${inputCls} text-xs text-right`}
                    />
                  </td>
                  <td className="py-1 px-2 text-right tabular-nums font-medium">
                    {formatMoney(li.final_amount)}
                  </td>
                  <td className="py-1 px-2">
                    <button
                      onClick={() => removeLine(i)}
                      className="text-red-700 hover:text-red-900"
                      aria-label="Remove line"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-black/15">
                <td
                  colSpan={7}
                  className="py-2 pr-2 text-right text-enbridge-black/60"
                >
                  Sum of line items
                </td>
                <td className="py-2 pl-2 text-right tabular-nums font-semibold">
                  {formatMoney(computed_total)}
                </td>
                <td />
              </tr>
              <tr>
                <td
                  colSpan={7}
                  className="py-1 pr-2 text-right text-enbridge-black/60"
                >
                  Face value (printed)
                </td>
                <td className="py-1 pl-2 text-right tabular-nums">
                  {formatMoney(ticket.face_value)}
                </td>
                <td />
              </tr>
              <tr>
                <td
                  colSpan={7}
                  className="py-1 pr-2 text-right text-enbridge-black/60"
                >
                  Difference
                </td>
                <td
                  className={`py-1 pl-2 text-right tabular-nums ${
                    reconciled ? 'text-green-800' : 'text-red-800'
                  }`}
                >
                  {formatMoney(diff)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="px-5 py-4 flex items-center justify-end gap-2">
        <button
          onClick={onReject}
          disabled={committing}
          className="px-3 py-2 text-sm rounded border border-black/15 hover:bg-enbridge-paper disabled:opacity-60"
        >
          Reject
        </button>
        {isRevision && (
          <button
            onClick={() => commit(true)}
            disabled={!canReplace}
            className="px-3 py-2 text-sm rounded bg-amber-700 text-white hover:bg-amber-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {committing ? 'Replacing…' : 'Replace existing ticket'}
          </button>
        )}
        {!hasTicketDup && (
          <button
            onClick={() => commit(false)}
            disabled={!canCommitFresh}
            className="px-3 py-2 text-sm rounded bg-enbridge-black text-white hover:bg-enbridge-black/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {committing ? 'Committing…' : 'Commit ticket'}
          </button>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-enbridge-black/70 mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}

function Banner({
  level,
  children,
}: {
  level: 'error' | 'warn';
  children: React.ReactNode;
}) {
  const cls =
    level === 'error'
      ? 'bg-red-50 border border-red-200 text-red-900'
      : 'bg-amber-50 border border-amber-200 text-amber-900';
  return <div className={`text-xs rounded p-2 ${cls}`}>{children}</div>;
}

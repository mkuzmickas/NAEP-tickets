'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileSpreadsheet,
  UploadCloud,
  X,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import {
  poFromCsvFilename,
  jobFromTicketNumber,
  JOB_TO_PO,
} from '@/lib/ewp/ticket-ewp';
import type { PoOption } from './ImportModeSwitch';

type ItemStatus = 'ready' | 'error';

type Item = {
  localId: string;
  filename: string;
  content: string;
  /** Actively chosen PO — the value we'll POST. Populated on drop from
   *  filename or job-fallback, then editable via dropdown. */
  po_number: string | null;
  /** How we arrived at po_number the first time — surfaces "inferred from
   *  filename" / "inferred from ticket SL26-101" labels above the dropdown. */
  inferredFrom: 'filename' | 'job' | null;
  status: ItemStatus;
  errorMsg?: string;
};

type PerFileResult = {
  filename: string;
  po_number: string;
  job_prefix: string | null;
  csv_row_count: number;
  void_skipped: number;
  collisions_dropped: number;
  parse_errors: number;
  deleted_from_db: number;
  inserted_to_db: number;
  errors: string[];
};

type ImportResponse = {
  ok: true;
  summary: {
    total_deleted: number;
    total_inserted: number;
    total_void_skipped: number;
    total_collisions_dropped: number;
    per_file: PerFileResult[];
  };
};

function uid() {
  return Math.random().toString(36).slice(2, 11);
}

// Peek at the first data row to derive a job number ("SL26-101") when the
// filename doesn't tell us. Best effort — CSV header can be missing.
function inferJobFromContent(content: string): string | null {
  const lines = content.split(/\r?\n/).slice(0, 20);
  for (const line of lines) {
    const m = line.match(/SL26-\d{3}/);
    if (m) return m[0];
  }
  return null;
}

function inferPoFromContent(content: string): string | null {
  const job = inferJobFromContent(content);
  if (!job) return null;
  const t = jobFromTicketNumber(job);
  return t ? JOB_TO_PO[t] ?? null : null;
}

export function CsvImportFlow({ pos }: { pos: PoOption[] }) {
  const [items, setItems] = useState<Item[]>([]);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [response, setResponse] = useState<ImportResponse | null>(null);
  const router = useRouter();

  useEffect(() => {
    const stop = (e: DragEvent) => e.preventDefault();
    window.addEventListener('dragover', stop);
    window.addEventListener('drop', stop);
    return () => {
      window.removeEventListener('dragover', stop);
      window.removeEventListener('drop', stop);
    };
  }, []);

  const validPos = useMemo(() => new Set(pos.map((p) => p.po_number)), [pos]);

  async function addFiles(files: FileList | File[]) {
    const list = Array.from(files).filter((f) =>
      f.name.toLowerCase().endsWith('.csv')
    );
    for (const f of list) {
      const localId = uid();
      let content = '';
      let status: ItemStatus = 'ready';
      let errorMsg: string | undefined;
      try {
        content = await f.text();
      } catch (e) {
        status = 'error';
        errorMsg = `Read failed: ${e instanceof Error ? e.message : String(e)}`;
      }

      let po: string | null = poFromCsvFilename(f.name);
      let inferredFrom: 'filename' | 'job' | null = po ? 'filename' : null;

      if (!po && content) {
        po = inferPoFromContent(content);
        if (po) inferredFrom = 'job';
      }

      // Guard against a filename inference that doesn't match any real PO
      // in the tracker (e.g. an unrelated four-digit filename).
      if (po && !validPos.has(po)) {
        po = null;
        inferredFrom = null;
      }

      setItems((prev) => [
        ...prev,
        {
          localId,
          filename: f.name,
          content,
          po_number: po,
          inferredFrom,
          status,
          errorMsg,
        },
      ]);
    }
  }

  function updatePo(localId: string, po: string) {
    setItems((prev) =>
      prev.map((it) =>
        it.localId === localId
          ? { ...it, po_number: po || null, inferredFrom: null }
          : it
      )
    );
  }

  function removeItem(localId: string) {
    setItems((prev) => prev.filter((it) => it.localId !== localId));
  }

  const readyItems = items.filter(
    (it) => it.status === 'ready' && it.po_number && it.content
  );
  const canImport = !busy && readyItems.length > 0 && !response;

  async function runImport() {
    if (!canImport) return;
    setBusy(true);
    setResponse(null);
    try {
      const res = await fetch('/api/tickets/import-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: readyItems.map((it) => ({
            filename: it.filename,
            po_number: it.po_number!,
            content: it.content,
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        alert(`Import failed: ${json.error ?? res.statusText}`);
        return;
      }
      setResponse(json as ImportResponse);
      router.refresh();
    } catch (e) {
      alert(`Import failed: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setItems([]);
    setResponse(null);
  }

  return (
    <div className="space-y-5">
      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
        }}
        className={`rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
          dragging
            ? 'border-[var(--brand-orange)] bg-[var(--brand-orange)]/5'
            : 'border-[var(--border)] bg-[var(--surface)]'
        }`}
      >
        <UploadCloud className="w-10 h-10 mx-auto text-[var(--text-muted)] mb-3" />
        <p className="text-sm font-medium text-[var(--text)]">
          Drop the Aimsio CSVs here
        </p>
        <p className="text-xs text-[var(--text-muted)] mt-1 max-w-md mx-auto">
          One file per PO — the client names them{' '}
          <code className="font-mono text-[10px] bg-[var(--surface-2)] px-1 py-0.5 rounded">
            1285.csv
          </code>
          ,{' '}
          <code className="font-mono text-[10px] bg-[var(--surface-2)] px-1 py-0.5 rounded">
            1271.csv
          </code>
          , etc. Filename picks the PO automatically; anything ambiguous shows a
          dropdown.
        </p>
        <label className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[var(--brand-orange)] cursor-pointer hover:opacity-80">
          <input
            type="file"
            accept=".csv,text/csv"
            multiple
            className="sr-only"
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files);
              e.target.value = '';
            }}
          />
          or choose files
        </label>
      </div>

      {/* File list */}
      {items.length > 0 && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
            <div className="text-sm font-semibold">
              {items.length} file{items.length === 1 ? '' : 's'} queued
            </div>
            {!response && (
              <button
                onClick={reset}
                className="text-xs text-[var(--text-muted)] hover:text-[var(--text)]"
              >
                Clear all
              </button>
            )}
          </div>
          <ul className="divide-y divide-[var(--border)]">
            {items.map((it) => (
              <li
                key={it.localId}
                className="px-4 py-3 flex items-start gap-4"
              >
                <FileSpreadsheet
                  className="w-5 h-5 mt-0.5 text-[var(--text-muted)] shrink-0"
                  strokeWidth={2}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">
                    {it.filename}
                  </div>
                  {it.status === 'error' ? (
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-[var(--over)]">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {it.errorMsg}
                    </div>
                  ) : (
                    <div className="mt-2 flex items-center gap-3">
                      <select
                        value={it.po_number ?? ''}
                        onChange={(e) => updatePo(it.localId, e.target.value)}
                        disabled={busy || !!response}
                        className="rounded-md border border-[var(--border)] bg-[var(--surface)] text-xs font-mono px-2 py-1.5 focus:border-[var(--brand-orange)] focus:outline-none disabled:opacity-60"
                      >
                        <option value="">— pick a PO —</option>
                        {pos.map((p) => (
                          <option key={p.po_number} value={p.po_number}>
                            {p.po_number} · {p.vendor_display_name}
                          </option>
                        ))}
                      </select>
                      {it.inferredFrom && (
                        <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                          inferred from{' '}
                          {it.inferredFrom === 'filename'
                            ? 'filename'
                            : 'ticket number'}
                        </span>
                      )}
                      {!it.po_number && (
                        <span className="text-[10px] text-[var(--warn)] font-medium">
                          needs a PO before import
                        </span>
                      )}
                    </div>
                  )}
                </div>
                {!response && (
                  <button
                    onClick={() => removeItem(it.localId)}
                    className="text-[var(--text-muted)] hover:text-[var(--over)]"
                    title="Remove"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Action row */}
      {items.length > 0 && !response && (
        <div className="flex items-center justify-between">
          <div className="text-xs text-[var(--text-muted)] max-w-xl">
            Import is an <span className="font-semibold">atomic per-job replace</span>:
            every existing ticket on the file's job number is cleared, then the
            CSV's rows are inserted. <code className="font-mono">Void</code>{' '}
            rows (Status or CP Approval) are skipped and date-prefixed
            duplicates are collapsed to the last row seen.
          </div>
          <button
            onClick={runImport}
            disabled={!canImport}
            className="inline-flex items-center gap-2 rounded-md bg-[var(--brand-orange)] text-white px-5 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {busy
              ? 'Importing…'
              : `Import ${readyItems.length} file${readyItems.length === 1 ? '' : 's'}`}
          </button>
        </div>
      )}

      {/* Summary card */}
      {response && (
        <div className="rounded-lg border border-[var(--under)] bg-[var(--under-bg)] p-5">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-5 h-5 text-[var(--under)]" strokeWidth={2.5} />
            <div className="text-sm font-semibold text-[var(--under)]">
              Atomic replace complete
            </div>
          </div>
          <div className="grid grid-cols-4 gap-4 text-sm mb-4">
            <SummaryStat
              label="Cleared"
              value={response.summary.total_deleted}
              muted
            />
            <SummaryStat
              label="Inserted"
              value={response.summary.total_inserted}
            />
            <SummaryStat
              label="Void skipped"
              value={response.summary.total_void_skipped}
              muted
            />
            <SummaryStat
              label="Collisions"
              value={response.summary.total_collisions_dropped}
              muted
            />
          </div>
          <div className="border-t border-[var(--border)] pt-3 space-y-3">
            {response.summary.per_file.map((r) => (
              <div key={r.filename} className="text-xs">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className="font-mono font-medium">{r.filename}</span>
                    <span className="text-[var(--text-muted)]"> → </span>
                    <span className="font-mono">{r.po_number}</span>
                    {r.job_prefix && (
                      <span className="text-[var(--text-muted)]">
                        {' · '}job {r.job_prefix}
                      </span>
                    )}
                  </div>
                  <div className="tabular text-[var(--text-muted)] whitespace-nowrap">
                    {r.csv_row_count} rows →{' '}
                    <span className="text-[var(--over)] font-medium">
                      −{r.deleted_from_db}
                    </span>{' '}
                    /{' '}
                    <span className="text-[var(--under)] font-medium">
                      +{r.inserted_to_db}
                    </span>
                    {r.void_skipped > 0 && ` · ${r.void_skipped} void`}
                    {r.collisions_dropped > 0 &&
                      ` · ${r.collisions_dropped} dup`}
                    {r.parse_errors > 0 &&
                      ` · ${r.parse_errors} parse err`}
                  </div>
                </div>
                {r.errors.length > 0 && (
                  <ul className="mt-1 space-y-0.5 pl-3">
                    {r.errors.map((err, i) => (
                      <li key={i} className="text-[var(--over)]">
                        · {err}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={reset}
              className="text-sm font-semibold text-[var(--brand-orange)] hover:opacity-80"
            >
              Import another batch
            </button>
            <button
              onClick={() => router.push('/ticket-map')}
              className="text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)]"
            >
              Open Ticket Map →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryStat({
  label,
  value,
  muted,
}: {
  label: string;
  value: number;
  muted?: boolean;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-[var(--text-muted)] font-semibold">
        {label}
      </div>
      <div
        className={`text-2xl font-semibold tabular tracking-tight mt-1 ${
          muted ? 'text-[var(--text-muted)]' : 'text-[var(--text)]'
        }`}
      >
        {value}
      </div>
    </div>
  );
}

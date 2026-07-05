'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { formatMoney } from '@/lib/money';
import { ParsePreview } from './ParsePreview';
import type { ParseResult } from '@/lib/parse/types';

type ItemStatus = 'uploading' | 'parsing' | 'ready' | 'committed' | 'error';

type Item = {
  localId: string;
  file: File;
  status: ItemStatus;
  storagePath?: string;
  result?: ParseResult;
  errorMsg?: string;
  replaced?: boolean;
};

function uid() {
  return Math.random().toString(36).slice(2, 11);
}

function isCommittable(item: Item): boolean {
  if (item.status !== 'ready' || !item.result) return false;
  const r = item.result;
  if (!r.reconciled) return false;
  if (!r.po_exists) return false;
  if (r.duplicates.ticket_number_collides_with) return false;
  if (r.duplicates.bol_collisions.length > 0) return false;
  return true;
}

export function UploadFlow() {
  const [items, setItems] = useState<Item[]>([]);
  const [dragging, setDragging] = useState(false);
  const [bulkCommitting, setBulkCommitting] = useState(false);
  const router = useRouter();

  // Suppress the browser default of opening a dropped PDF in a new tab
  // when the drop lands anywhere on the upload page (outside or slightly
  // off the dashed drop zone). The drop zone div keeps its own handler
  // for actually processing files dropped inside it.
  useEffect(() => {
    const onDragOver = (e: DragEvent) => e.preventDefault();
    const onDrop = (e: DragEvent) => e.preventDefault();
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('drop', onDrop);
    };
  }, []);

  function patchItem(localId: string, patch: Partial<Item>) {
    setItems((prev) =>
      prev.map((it) => (it.localId === localId ? { ...it, ...patch } : it))
    );
  }

  async function processFile(file: File) {
    const localId = uid();
    setItems((prev) => [...prev, { localId, file, status: 'uploading' }]);

    const supabase = createClient();
    const storagePath = `pending/${crypto.randomUUID()}.pdf`;

    const { error: upErr } = await supabase.storage
      .from('ticket-pdfs')
      .upload(storagePath, file, { contentType: 'application/pdf' });

    if (upErr) {
      patchItem(localId, {
        status: 'error',
        errorMsg: `Upload failed: ${upErr.message}`,
      });
      return;
    }

    patchItem(localId, { status: 'parsing', storagePath });

    try {
      const res = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storage_path: storagePath, filename: file.name }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Parse failed (${res.status})`);
      }
      const result = (await res.json()) as ParseResult;
      patchItem(localId, { status: 'ready', result });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      patchItem(localId, { status: 'error', errorMsg: msg });
    }
  }

  function onFiles(fl: FileList | null) {
    if (!fl) return;
    for (const f of Array.from(fl)) {
      if (
        f.type === 'application/pdf' ||
        f.name.toLowerCase().endsWith('.pdf')
      ) {
        processFile(f);
      }
    }
  }

  async function commitItem(
    localId: string,
    finalResult: ParseResult,
    replace = false,
    skipRefresh = false
  ) {
    const res = await fetch('/api/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        storage_path: finalResult.storage_path,
        parsed: finalResult.parsed,
        replace_existing: replace,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? `Commit failed (${res.status})`);
    }
    patchItem(localId, {
      status: 'committed',
      result: finalResult,
      replaced: replace,
    });
    if (!skipRefresh) router.refresh();
  }

  async function rejectItem(localId: string, storagePath?: string) {
    if (storagePath) {
      const supabase = createClient();
      await supabase.storage.from('ticket-pdfs').remove([storagePath]);
    }
    setItems((prev) => prev.filter((it) => it.localId !== localId));
  }

  return (
    <div className="space-y-6">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          onFiles(e.dataTransfer.files);
        }}
        className={`rounded-lg border-2 border-dashed p-12 text-center transition-colors ${
          dragging
            ? 'border-enbridge-black bg-enbridge-paper'
            : 'border-enbridge-yellow bg-white'
        }`}
      >
        <input
          id="file-input"
          type="file"
          accept="application/pdf"
          multiple
          className="hidden"
          onChange={(e) => onFiles(e.target.files)}
        />
        <label htmlFor="file-input" className="cursor-pointer">
          <div className="text-base font-medium text-enbridge-black">
            Click to add or drag and drop tickets
          </div>
          <div className="mt-1 text-xs text-enbridge-black/55">
            PDF only · multiple files supported
          </div>
        </label>
      </div>

      {items.length > 0 && (
        <div className="space-y-4">
          {(() => {
            const readyCount = items.filter(isCommittable).length;
            const parsingCount = items.filter((i) => i.status === 'uploading' || i.status === 'parsing').length;
            const errorCount = items.filter((i) => i.status === 'error').length;
            const committedCount = items.filter((i) => i.status === 'committed').length;
            const needsReviewCount = items.filter(
              (i) => i.status === 'ready' && !isCommittable(i)
            ).length;
            if (items.length < 2) return null;
            return (
              <div className="rounded-lg border border-black/10 bg-white p-4 flex items-center justify-between gap-4 flex-wrap">
                <div className="text-sm text-enbridge-black/70 tabular-nums">
                  <strong>{readyCount}</strong> ready · {needsReviewCount} need review · {parsingCount} still parsing · {committedCount} committed · {errorCount} error{errorCount === 1 ? '' : 's'}
                </div>
                <button
                  onClick={bulkCommitAll}
                  disabled={readyCount === 0 || bulkCommitting}
                  className="px-4 py-2 rounded bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Commit every card that has a green ✓ Reconciled badge and no duplicate warnings"
                >
                  {bulkCommitting
                    ? `Committing ${readyCount}…`
                    : readyCount === 0
                      ? 'Nothing to bulk-commit'
                      : `Accept & commit all ready (${readyCount})`}
                </button>
              </div>
            );
          })()}
          {items.map((item) => (
            <ItemCard
              key={item.localId}
              item={item}
              onCommit={(r, replace) => commitItem(item.localId, r, replace)}
              onReject={() => rejectItem(item.localId, item.storagePath)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ItemCard({
  item,
  onCommit,
  onReject,
}: {
  item: Item;
  onCommit: (r: ParseResult, replace?: boolean) => Promise<void>;
  onReject: () => void;
}) {
  if (item.status === 'uploading' || item.status === 'parsing') {
    return (
      <div className="bg-white rounded-lg border border-black/10 p-5">
        <div className="text-sm font-medium">{item.file.name}</div>
        <div className="mt-1 text-xs text-enbridge-black/55">
          {item.status === 'uploading'
            ? 'Uploading to storage…'
            : 'Parsing PDF with Claude…'}
        </div>
      </div>
    );
  }

  if (item.status === 'error') {
    return (
      <div className="bg-white rounded-lg border border-red-200 p-5">
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-sm font-medium">{item.file.name}</div>
            <div className="mt-1 text-xs text-red-700">{item.errorMsg}</div>
          </div>
          <button
            onClick={onReject}
            className="text-xs text-enbridge-black/60 underline hover:text-enbridge-black"
          >
            Remove
          </button>
        </div>
      </div>
    );
  }

  if (item.status === 'committed') {
    return (
      <div className="bg-green-50 rounded-lg border border-green-200 p-5">
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-sm font-medium">{item.file.name}</div>
            <div className="mt-1 text-xs text-green-800">
              {item.replaced ? 'Replaced' : 'Committed'}:{' '}
              {item.result?.parsed.ticket_number} (
              {formatMoney(item.result?.parsed.face_value ?? 0)})
            </div>
          </div>
          <button
            onClick={onReject}
            className="text-xs text-enbridge-black/60 underline hover:text-enbridge-black"
          >
            Dismiss
          </button>
        </div>
      </div>
    );
  }

  // status === 'ready'
  return (
    <ParsePreview
      filename={item.file.name}
      initialResult={item.result!}
      onCommit={onCommit}
      onReject={onReject}
    />
  );
}

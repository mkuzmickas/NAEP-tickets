'use client';

import { useState } from 'react';
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
};

function uid() {
  return Math.random().toString(36).slice(2, 11);
}

export function UploadFlow() {
  const [items, setItems] = useState<Item[]>([]);
  const [dragging, setDragging] = useState(false);
  const router = useRouter();

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

  async function commitItem(localId: string, finalResult: ParseResult) {
    const res = await fetch('/api/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        storage_path: finalResult.storage_path,
        parsed: finalResult.parsed,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? `Commit failed (${res.status})`);
    }
    patchItem(localId, { status: 'committed', result: finalResult });
    router.refresh();
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
          {items.map((item) => (
            <ItemCard
              key={item.localId}
              item={item}
              onCommit={(r) => commitItem(item.localId, r)}
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
  onCommit: (r: ParseResult) => Promise<void>;
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
              Committed: {item.result?.parsed.ticket_number} (
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

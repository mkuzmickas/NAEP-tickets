'use client';

import { X } from 'lucide-react';
import { AddPoForm } from '@/components/admin/AddPoForm';

export function AddPoDialog({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-[var(--surface)] rounded-lg shadow-2xl w-full max-w-2xl my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-3 border-b border-[var(--border)] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold tracking-wide uppercase text-[var(--text)]">
              Add a new PO
            </h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Drop the PO PDF to auto-fill, then review and save.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text)]"
            title="Close"
          >
            <X className="h-4 w-4" strokeWidth={2.25} />
          </button>
        </div>
        <div className="p-5">
          <AddPoForm hideToggle onSuccess={onClose} />
        </div>
      </div>
    </div>
  );
}

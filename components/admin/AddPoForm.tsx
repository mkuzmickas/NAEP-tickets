'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const PO_REGEX = /^PUR-6540-\d{7}$/;

const EMPTY_FORM = {
  po_number: '',
  vendor_legal_name: '',
  vendor_display_name: '',
  task_wbs: '',
  scope: '',
  committed_amount: '',
};

export function AddPoForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);

  function clearForm() {
    setForm(EMPTY_FORM);
    setErrorMsg('');
    setSuccessMsg('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    const po = form.po_number.trim().toUpperCase();
    if (!PO_REGEX.test(po)) {
      setSubmitting(false);
      setErrorMsg('PO Number must be in format PUR-6540-XXXXXXX (7 digits after the second dash).');
      return;
    }
    if (!form.vendor_legal_name.trim()) {
      setSubmitting(false);
      setErrorMsg('Vendor legal name is required.');
      return;
    }
    if (!form.vendor_display_name.trim()) {
      setSubmitting(false);
      setErrorMsg('Vendor display name is required.');
      return;
    }
    const committed = Number(form.committed_amount);
    if (!Number.isFinite(committed) || committed <= 0) {
      setSubmitting(false);
      setErrorMsg('Committed amount must be a positive number.');
      return;
    }

    try {
      const res = await fetch('/api/pos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          po_number: po,
          vendor_legal_name: form.vendor_legal_name.trim(),
          vendor_display_name: form.vendor_display_name.trim(),
          task_wbs: form.task_wbs.trim() || null,
          scope: form.scope.trim() || null,
          committed_amount: committed,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Add failed (${res.status})`);
      }
      const data = await res.json();
      setForm(EMPTY_FORM);
      setSuccessMsg(`Added PO ${data.po_number}. The list below has been refreshed.`);
      router.refresh();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-white rounded-lg border border-black/10">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full px-5 py-3 text-left flex items-baseline justify-between hover:bg-enbridge-paper rounded-t-lg"
      >
        <h2 className="text-base font-semibold tracking-tight">Add a new PO</h2>
        <span className="text-xs text-enbridge-black/55">{open ? '▾ Hide' : '▸ Show'}</span>
      </button>
      {open && (
        <form onSubmit={handleSubmit} className="px-5 pb-5 space-y-4 border-t border-black/5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
            <Field label="PO Number" hint="Format: PUR-6540-XXXXXXX">
              <input
                value={form.po_number}
                onChange={(e) => setForm({ ...form, po_number: e.target.value })}
                placeholder="PUR-6540-XXXXXXX"
                className="w-full rounded border border-black/20 px-3 py-2 text-sm font-mono focus:outline-none focus:border-enbridge-black"
                autoComplete="off"
              />
            </Field>
            <Field label="Committed amount ($, pre-tax)" hint="Procurement-cut PO value">
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.committed_amount}
                onChange={(e) => setForm({ ...form, committed_amount: e.target.value })}
                placeholder="0.00"
                className="w-full rounded border border-black/20 px-3 py-2 text-sm text-right tabular-nums focus:outline-none focus:border-enbridge-black"
              />
            </Field>
            <Field label="Vendor legal name" hint="Full registered name — never shown publicly">
              <input
                value={form.vendor_legal_name}
                onChange={(e) => setForm({ ...form, vendor_legal_name: e.target.value })}
                placeholder="VENDOR LEGAL NAME LTD"
                className="w-full rounded border border-black/20 px-3 py-2 text-sm focus:outline-none focus:border-enbridge-black"
                autoComplete="off"
              />
            </Field>
            <Field label="Vendor display name" hint="Short name shown in dashboard + tables">
              <input
                value={form.vendor_display_name}
                onChange={(e) => setForm({ ...form, vendor_display_name: e.target.value })}
                placeholder="e.g. LaPrairie Crane"
                className="w-full rounded border border-black/20 px-3 py-2 text-sm focus:outline-none focus:border-enbridge-black"
                autoComplete="off"
              />
            </Field>
            <Field label="Task / WBS" hint="Optional — e.g. 04.P1.W.WMI.299" className="sm:col-span-2">
              <input
                value={form.task_wbs}
                onChange={(e) => setForm({ ...form, task_wbs: e.target.value })}
                placeholder="04.P1.W.WMI.XXX"
                className="w-full rounded border border-black/20 px-3 py-2 text-sm font-mono focus:outline-none focus:border-enbridge-black"
                autoComplete="off"
              />
            </Field>
            <Field
              label="Scope / description"
              hint="Optional — shown in the dashboard's description column"
              className="sm:col-span-2"
            >
              <textarea
                value={form.scope}
                onChange={(e) => setForm({ ...form, scope: e.target.value })}
                placeholder="What the PO covers"
                rows={2}
                className="w-full rounded border border-black/20 px-3 py-2 text-sm focus:outline-none focus:border-enbridge-black"
              />
            </Field>
          </div>
          {errorMsg && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="text-sm text-green-800 bg-green-50 border border-green-200 rounded p-2">
              {successMsg}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={clearForm}
              disabled={submitting}
              className="px-3 py-2 text-sm rounded border border-black/15 hover:bg-enbridge-paper disabled:opacity-60"
            >
              Clear
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-3 py-2 text-sm rounded bg-enbridge-black text-white hover:bg-enbridge-black/90 disabled:opacity-60"
            >
              {submitting ? 'Saving…' : 'Save PO'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-enbridge-black/70 mb-1">
        {label}
        {hint && (
          <span className="ml-1 font-normal text-enbridge-black/55">— {hint}</span>
        )}
      </label>
      {children}
    </div>
  );
}

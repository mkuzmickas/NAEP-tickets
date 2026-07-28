'use client';

import { useState } from 'react';
import { FileText, FileSpreadsheet } from 'lucide-react';
import { UploadFlow } from './UploadFlow';
import { CsvImportFlow } from './CsvImportFlow';

export type PoOption = {
  po_number: string;
  vendor_display_name: string;
  scope: string | null;
};

type Mode = 'pdf' | 'csv';

export function ImportModeSwitch({ pos }: { pos: PoOption[] }) {
  const [mode, setMode] = useState<Mode>('pdf');

  return (
    <div className="space-y-5">
      <div className="inline-flex rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1">
        <TabButton
          active={mode === 'pdf'}
          onClick={() => setMode('pdf')}
          icon={<FileText className="h-4 w-4" strokeWidth={2.25} />}
          label="Field-ticket PDFs"
          hint="Parse line items with Claude"
        />
        <TabButton
          active={mode === 'csv'}
          onClick={() => setMode('csv')}
          icon={<FileSpreadsheet className="h-4 w-4" strokeWidth={2.25} />}
          label="Aimsio status CSVs"
          hint="Approval + billable, one file per PO"
        />
      </div>

      {mode === 'pdf' ? <UploadFlow /> : <CsvImportFlow pos={pos} />}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2.5 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
        active
          ? 'bg-[var(--brand-orange)] text-white'
          : 'text-[var(--text-muted)] hover:text-[var(--text)]'
      }`}
    >
      {icon}
      <div className="text-left">
        <div className="leading-tight">{label}</div>
        <div
          className={`text-[10px] leading-tight ${
            active ? 'text-white/80' : 'text-[var(--text-muted)]/80'
          }`}
        >
          {hint}
        </div>
      </div>
    </button>
  );
}

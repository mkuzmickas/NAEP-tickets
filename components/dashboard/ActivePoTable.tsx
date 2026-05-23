import { formatMoney, formatPct } from '@/lib/money';
import type { ActivePoSummary } from '@/types/database';

export function ActivePoTable({ rows }: { rows: ActivePoSummary[] }) {
  return (
    <div className="bg-white rounded-lg border border-black/10 overflow-hidden">
      <div className="px-5 py-4 border-b border-black/10 flex items-baseline justify-between">
        <h2 className="text-base font-semibold tracking-tight">Active Purchase Orders</h2>
        <span className="text-xs text-enbridge-black/55">
          {rows.length} active {rows.length === 1 ? 'PO' : 'POs'}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-enbridge-paper text-enbridge-black/70">
            <tr>
              <Th>PO Number</Th>
              <Th>Vendor</Th>
              <Th>Description</Th>
              <Th right>Committed</Th>
              <Th right>Invoiced</Th>
              <Th right>LEM-to-Date</Th>
              <Th right>Total Spent</Th>
              <Th right>Remaining</Th>
              <Th right>% Used</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-black/5 hover:bg-enbridge-paper/60">
                <Td mono>{r.po_number}</Td>
                <Td>{r.vendor_display_name}</Td>
                <Td className="max-w-xs">
                  <span className="text-enbridge-black/80 line-clamp-2">{r.scope ?? '—'}</span>
                </Td>
                <Td right>{formatMoney(r.committed)}</Td>
                <Td right>{formatMoney(r.invoiced)}</Td>
                <Td right>{formatMoney(r.lem_to_date)}</Td>
                <Td right>{formatMoney(r.total_spent)}</Td>
                <Td right>{formatMoney(r.remaining)}</Td>
                <PctCell value={r.pct_used} />
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-enbridge-black/55 text-sm">
                  No active POs yet. A PO becomes active once its first ticket is logged.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
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

function Td({
  children,
  right,
  mono,
  className,
}: {
  children: React.ReactNode;
  right?: boolean;
  mono?: boolean;
  className?: string;
}) {
  return (
    <td
      className={[
        'px-4 py-3 align-top',
        right ? 'text-right tabular-nums' : '',
        mono ? 'font-mono text-xs' : '',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </td>
  );
}

function PctCell({ value }: { value: number }) {
  let bg = '';
  let text = 'text-enbridge-black/75';
  if (value > 100) {
    bg = 'bg-red-100';
    text = 'text-red-900 font-semibold';
  } else if (value > 80) {
    bg = 'bg-amber-100';
    text = 'text-amber-900 font-semibold';
  }
  return (
    <td className={`px-4 py-3 text-right tabular-nums ${bg} ${text}`}>
      {formatPct(value)}
    </td>
  );
}

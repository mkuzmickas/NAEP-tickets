import { getAllPos } from '@/lib/pos';
import { AddPoForm } from '@/components/admin/AddPoForm';
import { formatMoney } from '@/lib/money';

export const revalidate = 0;

export default async function PoAdminPage() {
  const pos = await getAllPos();
  const activeCount = pos.filter((p) => p.is_active).length;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Purchase Orders</h1>
        <p className="text-sm text-enbridge-black/60">
          {pos.length} POs on file · {activeCount} active.
        </p>
      </header>

      <AddPoForm />

      <div className="bg-white rounded-lg border border-black/10 overflow-hidden">
        <div className="px-5 py-3 border-b border-black/10 flex items-baseline justify-between">
          <h2 className="text-base font-semibold tracking-tight">All POs</h2>
          <span className="text-xs text-enbridge-black/55">
            Sorted by active first, then committed amount
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-enbridge-paper text-enbridge-black/70">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide w-20">
                  Status
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide">
                  PO Number
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide">
                  Vendor
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide">
                  Task/WBS
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide">
                  Scope
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium uppercase tracking-wide">
                  Committed
                </th>
              </tr>
            </thead>
            <tbody>
              {pos.map((p) => (
                <tr
                  key={p.id}
                  className="border-t border-black/5 hover:bg-enbridge-paper/60"
                >
                  <td className="px-4 py-3 align-top">
                    {p.is_active ? (
                      <span className="text-[10px] uppercase tracking-wide bg-green-100 text-green-900 px-1.5 py-0.5 rounded">
                        Active
                      </span>
                    ) : (
                      <span className="text-[10px] uppercase tracking-wide bg-black/5 text-enbridge-black/60 px-1.5 py-0.5 rounded">
                        Inactive
                      </span>
                    )}
                  </td>
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
                </tr>
              ))}
              {pos.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-enbridge-black/55 text-sm"
                  >
                    No POs on file yet. Use the form above to add the first one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

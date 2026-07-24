'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { PageContainer } from '@/components/ui/PageContainer';
import {
  Card,
  CardHeader,
  EmptyState,
  PageHeader,
  StatTile,
} from '@/components/ui/Primitives';
import { formatMoney } from '@/lib/money';
import type { TicketMapPo, TicketMapTicket } from '@/lib/ticketMap';

type Status = 'pending' | 'invoiced' | 'rejected';

function shortDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}-${m}`.slice(0, 5) + '/' + y.slice(2);
}

export function TicketMap({
  pos,
  tickets,
  selectedVendor,
}: {
  pos: TicketMapPo[];
  tickets: TicketMapTicket[];
  selectedVendor: string | null;
}) {
  const router = useRouter();

  const vendorList = useMemo(() => {
    const map = new Map<string, { poCount: number }>();
    for (const p of pos) {
      const cur = map.get(p.vendor_display_name) ?? { poCount: 0 };
      cur.poCount++;
      map.set(p.vendor_display_name, cur);
    }
    return Array.from(map.entries())
      .map(([name, meta]) => ({ name, poCount: meta.poCount }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [pos]);

  const vendorPos = useMemo(
    () =>
      selectedVendor
        ? pos.filter((p) => p.vendor_display_name === selectedVendor)
        : [],
    [pos, selectedVendor]
  );

  const ticketsByPo = useMemo(() => {
    const map = new Map<string, TicketMapTicket[]>();
    for (const t of tickets) {
      const arr = map.get(t.po_id) ?? [];
      arr.push(t);
      map.set(t.po_id, arr);
    }
    return map;
  }, [tickets]);

  const totals = useMemo(() => {
    const total = tickets.length;
    const approved = tickets.filter((t) => t.status === 'invoiced').length;
    const pending = tickets.filter((t) => t.status === 'pending').length;
    const valueAtRisk = tickets
      .filter((t) => t.status === 'pending')
      .reduce((s, t) => s + t.face_value, 0);
    const totalValue = tickets.reduce((s, t) => s + t.face_value, 0);
    const pctApproved = total > 0 ? Math.round((approved / total) * 100) : 0;
    return { total, approved, pending, valueAtRisk, totalValue, pctApproved };
  }, [tickets]);

  function selectVendor(v: string | null) {
    if (v === null) {
      router.push('/ticket-map');
    } else {
      router.push(`/ticket-map?vendor=${encodeURIComponent(v)}`);
    }
  }

  return (
    <PageContainer>
      <div className="space-y-6">
        <PageHeader
          title="Ticket Map"
          subtitle={
            <>
              Every field ticket, coloured by Enbridge approval status.{' '}
              <span className="inline-flex items-center gap-1 ml-1">
                <span className="w-2 h-2 rounded-sm bg-green-500" /> Invoiced
              </span>{' '}
              &middot;{' '}
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-sm bg-red-500" /> Pending — at
                risk
              </span>
            </>
          }
        />

        <div className="bg-white rounded-lg border border-black/10 p-4">
          <div className="text-[10px] uppercase tracking-widest text-enbridge-black/55 font-semibold mb-2">
            Vendor
          </div>
          {vendorList.length === 0 ? (
            <div className="text-sm text-enbridge-black/60 italic">
              No vendors on file yet.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => selectVendor(null)}
                className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                  selectedVendor === null
                    ? 'bg-enbridge-black text-white border-enbridge-black font-medium'
                    : 'bg-white text-enbridge-black/70 border-black/15 hover:bg-enbridge-paper'
                }`}
              >
                — Choose a vendor —
              </button>
              {vendorList.map((v) => (
                <button
                  key={v.name}
                  onClick={() => selectVendor(v.name)}
                  className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${
                    selectedVendor === v.name
                      ? 'bg-enbridge-black text-white border-enbridge-black font-medium'
                      : 'bg-white text-enbridge-black/70 border-black/15 hover:bg-enbridge-paper'
                  }`}
                >
                  {v.name}{' '}
                  <span
                    className={`ml-1 text-[10px] ${
                      selectedVendor === v.name
                        ? 'text-white/70'
                        : 'text-enbridge-black/45'
                    }`}
                  >
                    {v.poCount} PO{v.poCount === 1 ? '' : 's'}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedVendor && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatTile
                label="Tickets Issued"
                value={String(totals.total)}
                sub={`across ${vendorPos.length} PO${vendorPos.length === 1 ? '' : 's'} · ${formatMoney(totals.totalValue)}`}
              />
              <StatTile
                label="Approved by Enbridge"
                value={String(totals.approved)}
                sub={`${totals.pctApproved}% approved & billable`}
                tone="under"
              />
              <StatTile
                label="Not Yet Approved"
                value={String(totals.pending)}
                sub="pending / awaiting sign-off"
                tone="warn"
              />
              <StatTile
                label="Value at Risk"
                value={formatMoney(totals.valueAtRisk)}
                sub="not yet billable"
                tone="over"
                emphasis
              />
            </div>

            <div className="space-y-4">
              {vendorPos.length === 0 ? (
                <Card>
                  <EmptyState
                    title="No POs on file for this vendor."
                    hint="Add one from the Purchase Orders page and it will appear here."
                  />
                </Card>
              ) : (
                vendorPos.map((po) => {
                  const poTickets = ticketsByPo.get(po.id) ?? [];
                  const poApproved = poTickets.filter(
                    (t) => t.status === 'invoiced'
                  ).length;
                  const poTotal = poTickets.length;
                  const poValue = poTickets.reduce(
                    (s, t) => s + t.face_value,
                    0
                  );
                  const pctApp =
                    poTotal > 0
                      ? Math.round((poApproved / poTotal) * 100)
                      : null;
                  return (
                    <PoCard
                      key={po.id}
                      po={po}
                      tickets={poTickets}
                      poApproved={poApproved}
                      poTotal={poTotal}
                      poValue={poValue}
                      pctApp={pctApp}
                    />
                  );
                })
              )}
            </div>
          </>
        )}

        {!selectedVendor && vendorList.length > 0 && (
          <Card>
            <EmptyState
              title="Pick a vendor above."
              hint="Every field ticket for that vendor will appear grouped by PO."
            />
          </Card>
        )}
      </div>
    </PageContainer>
  );
}

function PoCard({
  po,
  tickets,
  poApproved,
  poTotal,
  poValue,
  pctApp,
}: {
  po: TicketMapPo;
  tickets: TicketMapTicket[];
  poApproved: number;
  poTotal: number;
  poValue: number;
  pctApp: number | null;
}) {
  const router = useRouter();
  return (
    <Card>
      <CardHeader
        title={po.po_number}
        subtitle={
          <span className="line-clamp-1">
            {po.scope ?? 'No description'}
          </span>
        }
        right={
          <>
            <div className="text-xs text-enbridge-black/60 tabular-nums">
              <strong className="text-enbridge-black">{poTotal}</strong> ticket
              {poTotal === 1 ? '' : 's'} · {formatMoney(poValue)}
            </div>
            <div className="text-[10px] text-enbridge-black/55 tabular-nums mt-0.5">
              Committed {formatMoney(po.committed_amount)}
            </div>
          </>
        }
      />

      {poTotal > 0 && pctApp !== null && (
        <div className="px-5 py-2 border-b border-black/5">
          <div className="flex items-center gap-3 text-xs">
            <div className="flex-1 h-2 bg-red-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all"
                style={{ width: `${pctApp}%` }}
              />
            </div>
            <span className="text-enbridge-black/60 tabular-nums whitespace-nowrap">
              {pctApp}% approved · {poApproved} of {poTotal}
            </span>
          </div>
        </div>
      )}

      <div className="p-4">
        {tickets.length === 0 ? (
          <div className="text-xs text-enbridge-black/40 italic">
            No tickets on file yet.
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {tickets.map((t) => (
              <TicketChip
                key={t.id}
                ticket={t}
                onClick={() =>
                  router.push(
                    `/tickets?po=${encodeURIComponent(po.po_number)}#${encodeURIComponent(t.ticket_number)}`
                  )
                }
              />
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

function TicketChip({
  ticket,
  onClick,
}: {
  ticket: TicketMapTicket;
  onClick: () => void;
}) {
  const cls: Record<Status, string> = {
    invoiced: 'bg-green-50 border-green-400 text-green-900 hover:bg-green-100',
    pending: 'bg-red-50 border-red-400 text-red-900 hover:bg-red-100',
    rejected: 'bg-gray-100 border-gray-300 text-gray-500',
  };
  return (
    <button
      onClick={onClick}
      title={`${ticket.ticket_number}\n${ticket.ticket_date} · ${formatMoney(ticket.face_value)}\nStatus: ${ticket.status}`}
      className={`text-[11px] font-mono px-2 py-1 rounded border ${cls[ticket.status]}`}
    >
      {ticket.ticket_number}
    </button>
  );
}

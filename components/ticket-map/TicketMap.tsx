'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { PageContainer } from '@/components/ui/PageContainer';
import { CheckCircle2, XCircle } from 'lucide-react';
import {
  Badge,
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
          subtitle="Every field ticket, coloured by Enbridge approval status (Invoiced = green, Pending = red / at risk)."
        />

        <Card>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3">
            <div className="text-[0.65rem] uppercase tracking-widest text-[var(--text-muted)] font-semibold">
              Vendor
            </div>
            {vendorList.length === 0 ? (
              <span className="text-sm text-[var(--text-muted)] italic">
                No vendors on file yet.
              </span>
            ) : (
              <>
                <button
                  onClick={() => selectVendor(null)}
                  className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                    selectedVendor === null
                      ? 'bg-enbridge-black text-white'
                      : 'bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text)]'
                  }`}
                >
                  All tickets
                </button>
                <span className="mx-0.5 w-px self-stretch bg-[var(--border)]" />
                {vendorList.map((v) => (
                  <button
                    key={v.name}
                    onClick={() => selectVendor(v.name)}
                    className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                      selectedVendor === v.name
                        ? 'bg-enbridge-black text-white'
                        : 'bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[var(--text)]'
                    }`}
                  >
                    {v.name}
                    <span
                      className={`ml-1.5 tabular text-[0.65rem] ${
                        selectedVendor === v.name
                          ? 'text-white/70'
                          : 'text-[var(--text-muted)]'
                      }`}
                    >
                      {v.poCount}
                    </span>
                  </button>
                ))}
              </>
            )}
          </div>
        </Card>

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
  const poPending = poTotal - poApproved;
  return (
    <Card>
      <CardHeader
        title={po.po_number}
        subtitle={po.scope ?? 'No description'}
        action={
          <div className="flex flex-col items-end gap-1 text-xs">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1 text-[var(--under)]">
                <CheckCircle2 className="h-3.5 w-3.5" /> {poApproved}
              </span>
              <span className="inline-flex items-center gap-1 text-[var(--over)]">
                <XCircle className="h-3.5 w-3.5" /> {poPending}
              </span>
            </div>
            <div className="tabular text-[10px] text-[var(--text-muted)]">
              {poTotal} ticket{poTotal === 1 ? '' : 's'} · {formatMoney(poValue)}
            </div>
            <div className="tabular text-[10px] text-[var(--text-muted)]">
              Committed {formatMoney(po.committed_amount)}
            </div>
          </div>
        }
      />

      {poTotal > 0 && pctApp !== null && (
        <div className="px-5 pt-3">
          <div className="flex h-1.5 overflow-hidden rounded-full bg-[var(--over-bg)]">
            <div
              className="bg-[var(--under)] transition-all"
              style={{ width: `${pctApp}%` }}
            />
          </div>
          <div className="mt-1 text-[0.65rem] text-[var(--text-muted)]">
            {pctApp}% approved · {poApproved} of {poTotal}
          </div>
        </div>
      )}

      <div className="px-5 py-4">
        {tickets.length === 0 ? (
          <div className="text-xs text-[var(--text-muted)] italic">
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
    invoiced:
      'border-[var(--under)] bg-[var(--under-bg)] text-[var(--under)] hover:brightness-95',
    pending:
      'border-[var(--over)] bg-[var(--over-bg)] text-[var(--over)] hover:brightness-95',
    rejected:
      'border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)]',
  };
  return (
    <button
      onClick={onClick}
      title={`${ticket.ticket_number} · ${ticket.ticket_date} · ${formatMoney(ticket.face_value)} · ${ticket.status}`}
      className={`tabular rounded border px-1.5 py-1 text-[0.7rem] font-medium ${cls[ticket.status]}`}
    >
      {ticket.ticket_number}
    </button>
  );
}

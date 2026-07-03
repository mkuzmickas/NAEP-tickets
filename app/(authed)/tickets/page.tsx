import { getAllTickets } from '@/lib/tickets';
import { TicketTable } from '@/components/tickets/TicketTable';
import { PageContainer } from '@/components/ui/PageContainer';

export const revalidate = 0;

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: { po?: string };
}) {
  const tickets = await getAllTickets();
  const initialPoFilter = searchParams.po ?? 'all';

  return (
    <PageContainer>
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">Logged Tickets</h1>
          <p className="text-sm text-enbridge-black/60">
            {tickets.length} {tickets.length === 1 ? 'ticket' : 'tickets'} on file · most recent first
          </p>
        </header>

        <TicketTable
          initialTickets={tickets}
          initialPoFilter={initialPoFilter}
        />
      </div>
    </PageContainer>
  );
}

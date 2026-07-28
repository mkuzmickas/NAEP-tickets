import { getTicketMapData } from '@/lib/ticketMap';
import { TicketMap } from '@/components/ticket-map/TicketMap';

export const revalidate = 0;

export default async function TicketMapPage() {
  const data = await getTicketMapData();
  return <TicketMap data={data} />;
}

import { getAllPosForMap, getTicketsForPoIds } from '@/lib/ticketMap';
import { TicketMap } from '@/components/ticket-map/TicketMap';

export const revalidate = 0;

export default async function TicketMapPage({
  searchParams,
}: {
  searchParams: { vendor?: string };
}) {
  const pos = await getAllPosForMap();

  const selectedVendor =
    typeof searchParams.vendor === 'string' && searchParams.vendor.length > 0
      ? searchParams.vendor
      : null;

  const vendorPoIds = selectedVendor
    ? pos.filter((p) => p.vendor_display_name === selectedVendor).map((p) => p.id)
    : [];

  const tickets = await getTicketsForPoIds(vendorPoIds);

  return (
    <TicketMap pos={pos} tickets={tickets} selectedVendor={selectedVendor} />
  );
}

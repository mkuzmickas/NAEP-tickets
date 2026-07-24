import { getAllVendors, findVendor } from '@/lib/vendors';
import { VendorGrid } from '@/components/vendors/VendorGrid';
import { VendorDetail } from '@/components/vendors/VendorDetail';

export const revalidate = 0;

export default async function VendorsPage({
  searchParams,
}: {
  searchParams: { v?: string };
}) {
  const vendors = await getAllVendors();
  const slug = typeof searchParams.v === 'string' ? searchParams.v : null;
  const selected = slug ? findVendor(vendors, slug) : null;

  if (selected) {
    return <VendorDetail vendor={selected} />;
  }
  return <VendorGrid vendors={vendors} />;
}

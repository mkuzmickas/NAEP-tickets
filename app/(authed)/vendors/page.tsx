import { unstable_noStore as noStore } from 'next/cache';
import { getAllVendors, findVendor } from '@/lib/vendors';
import { VendorGrid } from '@/components/vendors/VendorGrid';
import { VendorDetail } from '@/components/vendors/VendorDetail';

// Force a fresh fetch on every request. `revalidate = 0` alone was letting
// Next.js's fetch cache hold Supabase responses stale after a direct SQL
// write — `dynamic = 'force-dynamic'` + `noStore()` evict every cache layer
// so DB writes land on the vendor page immediately.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function VendorsPage({
  searchParams,
}: {
  searchParams: { v?: string };
}) {
  noStore();
  const vendors = await getAllVendors();
  const slug = typeof searchParams.v === 'string' ? searchParams.v : null;
  const selected = slug ? findVendor(vendors, slug) : null;

  if (selected) {
    return <VendorDetail vendor={selected} />;
  }
  return <VendorGrid vendors={vendors} />;
}

import { getShippingTrackerData } from '@/lib/shippingTracker';
import { ShippingTrackerView } from '@/components/shipping-tracker/ShippingTrackerView';

export const revalidate = 0;

export default async function ShippingTrackerPage() {
  const data = await getShippingTrackerData();
  return <ShippingTrackerView data={data} />;
}

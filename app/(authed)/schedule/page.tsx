import { getAllPackages } from '@/lib/schedule';
import { ScheduleView } from '@/components/schedule/ScheduleView';

export const revalidate = 0;

export default async function SchedulePage() {
  const packages = await getAllPackages();
  return <ScheduleView initialPackages={packages} />;
}

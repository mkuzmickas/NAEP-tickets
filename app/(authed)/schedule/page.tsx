import { getAllPackages, getAllWalkdowns } from '@/lib/schedule';
import { ScheduleView } from '@/components/schedule/ScheduleView';

export const revalidate = 0;

export default async function SchedulePage() {
  const [packages, walkdowns] = await Promise.all([
    getAllPackages(),
    getAllWalkdowns(),
  ]);
  return <ScheduleView initialPackages={packages} initialWalkdowns={walkdowns} />;
}

import {
  getAllPackages,
  getAllWalkdowns,
  getAllEvents,
} from '@/lib/schedule';
import { ScheduleView } from '@/components/schedule/ScheduleView';

export const revalidate = 0;

export default async function SchedulePage() {
  const [packages, walkdowns, events] = await Promise.all([
    getAllPackages(),
    getAllWalkdowns(),
    getAllEvents(),
  ]);
  return (
    <ScheduleView
      initialPackages={packages}
      initialWalkdowns={walkdowns}
      initialEvents={events}
    />
  );
}

import { getSyncStatus, getRecentTickets, aimsioConfigured } from '@/lib/azure/aimsio';
import { SyncView } from '@/components/sync/SyncView';

export const revalidate = 0;

export default async function SyncPage() {
  const [status, recent] = await Promise.all([
    getSyncStatus(),
    aimsioConfigured() ? getRecentTickets(100) : Promise.resolve([]),
  ]);
  return <SyncView status={status} recent={recent} />;
}

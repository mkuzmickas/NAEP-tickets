import { getApexData } from '@/lib/apex';
import { ApexPvfView } from '@/components/pvf/ApexPvfView';

export const revalidate = 0;

export default async function PvfPage() {
  const data = await getApexData();
  return <ApexPvfView data={data} />;
}

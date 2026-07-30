import { getUnapprovedData } from '@/lib/unapproved';
import { UnapprovedView } from '@/components/unapproved/UnapprovedView';

export const revalidate = 0;

export default async function UnapprovedPage() {
  const data = await getUnapprovedData();
  return <UnapprovedView data={data} />;
}

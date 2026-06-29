import { getAllPos } from '@/lib/pos';
import { AddPoForm } from '@/components/admin/AddPoForm';
import { PoListTable } from '@/components/admin/PoListTable';

export const revalidate = 0;

export default async function PoAdminPage() {
  const pos = await getAllPos();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Purchase Orders</h1>
        <p className="text-sm text-enbridge-black/60">
          {pos.length} {pos.length === 1 ? 'PO' : 'POs'} on file.
        </p>
      </header>

      <AddPoForm />

      <PoListTable rows={pos} />
    </div>
  );
}

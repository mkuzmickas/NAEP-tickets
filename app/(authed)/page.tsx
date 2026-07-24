import Link from 'next/link';
import { getActivePoSummary, computeTotals } from '@/lib/dashboard';
import { KpiCards } from '@/components/dashboard/KpiCards';
import { ActivePoTable } from '@/components/dashboard/ActivePoTable';
import { ReadingLegend } from '@/components/dashboard/ReadingLegend';
import { DropZone } from '@/components/dashboard/DropZone';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/Primitives';

export const revalidate = 0;

export default async function DashboardPage() {
  const rows = await getActivePoSummary();
  const totals = computeTotals(rows);

  return (
    <PageContainer>
      <div className="space-y-6">
        <PageHeader
          title="Dashboard"
          subtitle="Snapshot of every active PO on the Aitken Creek Expansion — LEM burn, remaining commit, and vendor reconciliation gap."
          action={
            <Link
              href="/tickets"
              className="rounded-md bg-[var(--text)] text-[var(--surface)] px-4 py-2 text-sm font-semibold hover:opacity-90"
            >
              View all tickets →
            </Link>
          }
        />

        <KpiCards totals={totals} />

        <ActivePoTable rows={rows} />

        <ReadingLegend />

        <DropZone />
      </div>
    </PageContainer>
  );
}

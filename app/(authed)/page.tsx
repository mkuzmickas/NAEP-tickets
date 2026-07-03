import Link from 'next/link';
import { getActivePoSummary, computeTotals } from '@/lib/dashboard';
import { KpiCards } from '@/components/dashboard/KpiCards';
import { ActivePoTable } from '@/components/dashboard/ActivePoTable';
import { ReadingLegend } from '@/components/dashboard/ReadingLegend';
import { DropZone } from '@/components/dashboard/DropZone';
import { PageContainer } from '@/components/ui/PageContainer';

export const revalidate = 0;

export default async function DashboardPage() {
  const rows = await getActivePoSummary();
  const totals = computeTotals(rows);

  return (
    <PageContainer>
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-enbridge-black/60">
            Project 30006386 · Enbridge Gas Inc.
          </p>
        </header>

        <KpiCards totals={totals} />

        <ActivePoTable rows={rows} />

        <ReadingLegend />

        <div className="flex items-center justify-between gap-4 pt-2">
          <Link
            href="/tickets"
            className="rounded bg-enbridge-black text-white px-4 py-2 text-sm font-medium hover:bg-enbridge-black/90"
          >
            View all logged tickets →
          </Link>
        </div>

        <DropZone />
      </div>
    </PageContainer>
  );
}

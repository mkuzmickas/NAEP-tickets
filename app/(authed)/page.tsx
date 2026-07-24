import {
  getActivePoSummary,
  computeTotals,
  getCashFlow,
} from '@/lib/dashboard';
import { KpiCards } from '@/components/dashboard/KpiCards';
import { CashFlowChart } from '@/components/dashboard/CashFlowChart';
import { DropZone } from '@/components/dashboard/DropZone';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/Primitives';

export const revalidate = 0;

export default async function DashboardPage() {
  const [rows, cashFlow] = await Promise.all([
    getActivePoSummary(),
    getCashFlow(),
  ]);
  const totals = computeTotals(rows);

  return (
    <PageContainer>
      <div className="space-y-6">
        <PageHeader
          title="Dashboard"
          subtitle="Program-level snapshot — total committed, LEM burn to date, and cash-flow trajectory against the $35M ceiling through project close."
        />

        <KpiCards totals={totals} />

        <CashFlowChart
          points={cashFlow}
          totalCommitted={totals.totalCommitted}
        />

        <DropZone />
      </div>
    </PageContainer>
  );
}

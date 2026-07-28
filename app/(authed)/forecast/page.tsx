import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/Primitives';
import { getForecastPos } from '@/lib/forecast';
import { ForecastTable } from '@/components/forecast/ForecastTable';

export const revalidate = 0;

export default async function ForecastPage() {
  const rows = await getForecastPos();
  return (
    <PageContainer>
      <div className="space-y-6">
        <PageHeader
          title="Forecast at Completion"
          subtitle={
            <>
              Enter a <span className="font-medium text-[var(--text)]">% complete</span> for each PO. Forecast at Completion is{' '}
              <span className="font-mono text-[var(--text)]">LEM ÷ (% complete)</span>. The sum rolls up to the dashboard and vendor cards; POs without a forecast contribute their committed amount.
            </>
          }
        />
        <ForecastTable rows={rows} />
      </div>
    </PageContainer>
  );
}

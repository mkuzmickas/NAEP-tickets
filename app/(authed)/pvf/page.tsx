import { getApexData } from '@/lib/apex';
import { ApexPvfView } from '@/components/pvf/ApexPvfView';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader, Card } from '@/components/ui/Primitives';

export const revalidate = 0;

export default async function PvfPage() {
  try {
    const data = await getApexData();
    return <ApexPvfView data={data} />;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error && err.stack ? err.stack : '';
    return (
      <PageContainer>
        <PageHeader
          title="Site PVF Tracker"
          subtitle="Failed to load data — see error below."
        />
        <Card>
          <div className="p-5 space-y-3">
            <div className="text-sm font-semibold text-[var(--over)]">Load failed</div>
            <pre className="whitespace-pre-wrap rounded border border-[var(--border)] bg-[var(--surface-2)] p-3 text-xs text-[var(--text)]">
              {message}
            </pre>
            {stack && (
              <details className="text-xs text-[var(--text-muted)]">
                <summary className="cursor-pointer">Stack trace</summary>
                <pre className="mt-2 whitespace-pre-wrap">{stack}</pre>
              </details>
            )}
            <div className="text-xs text-[var(--text-muted)]">
              Common causes: the <code>apex_pos</code> / <code>apex_line_items</code> tables don't
              exist in this Supabase project yet, or RLS is blocking the read. Verify by running{' '}
              <code>select count(*) from public.apex_pos;</code> in Supabase.
            </div>
          </div>
        </Card>
      </PageContainer>
    );
  }
}

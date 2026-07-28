import { createClient } from '@/lib/supabase/server';
import { PageContainer } from '@/components/ui/PageContainer';
import { ImportModeSwitch } from '@/components/upload/ImportModeSwitch';

export const revalidate = 0;

export default async function UploadPage() {
  const supabase = createClient();
  const { data: poRows } = await supabase
    .from('service_pos')
    .select('po_number, vendor_display_name, scope')
    .order('po_number', { ascending: true });

  const pos = (poRows ?? []).map((r) => ({
    po_number: r.po_number as string,
    vendor_display_name: r.vendor_display_name as string,
    scope: (r.scope as string | null) ?? null,
  }));

  return (
    <PageContainer>
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">
            Upload &amp; Reconcile
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1 max-w-2xl">
            Two ways in: drop signed field-ticket PDFs to parse line items, or
            drop the client&apos;s Aimsio &ldquo;ticket status by PO&rdquo; CSV
            exports to import approval status and billable totals.
          </p>
        </header>
        <ImportModeSwitch pos={pos} />
      </div>
    </PageContainer>
  );
}

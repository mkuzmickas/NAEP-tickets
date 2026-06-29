import { createClient } from '@/lib/supabase/server';

export type PoReferenceRow = {
  id: string;
  po_number: string;
  vendor_display_name: string;
  vendor_legal_name: string;
  scope: string | null;
  task_wbs: string | null;
  committed_amount: number;
};

type RawRow = Omit<PoReferenceRow, 'committed_amount'> & {
  committed_amount: string | number;
};

export async function getAllPos(): Promise<PoReferenceRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('v_po_reference')
    .select('*')
    .order('committed_amount', { ascending: false });

  if (error) {
    console.error('getAllPos failed:', error);
    throw new Error(`Failed to fetch POs: ${error.message}`);
  }

  return (data as RawRow[]).map((r) => ({
    id: r.id,
    po_number: r.po_number,
    vendor_display_name: r.vendor_display_name,
    vendor_legal_name: r.vendor_legal_name,
    scope: r.scope,
    task_wbs: r.task_wbs,
    committed_amount: Number(r.committed_amount),
  }));
}

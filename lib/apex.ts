import { createClient } from '@/lib/supabase/server';

export type ApexLineItem = {
  id: string;
  line_number: number;
  size: string | null;
  description: string;
  quantity: number;
  uom: string;
  unit_cost: number;
  amount: number;
  vendor: string | null;
  lead_time: string | null;
  ship_date: string | null;
  received_date: string | null;
  notes: string | null;
};

export type ApexPo = {
  id: string;
  po_number: string;
  ewp: string;
  gle_package: string | null;
  description: string | null;
  requester: string | null;
  supplier: string | null;
  order_date: string | null;
  total_amount: number;
  currency: string | null;
  notes: string | null;
  lines: ApexLineItem[];
  line_count: number;
  lines_dated: number;
  lines_received: number;
};

export type ApexData = {
  pos: ApexPo[];
  totals: {
    po_count: number;
    line_count: number;
    total_value: number;
    lines_dated: number;
    lines_received: number;
  };
};

export async function getApexData(): Promise<ApexData> {
  const supabase = createClient();

  const { data: posRows, error: posErr } = await supabase
    .from('apex_pos')
    .select(
      'id, po_number, ewp, gle_package, description, requester, supplier, order_date, total_amount, currency, notes'
    )
    .order('ewp', { ascending: true })
    .order('po_number', { ascending: true });
  if (posErr) throw new Error(`apex_pos query failed: ${posErr.message}`);

  const { data: lineRows, error: lineErr } = await supabase
    .from('apex_line_items')
    .select(
      'id, apex_po_id, line_number, size, description, quantity, uom, unit_cost, amount, vendor, lead_time, ship_date, received_date, notes'
    )
    .order('line_number', { ascending: true });
  if (lineErr) throw new Error(`apex_line_items query failed: ${lineErr.message}`);

  const linesByPo = new Map<string, ApexLineItem[]>();
  for (const row of lineRows ?? []) {
    const arr = linesByPo.get(row.apex_po_id as string) ?? [];
    arr.push({
      id: row.id as string,
      line_number: row.line_number as number,
      size: (row.size as string | null) ?? null,
      description: row.description as string,
      quantity: Number(row.quantity ?? 0),
      uom: (row.uom as string) ?? 'Each',
      unit_cost: Number(row.unit_cost ?? 0),
      amount: Number(row.amount ?? 0),
      vendor: (row.vendor as string | null) ?? null,
      lead_time: (row.lead_time as string | null) ?? null,
      ship_date: (row.ship_date as string | null) ?? null,
      received_date: (row.received_date as string | null) ?? null,
      notes: (row.notes as string | null) ?? null,
    });
    linesByPo.set(row.apex_po_id as string, arr);
  }

  const pos: ApexPo[] = (posRows ?? []).map((row) => {
    const lines = linesByPo.get(row.id as string) ?? [];
    const lines_dated = lines.filter((l) => l.ship_date).length;
    const lines_received = lines.filter((l) => l.received_date).length;
    return {
      id: row.id as string,
      po_number: row.po_number as string,
      ewp: row.ewp as string,
      gle_package: (row.gle_package as string | null) ?? null,
      description: (row.description as string | null) ?? null,
      requester: (row.requester as string | null) ?? null,
      supplier: (row.supplier as string | null) ?? null,
      order_date: (row.order_date as string | null) ?? null,
      total_amount: Number(row.total_amount ?? 0),
      currency: (row.currency as string | null) ?? 'CAD',
      notes: (row.notes as string | null) ?? null,
      lines,
      line_count: lines.length,
      lines_dated,
      lines_received,
    };
  });

  const totals = pos.reduce(
    (acc, p) => {
      acc.po_count += 1;
      acc.line_count += p.line_count;
      acc.total_value += p.total_amount;
      acc.lines_dated += p.lines_dated;
      acc.lines_received += p.lines_received;
      return acc;
    },
    { po_count: 0, line_count: 0, total_value: 0, lines_dated: 0, lines_received: 0 }
  );

  return { pos, totals };
}

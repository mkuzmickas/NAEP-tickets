import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const maxDuration = 10;
export const runtime = 'nodejs';

const PO_REGEX = /^PUR-6540-\d{7}$/;

type AddPoBody = {
  po_number?: string;
  vendor_legal_name?: string;
  vendor_display_name?: string;
  task_wbs?: string | null;
  project_cost_code?: string | null;
  scope?: string | null;
  committed_amount?: number;
};

/**
 * GET /api/pos?po=PUR-6540-XXXXXXX — cheap existence check.
 * Used by the Upload & Reconcile form so the Commit button can re-enable
 * as soon as the user fixes a typo in the PO number without a full re-parse.
 */
export async function GET(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const po = (new URL(req.url).searchParams.get('po') ?? '').trim().toUpperCase();
  if (!po) {
    return NextResponse.json({ error: 'po query param required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('service_pos')
    .select('po_number, vendor_display_name')
    .eq('po_number', po)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    exists: !!data,
    po_number: data?.po_number ?? null,
    vendor_display_name: data?.vendor_display_name ?? null,
  });
}

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as AddPoBody | null;
  if (!body) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const errors: string[] = [];

  const po_number = (body.po_number ?? '').trim().toUpperCase();
  if (!PO_REGEX.test(po_number)) {
    errors.push(
      'PO Number must be in format PUR-6540-XXXXXXX (7 digits after the second dash).'
    );
  }

  const vendor_legal_name = (body.vendor_legal_name ?? '').trim();
  if (!vendor_legal_name) errors.push('Vendor legal name is required.');

  const vendor_display_name = (body.vendor_display_name ?? '').trim();
  if (!vendor_display_name) errors.push('Vendor display name is required.');

  const committed_amount = Number(body.committed_amount);
  if (!Number.isFinite(committed_amount) || committed_amount <= 0) {
    errors.push('Committed amount must be a positive number.');
  }

  if (errors.length > 0) {
    return NextResponse.json({ error: errors.join(' ') }, { status: 400 });
  }

  const task_wbs = (body.task_wbs ?? '').trim() || null;
  const project_cost_code = (body.project_cost_code ?? '').trim() || null;
  const scope = (body.scope ?? '').trim() || null;

  const { data, error } = await supabase
    .from('service_pos')
    .insert({
      po_number,
      vendor_legal_name,
      vendor_display_name,
      task_wbs,
      project_cost_code,
      scope,
      committed_amount,
      ap_invoiced_amount: 0,
    })
    .select('id, po_number')
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: `PO ${po_number} already exists.` },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    id: data.id,
    po_number: data.po_number,
  });
}

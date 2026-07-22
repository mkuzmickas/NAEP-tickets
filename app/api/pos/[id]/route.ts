import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

type PatchBody = {
  vendor_legal_name?: string;
  vendor_display_name?: string;
  task_wbs?: string | null;
  project_cost_code?: string | null;
  scope?: string | null;
  committed_amount?: number;
  vendor_system_incurred?: number | null;
  vendor_job_ref?: string | null;
};

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as PatchBody | null;
  if (!body) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const errors: string[] = [];
  const updates: Record<string, unknown> = {};

  if (body.vendor_legal_name !== undefined) {
    const v = body.vendor_legal_name.trim();
    if (!v) errors.push('Vendor legal name cannot be empty.');
    else updates.vendor_legal_name = v;
  }
  if (body.vendor_display_name !== undefined) {
    const v = body.vendor_display_name.trim();
    if (!v) errors.push('Vendor display name cannot be empty.');
    else updates.vendor_display_name = v;
  }
  if (body.task_wbs !== undefined) {
    const v = (body.task_wbs ?? '').trim();
    updates.task_wbs = v || null;
  }
  if (body.project_cost_code !== undefined) {
    const v = (body.project_cost_code ?? '').trim();
    updates.project_cost_code = v || null;
  }
  if (body.scope !== undefined) {
    const v = (body.scope ?? '').trim();
    updates.scope = v || null;
  }
  if (body.committed_amount !== undefined) {
    const n = Number(body.committed_amount);
    if (!Number.isFinite(n) || n <= 0) {
      errors.push('Committed amount must be a positive number.');
    } else {
      updates.committed_amount = n;
    }
  }
  if (body.vendor_system_incurred !== undefined) {
    if (body.vendor_system_incurred === null) {
      updates.vendor_system_incurred = null;
    } else {
      const n = Number(body.vendor_system_incurred);
      if (!Number.isFinite(n) || n < 0) {
        errors.push('Vendor system incurred must be zero or a positive number.');
      } else {
        updates.vendor_system_incurred = n;
      }
    }
  }
  if (body.vendor_job_ref !== undefined) {
    const v = (body.vendor_job_ref ?? '').trim();
    updates.vendor_job_ref = v || null;
  }

  if (errors.length > 0) {
    return NextResponse.json({ error: errors.join(' ') }, { status: 400 });
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update.' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('service_pos')
    .update(updates)
    .eq('id', params.id)
    .select('id, po_number')
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? 'PO not found' },
      { status: error?.code === 'PGRST116' ? 404 : 500 }
    );
  }

  return NextResponse.json({ ok: true, id: data.id, po_number: data.po_number });
}

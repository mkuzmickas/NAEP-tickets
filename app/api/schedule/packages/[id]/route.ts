import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

type PatchBody = {
  planned_ship_date?: string | null;
  rts_date?: string | null;
};

function isValidDate(v: unknown): v is string {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

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
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};

  if ('planned_ship_date' in body) {
    const val: string | null = body.planned_ship_date ?? null;
    if (val !== null && !isValidDate(val)) {
      return NextResponse.json(
        { error: 'planned_ship_date must be YYYY-MM-DD or null' },
        { status: 400 }
      );
    }
    updates.planned_ship_date = val;
  }

  if ('rts_date' in body) {
    const val: string | null = body.rts_date ?? null;
    if (val !== null && !isValidDate(val)) {
      return NextResponse.json(
        { error: 'rts_date must be YYYY-MM-DD or null' },
        { status: 400 }
      );
    }
    updates.rts_date = val;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('schedule_packages')
    .update(updates)
    .eq('id', params.id)
    .select('id, rts_date, planned_ship_date')
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? 'Package not found' },
      { status: error?.code === 'PGRST116' ? 404 : 500 }
    );
  }

  return NextResponse.json({ ok: true, ...data });
}

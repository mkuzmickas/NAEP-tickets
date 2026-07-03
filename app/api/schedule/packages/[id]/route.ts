import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

type PatchBody = {
  planned_ship_date?: string | null;
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
  if (!body || !('planned_ship_date' in body)) {
    return NextResponse.json(
      { error: 'planned_ship_date is required (string YYYY-MM-DD or null)' },
      { status: 400 }
    );
  }

  const val = body.planned_ship_date;
  if (val !== null && !/^\d{4}-\d{2}-\d{2}$/.test(val)) {
    return NextResponse.json(
      { error: 'planned_ship_date must be YYYY-MM-DD or null' },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('schedule_packages')
    .update({ planned_ship_date: val, updated_at: new Date().toISOString() })
    .eq('id', params.id)
    .select('id, planned_ship_date')
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? 'Package not found' },
      { status: error?.code === 'PGRST116' ? 404 : 500 }
    );
  }

  return NextResponse.json({ ok: true, ...data });
}

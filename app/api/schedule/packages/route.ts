import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

type Body = {
  ewp?: string;
  tag?: string;
  length_ft?: number | null;
  width_ft?: number | null;
  height_ft?: number | null;
  weight_lbs?: string | null;
  rts_date?: string | null;
  planned_ship_date?: string | null;
  convoy_group?: string | null;
};

function isValidDate(v: unknown): v is string {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const ewp = typeof body.ewp === 'string' ? body.ewp.trim() : '';
  const tag = typeof body.tag === 'string' ? body.tag.trim() : '';
  if (!ewp) return NextResponse.json({ error: 'EWP is required' }, { status: 400 });
  if (!tag) return NextResponse.json({ error: 'Tag / description is required' }, { status: 400 });

  const rts_date = body.rts_date ?? null;
  const planned_ship_date = body.planned_ship_date ?? null;
  if (rts_date !== null && !isValidDate(rts_date)) {
    return NextResponse.json({ error: 'rts_date must be YYYY-MM-DD or null' }, { status: 400 });
  }
  if (planned_ship_date !== null && !isValidDate(planned_ship_date)) {
    return NextResponse.json({ error: 'planned_ship_date must be YYYY-MM-DD or null' }, { status: 400 });
  }

  // Next sort_order = max + 1 (or 0 if table is empty)
  const { data: maxRow } = await supabase
    .from('schedule_packages')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextSort = ((maxRow?.sort_order as number | undefined) ?? -1) + 1;

  const insert = {
    ewp,
    tag,
    length_ft: numOrNull(body.length_ft),
    width_ft: numOrNull(body.width_ft),
    height_ft: numOrNull(body.height_ft),
    weight_lbs: typeof body.weight_lbs === 'string' ? body.weight_lbs.trim() || null : null,
    rts_date,
    planned_ship_date,
    convoy_group: typeof body.convoy_group === 'string' && body.convoy_group.trim()
      ? body.convoy_group.trim()
      : null,
    sort_order: nextSort,
  };

  const { data, error } = await supabase
    .from('schedule_packages')
    .insert(insert)
    .select('*')
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Insert failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, pkg: data });
}

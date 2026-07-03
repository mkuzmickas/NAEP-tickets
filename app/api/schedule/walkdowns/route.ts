import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const event_date = body.event_date;
  const level = body.level;
  const name = typeof body.name === 'string' ? body.name.trim() : '';

  if (typeof event_date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(event_date)) {
    return NextResponse.json({ error: 'event_date must be YYYY-MM-DD' }, { status: 400 });
  }
  if (![30, 60, 90].includes(level)) {
    return NextResponse.json({ error: 'level must be 30, 60, or 90' }, { status: 400 });
  }
  if (!name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('schedule_walkdowns')
    .insert({ event_date, level, name, created_by: user.id })
    .select('id, event_date, level, name')
    .single();

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Insert failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, walkdown: data });
}

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

type PatchBody = {
  event_date?: string;
  level?: number;
  name?: string;
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
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};

  if (body.event_date !== undefined) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(body.event_date)) {
      return NextResponse.json(
        { error: 'event_date must be YYYY-MM-DD' },
        { status: 400 }
      );
    }
    updates.event_date = body.event_date;
  }
  if (body.level !== undefined) {
    if (![30, 60, 90].includes(body.level)) {
      return NextResponse.json(
        { error: 'level must be 30, 60, or 90' },
        { status: 400 }
      );
    }
    updates.level = body.level;
  }
  if (body.name !== undefined) {
    const n = body.name.trim();
    if (!n) {
      return NextResponse.json(
        { error: 'name cannot be empty' },
        { status: 400 }
      );
    }
    updates.name = n;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('schedule_walkdowns')
    .update(updates)
    .eq('id', params.id)
    .select('id, event_date, level, name')
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? 'Not found' },
      { status: error?.code === 'PGRST116' ? 404 : 500 }
    );
  }

  return NextResponse.json({ ok: true, walkdown: data });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { error } = await supabase
    .from('schedule_walkdowns')
    .delete()
    .eq('id', params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

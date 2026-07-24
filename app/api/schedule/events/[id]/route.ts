import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const KINDS = ['blackout', 'milestone', 'note'] as const;

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

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};

  if ('start_date' in body) {
    if (!isValidDate(body.start_date)) {
      return NextResponse.json(
        { error: 'start_date must be YYYY-MM-DD' },
        { status: 400 }
      );
    }
    updates.start_date = body.start_date;
  }
  if ('end_date' in body) {
    if (!isValidDate(body.end_date)) {
      return NextResponse.json(
        { error: 'end_date must be YYYY-MM-DD' },
        { status: 400 }
      );
    }
    updates.end_date = body.end_date;
  }
  if ('name' in body) {
    const v = typeof body.name === 'string' ? body.name.trim() : '';
    if (!v) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    updates.name = v;
  }
  if ('kind' in body) {
    if (!KINDS.includes(body.kind)) {
      return NextResponse.json(
        { error: `kind must be one of ${KINDS.join(', ')}` },
        { status: 400 }
      );
    }
    updates.kind = body.kind;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('schedule_events')
    .update(updates)
    .eq('id', params.id)
    .select('id, start_date, end_date, name, kind')
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? 'Event not found' },
      { status: error?.code === 'PGRST116' ? 404 : 500 }
    );
  }

  return NextResponse.json({ ok: true, event: data });
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
    .from('schedule_events')
    .delete()
    .eq('id', params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

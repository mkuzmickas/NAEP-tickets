import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const KINDS = ['blackout', 'milestone', 'note'] as const;

function isValidDate(v: unknown): v is string {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

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

  const start_date = body.start_date;
  const end_date = body.end_date;
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const kind = body.kind ?? 'blackout';

  if (!isValidDate(start_date) || !isValidDate(end_date)) {
    return NextResponse.json(
      { error: 'start_date and end_date must be YYYY-MM-DD' },
      { status: 400 }
    );
  }
  if (end_date < start_date) {
    return NextResponse.json(
      { error: 'end_date cannot be before start_date' },
      { status: 400 }
    );
  }
  if (!name) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }
  if (!KINDS.includes(kind)) {
    return NextResponse.json(
      { error: `kind must be one of ${KINDS.join(', ')}` },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('schedule_events')
    .insert({
      start_date,
      end_date,
      name,
      kind,
      created_by: user.id,
    })
    .select('id, start_date, end_date, name, kind')
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? 'Insert failed' },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, event: data });
}

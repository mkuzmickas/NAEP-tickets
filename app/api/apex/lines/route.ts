import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

type PatchBody = {
  line_ids?: unknown;
  ship_date?: unknown;      // 'YYYY-MM-DD' or null to clear
  received_date?: unknown;  // 'YYYY-MM-DD' or null to clear
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isIso(v: unknown): v is string {
  return typeof v === 'string' && ISO_DATE.test(v);
}

/**
 * PATCH /api/apex/lines
 * Bulk-update ship_date and/or received_date on a set of apex_line_items.
 * Body: { line_ids: string[], ship_date?: 'YYYY-MM-DD' | null, received_date?: 'YYYY-MM-DD' | null }
 * At least one of ship_date / received_date must be present in the body (null is valid — it clears).
 */
export async function PATCH(req: Request) {
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

  const ids = Array.isArray(body.line_ids)
    ? body.line_ids.filter((v): v is string => typeof v === 'string' && v.length > 0)
    : [];
  if (ids.length === 0) {
    return NextResponse.json({ error: 'line_ids must be a non-empty array' }, { status: 400 });
  }
  if (ids.length > 1000) {
    return NextResponse.json({ error: 'line_ids capped at 1000 per request' }, { status: 400 });
  }

  const patch: { ship_date?: string | null; received_date?: string | null } = {};

  if ('ship_date' in body) {
    if (body.ship_date === null) {
      patch.ship_date = null;
    } else if (isIso(body.ship_date)) {
      patch.ship_date = body.ship_date;
    } else {
      return NextResponse.json(
        { error: 'ship_date must be YYYY-MM-DD or null' },
        { status: 400 }
      );
    }
  }

  if ('received_date' in body) {
    if (body.received_date === null) {
      patch.received_date = null;
    } else if (isIso(body.received_date)) {
      patch.received_date = body.received_date;
    } else {
      return NextResponse.json(
        { error: 'received_date must be YYYY-MM-DD or null' },
        { status: 400 }
      );
    }
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json(
      { error: 'Include at least ship_date or received_date in the body' },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('apex_line_items')
    .update(patch)
    .in('id', ids)
    .select('id, ship_date, received_date');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    updated: data?.length ?? 0,
    lines: data ?? [],
  });
}

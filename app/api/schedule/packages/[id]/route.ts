import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

type PatchBody = {
  tag?: string;
  ewp?: string;
  length_ft?: number | string | null;
  width_ft?: number | string | null;
  height_ft?: number | string | null;
  weight_lbs?: string | null;
  planned_ship_date?: string | null;
  rts_date?: string | null;
  convoy_group?: string | null;
  is_rack?: boolean;
  manually_delivered?: boolean;
};

function isValidDate(v: unknown): v is string {
  return typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
}

/**
 * Coerce a form-string dimension to a numeric value.
 *   ''  or null  -> null (clear the field, e.g. drop-trailer BTEX Tanks)
 *   any parseable number -> number
 *   anything else -> validation error
 */
function coerceDim(v: unknown): { ok: true; value: number | null } | { ok: false } {
  if (v === null || v === undefined || v === '') return { ok: true, value: null };
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return { ok: false };
  return { ok: true, value: n };
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

  if ('tag' in body) {
    const v = typeof body.tag === 'string' ? body.tag.trim() : '';
    if (!v) {
      return NextResponse.json({ error: 'tag must be non-empty' }, { status: 400 });
    }
    updates.tag = v;
  }

  if ('ewp' in body) {
    const v = typeof body.ewp === 'string' ? body.ewp.trim() : '';
    if (!v) {
      return NextResponse.json({ error: 'ewp must be non-empty' }, { status: 400 });
    }
    updates.ewp = v;
  }

  for (const k of ['length_ft', 'width_ft', 'height_ft'] as const) {
    if (k in body) {
      const c = coerceDim(body[k]);
      if (!c.ok) {
        return NextResponse.json({ error: `${k} must be a number or null` }, { status: 400 });
      }
      updates[k] = c.value;
    }
  }

  if ('weight_lbs' in body) {
    const v = body.weight_lbs;
    updates.weight_lbs = v == null || v === '' ? null : String(v).trim();
  }

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

  if ('convoy_group' in body) {
    const v = body.convoy_group;
    updates.convoy_group = v == null || v === '' ? null : String(v).trim();
  }

  if ('is_rack' in body) {
    updates.is_rack = Boolean(body.is_rack);
  }

  if ('manually_delivered' in body) {
    updates.manually_delivered = Boolean(body.manually_delivered);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('schedule_packages')
    .update(updates)
    .eq('id', params.id)
    .select('id, ewp, tag, length_ft, width_ft, height_ft, weight_lbs, rts_date, planned_ship_date, convoy_group, is_rack, is_over_height, sort_order')
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? 'Package not found' },
      { status: error?.code === 'PGRST116' ? 404 : 500 }
    );
  }

  return NextResponse.json({ ok: true, pkg: data });
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
    .from('schedule_packages')
    .delete()
    .eq('id', params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: params.id });
}

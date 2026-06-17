import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

type PatchBody = {
  manual_active_override?: boolean;
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
  if (!body || typeof body.manual_active_override !== 'boolean') {
    return NextResponse.json(
      { error: 'Missing or invalid manual_active_override (boolean required)' },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('service_pos')
    .update({ manual_active_override: body.manual_active_override })
    .eq('id', params.id)
    .select('id, po_number, manual_active_override')
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? 'PO not found' },
      { status: error?.code === 'PGRST116' ? 404 : 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    id: data.id,
    po_number: data.po_number,
    manual_active_override: data.manual_active_override,
  });
}

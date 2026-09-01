import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { syncAimsio } from '@/lib/azure/aimsio';

export const runtime = 'nodejs';
export const maxDuration = 60;   // pull + upserts can chew a few seconds

/**
 * POST /api/sync/aimsio — runs a full sync pass. Auth-gated (any authenticated
 * user; middleware already blocks apex_vendor). Idempotent.
 */
export async function POST() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await syncAimsio(user.email ?? null);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sync failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

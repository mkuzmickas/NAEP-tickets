import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { discoverAimsio } from '@/lib/azure/aimsio';

export const runtime = 'nodejs';
export const maxDuration = 30;

/**
 * POST /api/sync/discover — asks the worker to return the Aimsio schema so
 * Mike can verify column names / table names during initial setup. Never
 * modifies anything. Auth-gated.
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
    const result = await discoverAimsio();
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Discover failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

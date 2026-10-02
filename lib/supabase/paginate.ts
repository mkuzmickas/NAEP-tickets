import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Walk a Supabase/PostgREST query in 1000-row pages. PostgREST's server-side
 * max-rows setting (default 1000) silently overrides any client `.limit()`
 * above it, so a flat `.select()` quietly drops rows off the end once the
 * total exceeds the cap. This helper pages through using `.range()` until
 * it sees a short page.
 *
 * Pass a `queryBuilder` callback that returns a filtered/ordered SELECT
 * query (minus any .range or .limit) — it will be invoked once per page.
 *
 *   const rows = await paginateQuery<MyRow>((from, to) =>
 *     supabase
 *       .from('tickets')
 *       .select('id, po_id, face_value')
 *       .neq('status', 'rejected')
 *       .order('ticket_date', { ascending: true })
 *       .range(from, to)
 *   );
 *
 * The callback must apply the .range() the helper gives it — we don't do
 * it after the fact so TypeScript sees the proper PostgrestFilterBuilder
 * methods for `.from('view')` or `.from('table')` without casts.
 *
 * Hard safety ceiling of 100 pages (100k rows) so a runaway can't melt a
 * lambda. Realistic project volumes will finish in 1–3 pages.
 */
export async function paginateQuery<T>(
  queryBuilder: (from: number, to: number) => PromiseLike<{
    data: T[] | null;
    error: { message: string } | null;
  }>
): Promise<T[]> {
  const CHUNK = 1000;
  const MAX_PAGES = 100;
  const out: T[] = [];
  let from = 0;
  for (let page = 0; page < MAX_PAGES; page++) {
    const { data, error } = await queryBuilder(from, from + CHUNK - 1);
    if (error) {
      throw new Error(`paginateQuery failed on page ${page}: ${error.message}`);
    }
    const rows = (data ?? []) as T[];
    out.push(...rows);
    if (rows.length < CHUNK) return out;
    from += CHUNK;
  }
  return out;
}

// Keep SupabaseClient import but mark it as used for the type side-effect.
// Not referenced by paginateQuery directly — callers reach for it through
// their own createClient() wrapper.
export type { SupabaseClient };

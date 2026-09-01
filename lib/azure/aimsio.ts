/**
 * Aimsio sync client — talks to the read-only sync worker over HTTPS.
 * The worker (a small Node/Express service on a static-IP VPS) is the only
 * thing on the network Aimsio's Azure SQL firewall allows through; this
 * portal never touches Azure SQL directly.
 *
 * Contract (from SureLine spec):
 *   POST /discover   → schema introspection (setup verification)
 *   POST /tickets    → { ok: true, tickets: RawAimsioTicket[] }
 *
 * Auth: Authorization: Bearer <SYNC_WORKER_SECRET>
 * Body: '{}'  (unused today; kept POST for future filter params)
 */

import { createClient } from '@/lib/supabase/server';

// -----------------------------------------------------------------------------
// Config
// -----------------------------------------------------------------------------
export function aimsioConfigured(): boolean {
  return Boolean(
    process.env.SYNC_WORKER_URL && process.env.SYNC_WORKER_SECRET
  );
}

function workerHeaders(): Record<string, string> {
  return {
    'content-type': 'application/json',
    authorization: `Bearer ${process.env.SYNC_WORKER_SECRET ?? ''}`,
  };
}

function workerUrl(path: string): string {
  const base = (process.env.SYNC_WORKER_URL ?? '').replace(/\/+$/, '');
  return `${base}${path}`;
}

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------
type RawAimsioTicket = {
  formDataGuid: string;
  formDataFormNo?: string | null;
  job_no?: string | null;
  job_name?: string | null;
  purchase_order_no?: string | null;
  office_approval_status?: string | null;
  total_billable?: number | string | null;
  ticket_subtotal?: number | string | null;
  client_signature?: string | null;
  supervisor_signature?: string | null;
  date_ASCII?: string | null;
  ewp_count?: number | null;
  ewp_code?: string | null;
};

export type DiscoverResult = {
  ok: true;
  tables: Array<{
    schema: string;
    table: string;
    columns: Array<{ name: string; type: string; nullable: boolean }>;
  }>;
  likely: string[];
};

export type SyncResult = {
  ok: true;
  fetched: number;    // rows returned by the worker
  upserted: number;   // new + still-unapproved rows we wrote
  skipped: number;    // approved rows in the mirror we left alone
  deleted: number;    // voided/draft/vanished rows removed
  excluded: number;   // draft/void rows the worker returned but we didn't mirror
  approved_after: number;
  ticket_after: number;
  by_email: string | null;
};

// -----------------------------------------------------------------------------
// Classification — from SureLine spec §3c
// -----------------------------------------------------------------------------
const APPROVED_STATUSES: ReadonlySet<string> = new Set([
  'approved by client/pm',
  'customer approved',
  'approved by client',
  'approved - revised',
  'approved - opentticket',   // guard for a common misspelling in the source
  'approved - openticket',
  'invoiced client',
]);

const EXCLUDED_STATUSES: ReadonlySet<string> = new Set([
  'voided',
  'entered - openticket',
  'entered - openinvoice',
]);

type Classification = 'approved' | 'unapproved' | 'excluded';

export function classifyStatus(raw: string | null | undefined): Classification {
  const s = (raw ?? '').trim().toLowerCase();
  if (!s) return 'excluded';                    // blank / draft
  if (EXCLUDED_STATUSES.has(s)) return 'excluded';
  if (APPROVED_STATUSES.has(s)) return 'approved';
  return 'unapproved';
}

// -----------------------------------------------------------------------------
// Worker calls
// -----------------------------------------------------------------------------
export async function discoverAimsio(): Promise<DiscoverResult> {
  if (!aimsioConfigured()) {
    throw new Error(
      'Sync is not configured. Set SYNC_WORKER_URL and SYNC_WORKER_SECRET in Vercel env, then redeploy.'
    );
  }
  const res = await fetch(workerUrl('/discover'), {
    method: 'POST',
    headers: workerHeaders(),
    body: '{}',
    cache: 'no-store',
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Worker /discover failed: HTTP ${res.status} ${body.slice(0, 200)}`);
  }
  const j = (await res.json()) as DiscoverResult;
  if (!j.ok) throw new Error('Worker /discover returned ok:false');
  return j;
}

async function fetchTickets(): Promise<RawAimsioTicket[]> {
  const res = await fetch(workerUrl('/tickets'), {
    method: 'POST',
    headers: workerHeaders(),
    body: '{}',
    cache: 'no-store',
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Worker /tickets failed: HTTP ${res.status} ${body.slice(0, 200)}`);
  }
  const j = (await res.json()) as { ok: boolean; tickets?: RawAimsioTicket[] };
  if (!j.ok || !Array.isArray(j.tickets)) {
    throw new Error('Worker /tickets returned malformed payload');
  }
  return j.tickets;
}

// -----------------------------------------------------------------------------
// Mirror
// -----------------------------------------------------------------------------
type NormalizedTicket = {
  guid: string;
  ticket_no: string | null;
  job_no: string | null;
  job_name: string | null;
  client_po: string | null;
  office_status: string | null;
  approved: boolean;
  total_billable_cents: number;
  ticket_date: string | null;
  client_signed: boolean;
  supervisor_signed: boolean;
  ewp_no: number | null;
  ewp_multiple: boolean;
  source: 'aimsio';
};

function toCents(n: number | string | null | undefined): number {
  if (n == null || n === '') return 0;
  const v = typeof n === 'string' ? Number(n) : n;
  if (!Number.isFinite(v)) return 0;
  return Math.round(v * 100);
}

function nullableStr(s: string | null | undefined): string | null {
  const v = (s ?? '').trim();
  return v ? v : null;
}

function normalizeTicket(t: RawAimsioTicket): NormalizedTicket | null {
  if (!t.formDataGuid) return null;
  const cls = classifyStatus(t.office_approval_status);
  const ewpCount = Number(t.ewp_count ?? 0);
  const ewpCodeParsed = t.ewp_code == null ? NaN : parseInt(String(t.ewp_code), 10);
  const isSingleEwp = ewpCount === 1 && Number.isFinite(ewpCodeParsed);
  return {
    guid: String(t.formDataGuid),
    ticket_no: nullableStr(t.formDataFormNo ?? null),
    job_no: nullableStr(t.job_no ?? null),
    job_name: nullableStr(t.job_name ?? null),
    client_po: nullableStr(t.purchase_order_no ?? null),
    office_status: nullableStr(t.office_approval_status ?? null),
    approved: cls === 'approved',
    total_billable_cents: toCents(t.total_billable ?? t.ticket_subtotal ?? 0),
    ticket_date:
      t.date_ASCII && /^\d{4}-\d{2}-\d{2}/.test(t.date_ASCII)
        ? t.date_ASCII.slice(0, 10)
        : null,
    client_signed: Boolean(nullableStr(t.client_signature ?? null)),
    supervisor_signed: Boolean(nullableStr(t.supervisor_signature ?? null)),
    ewp_no: isSingleEwp ? ewpCodeParsed : null,
    ewp_multiple: ewpCount > 1,
    source: 'aimsio',
  };
}

/**
 * Idempotent mirror pass (spec §3d).
 *   1. Fetch everything Aimsio has.
 *   2. Load existing mirror state (guid → {approved}) — Aimsio rows only.
 *   3. For each fetched ticket: excluded → schedule for delete; otherwise
 *      skip if already-approved in the mirror; else upsert.
 *   4. Delete mirror rows whose guid vanished from Aimsio, but only if the
 *      mirror row was not yet approved. Approved rows stay forever.
 *   5. Write the aimsio_sync heartbeat.
 */
export async function syncAimsio(byEmail: string | null): Promise<SyncResult> {
  if (!aimsioConfigured()) {
    throw new Error(
      'Sync is not configured. Set SYNC_WORKER_URL and SYNC_WORKER_SECRET in Vercel env, then redeploy.'
    );
  }

  const supabase = createClient();

  // Existing mirror snapshot — Aimsio rows only, so legacy tickets are never
  // touched by this sync path.
  const { data: existingRows, error: existingErr } = await supabase
    .from('aimsio_ticket')
    .select('guid, approved')
    .eq('source', 'aimsio');
  if (existingErr) throw new Error(`Mirror snapshot failed: ${existingErr.message}`);

  const approvedGuids = new Set<string>();
  const knownGuids = new Set<string>();
  for (const r of existingRows ?? []) {
    knownGuids.add(r.guid as string);
    if (r.approved) approvedGuids.add(r.guid as string);
  }

  // Pull.
  const raw = await fetchTickets();
  const fetched = raw.length;

  const remoteGuids = new Set<string>();
  const upsertRows: NormalizedTicket[] = [];
  let excluded = 0;
  let skipped = 0;

  for (const t of raw) {
    const norm = normalizeTicket(t);
    if (!norm) continue;
    remoteGuids.add(norm.guid);

    const cls = classifyStatus(t.office_approval_status);
    if (cls === 'excluded') {
      // Draft / void — do not mirror. If it exists in the mirror it will be
      // caught by the delete step below.
      excluded++;
      continue;
    }

    // Approved is sticky — leave existing row alone.
    if (approvedGuids.has(norm.guid)) {
      skipped++;
      continue;
    }

    upsertRows.push(norm);
  }

  // Upsert new + still-unapproved rows.
  let upserted = 0;
  if (upsertRows.length > 0) {
    const { error: upErr, count } = await supabase
      .from('aimsio_ticket')
      .upsert(upsertRows, { onConflict: 'guid', count: 'exact' });
    if (upErr) throw new Error(`Mirror upsert failed: ${upErr.message}`);
    upserted = count ?? upsertRows.length;
  }

  // Delete rows that (a) still exist in mirror but are no longer in Aimsio,
  // OR (b) came back excluded (voided/draft) this pull. Never delete approved.
  const toDelete: string[] = [];
  for (const guid of knownGuids) {
    if (approvedGuids.has(guid)) continue;                    // sticky, keep
    if (!remoteGuids.has(guid)) {
      toDelete.push(guid);                                    // vanished
      continue;
    }
  }
  // Also delete excluded rows that were previously mirrored as unapproved.
  for (const t of raw) {
    const cls = classifyStatus(t.office_approval_status);
    if (cls !== 'excluded') continue;
    const g = String(t.formDataGuid ?? '');
    if (!g) continue;
    if (approvedGuids.has(g)) continue;
    if (knownGuids.has(g)) toDelete.push(g);
  }

  let deleted = 0;
  if (toDelete.length > 0) {
    // De-dup and chunk to keep the .in() clause under Postgres limits.
    const uniq = Array.from(new Set(toDelete));
    for (let i = 0; i < uniq.length; i += 500) {
      const chunk = uniq.slice(i, i + 500);
      const { error: delErr, count: delCount } = await supabase
        .from('aimsio_ticket')
        .delete({ count: 'exact' })
        .in('guid', chunk)
        .eq('source', 'aimsio')
        .eq('approved', false);
      if (delErr) throw new Error(`Mirror delete failed: ${delErr.message}`);
      deleted += delCount ?? 0;
    }
  }

  // Post-sync counts (single query, exact).
  const { count: ticketAfter } = await supabase
    .from('aimsio_ticket')
    .select('*', { count: 'exact', head: true })
    .eq('source', 'aimsio');
  const { count: approvedAfter } = await supabase
    .from('aimsio_ticket')
    .select('*', { count: 'exact', head: true })
    .eq('source', 'aimsio')
    .eq('approved', true);

  // Heartbeat.
  const now = new Date().toISOString();
  const { error: hbErr } = await supabase
    .from('aimsio_sync')
    .upsert(
      {
        id: 'current',
        last_synced_at: now,
        ticket_count: ticketAfter ?? 0,
        approved_count: approvedAfter ?? 0,
        by_email: byEmail,
      },
      { onConflict: 'id' }
    );
  if (hbErr) throw new Error(`Heartbeat write failed: ${hbErr.message}`);

  return {
    ok: true,
    fetched,
    upserted,
    skipped,
    deleted,
    excluded,
    approved_after: approvedAfter ?? 0,
    ticket_after: ticketAfter ?? 0,
    by_email: byEmail,
  };
}

// -----------------------------------------------------------------------------
// Read helpers used by /sync page
// -----------------------------------------------------------------------------
export type SyncStatus = {
  configured: boolean;
  last_synced_at: string | null;
  ticket_count: number;
  approved_count: number;
  by_email: string | null;
};

export async function getSyncStatus(): Promise<SyncStatus> {
  const supabase = createClient();
  const { data } = await supabase
    .from('aimsio_sync')
    .select('last_synced_at, ticket_count, approved_count, by_email')
    .eq('id', 'current')
    .maybeSingle();
  return {
    configured: aimsioConfigured(),
    last_synced_at: (data?.last_synced_at as string | null) ?? null,
    ticket_count: (data?.ticket_count as number | null) ?? 0,
    approved_count: (data?.approved_count as number | null) ?? 0,
    by_email: (data?.by_email as string | null) ?? null,
  };
}

export type RecentTicket = {
  guid: string;
  ticket_no: string | null;
  job_no: string | null;
  job_name: string | null;
  client_po: string | null;
  office_status: string | null;
  approved: boolean;
  total_billable_cents: number;
  ticket_date: string | null;
  ewp_no: number | null;
  ewp_multiple: boolean;
  synced_at: string;
};

export async function getRecentTickets(limit = 100): Promise<RecentTicket[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('aimsio_ticket')
    .select(
      'guid, ticket_no, job_no, job_name, client_po, office_status, approved, total_billable_cents, ticket_date, ewp_no, ewp_multiple, synced_at'
    )
    .eq('source', 'aimsio')
    .order('synced_at', { ascending: false })
    .limit(limit);
  return (data ?? []) as RecentTicket[];
}

'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  RefreshCw,
  Search,
  CheckCircle2,
  AlertTriangle,
  Cloud,
  Info,
} from 'lucide-react';
import { PageContainer } from '@/components/ui/PageContainer';
import {
  PageHeader,
  StatTile,
  Card,
  CardHeader,
  EmptyState,
  TableWrap,
  Th,
  Td,
  Badge,
} from '@/components/ui/Primitives';
import { formatMoney } from '@/lib/money';
import type { SyncStatus, RecentTicket } from '@/lib/azure/aimsio';

type SyncResult = {
  ok: true;
  fetched: number;
  upserted: number;
  skipped: number;
  deleted: number;
  excluded: number;
  approved_after: number;
  ticket_after: number;
  by_email: string | null;
};

type DiscoverPeek = {
  ok: true;
  tables: Array<{ schema: string; table: string; columns: Array<{ name: string; type: string; nullable: boolean }> }>;
  likely: string[];
};

function formatSyncTs(iso: string | null): string {
  if (!iso) return 'Never';
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function centsToDollars(cents: number): number {
  return cents / 100;
}

export function SyncView({
  status,
  recent,
}: {
  status: SyncStatus;
  recent: RecentTicket[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyKind, setBusyKind] = useState<null | 'sync' | 'discover'>(null);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err' | 'info'; text: string } | null>(null);
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);
  const [discover, setDiscover] = useState<DiscoverPeek | null>(null);

  async function runSync() {
    setBusyKind('sync');
    setMsg(null);
    try {
      const res = await fetch('/api/sync/aimsio', { method: 'POST' });
      const j = await res.json();
      if (!res.ok) {
        setMsg({ tone: 'err', text: j.error ?? `Sync failed (HTTP ${res.status})` });
        return;
      }
      const r = j as SyncResult;
      setLastResult(r);
      setMsg({
        tone: 'ok',
        text: `Sync complete — ${r.fetched} pulled · ${r.upserted} upserted · ${r.skipped} sticky-approved · ${r.deleted} removed · ${r.excluded} excluded (draft/void).`,
      });
      startTransition(() => router.refresh());
    } catch (e) {
      setMsg({ tone: 'err', text: e instanceof Error ? e.message : 'Network error' });
    } finally {
      setBusyKind(null);
    }
  }

  async function runDiscover() {
    setBusyKind('discover');
    setMsg(null);
    try {
      const res = await fetch('/api/sync/discover', { method: 'POST' });
      const j = await res.json();
      if (!res.ok) {
        setMsg({ tone: 'err', text: j.error ?? `Discover failed (HTTP ${res.status})` });
        return;
      }
      const d = j as DiscoverPeek;
      setDiscover(d);
      setMsg({
        tone: 'info',
        text: `Discovered ${d.tables.length} table${d.tables.length === 1 ? '' : 's'} · ${d.likely.length} look ticket-shaped.`,
      });
    } catch (e) {
      setMsg({ tone: 'err', text: e instanceof Error ? e.message : 'Network error' });
    } finally {
      setBusyKind(null);
    }
  }

  const approvedValue = recent.filter((t) => t.approved).reduce((s, t) => s + t.total_billable_cents, 0);
  const unapprovedValue = recent.filter((t) => !t.approved).reduce((s, t) => s + t.total_billable_cents, 0);

  return (
    <PageContainer>
      <div className="space-y-6">
        <PageHeader
          title="Aimsio Sync"
          subtitle="Pulls Aimsio ticket status into the portal mirror via the read-only sync worker. Approved tickets are sticky — once green, they stay put."
          action={
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={!status.configured || busyKind !== null}
                onClick={runDiscover}
                className="inline-flex items-center gap-1.5 rounded border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-sm font-medium text-[var(--text)] hover:bg-[var(--surface-2)] disabled:opacity-50"
                title="Ask the worker to return the Aimsio schema — read-only, run once during setup"
              >
                <Search className="h-3.5 w-3.5" />
                Discover
              </button>
              <button
                type="button"
                disabled={!status.configured || busyKind !== null || pending}
                onClick={runSync}
                className="inline-flex items-center gap-1.5 rounded bg-enbridge-black px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                title="Pull the latest tickets from Aimsio and update the mirror"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${busyKind === 'sync' ? 'animate-spin' : ''}`} />
                {busyKind === 'sync' ? 'Syncing…' : 'Sync now'}
              </button>
            </div>
          }
        />

        {!status.configured && (
          <Card>
            <CardHeader title="Sync not configured" />
            <div className="px-5 py-4 text-sm text-[var(--text)] space-y-2">
              <p>
                The Vercel deployment is missing <code className="rounded bg-[var(--surface-2)] px-1">SYNC_WORKER_URL</code>{' '}
                and/or <code className="rounded bg-[var(--surface-2)] px-1">SYNC_WORKER_SECRET</code>. Without those
                the portal can't reach the sync worker.
              </p>
              <p className="text-[var(--text-muted)]">
                See <code>SYNC_SETUP.md</code> at the repo root for the full setup (worker
                deploy, Azure SQL creds, IP allow-list, env vars, migration).
              </p>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatTile
            label="Last Synced"
            value={formatSyncTs(status.last_synced_at)}
            sub={status.by_email ? `by ${status.by_email}` : status.last_synced_at ? '—' : 'no sync yet'}
            tone={status.last_synced_at ? 'info' : 'warn'}
          />
          <StatTile
            label="Tickets in Mirror"
            value={String(status.ticket_count)}
            sub={`${recent.length} shown below`}
          />
          <StatTile
            label="Approved"
            value={String(status.approved_count)}
            sub={
              status.ticket_count > 0
                ? `${Math.round((status.approved_count / status.ticket_count) * 100)}% of mirror`
                : '—'
            }
            tone="under"
          />
          <StatTile
            label="Recent Values"
            value={formatMoney(centsToDollars(approvedValue))}
            sub={`+ ${formatMoney(centsToDollars(unapprovedValue))} unapproved`}
            emphasis
          />
        </div>

        {msg && (
          <div
            className={`flex items-start gap-2 rounded border px-3 py-2 text-sm ${
              msg.tone === 'ok'
                ? 'border-[var(--under)]/40 bg-[var(--under-bg)] text-[var(--under)]'
                : msg.tone === 'err'
                  ? 'border-[var(--over)]/40 bg-[var(--over-bg)] text-[var(--over)]'
                  : 'border-[var(--info)]/40 bg-[var(--info-bg)] text-[var(--info)]'
            }`}
          >
            {msg.tone === 'ok' ? (
              <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
            ) : msg.tone === 'err' ? (
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            ) : (
              <Info className="h-4 w-4 mt-0.5 shrink-0" />
            )}
            <span>{msg.text}</span>
          </div>
        )}

        {lastResult && (
          <Card>
            <CardHeader
              title="Last sync detail"
              subtitle="Every field the pull returned. Compare against the ticket table below to sanity-check."
            />
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3 px-5 py-4 text-sm">
              <Metric label="Fetched" value={lastResult.fetched} />
              <Metric label="Upserted" value={lastResult.upserted} tone="info" />
              <Metric label="Sticky-approved" value={lastResult.skipped} />
              <Metric label="Removed" value={lastResult.deleted} tone={lastResult.deleted > 0 ? 'warn' : 'neutral'} />
              <Metric label="Excluded (draft/void)" value={lastResult.excluded} />
              <Metric label="Mirror total" value={lastResult.ticket_after} tone="info" />
            </div>
          </Card>
        )}

        {discover && (
          <Card>
            <CardHeader
              title="Discover result"
              subtitle={`${discover.tables.length} tables · ${discover.likely.length} likely ticket-related`}
            />
            <div className="px-5 py-4 text-xs">
              <div className="mb-2 font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Likely ticket tables
              </div>
              {discover.likely.length === 0 ? (
                <div className="text-[var(--text-muted)]">
                  Nothing matched ticket/project/status keywords — worker may be pointing at the wrong DB.
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {discover.likely.map((t) => (
                    <Badge key={t} tone="info">{t}</Badge>
                  ))}
                </div>
              )}
            </div>
          </Card>
        )}

        <Card>
          <CardHeader
            title="Recent mirrored tickets"
            subtitle={`Newest ${Math.min(recent.length, 100)} rows by sync time.`}
            action={
              <span className="inline-flex items-center gap-1 text-xs text-[var(--text-muted)]">
                <Cloud className="h-3 w-3" /> source = 'aimsio'
              </span>
            }
          />
          {recent.length === 0 ? (
            <EmptyState
              title="Mirror is empty"
              hint={
                status.configured
                  ? 'Hit "Sync now" to pull tickets from Aimsio.'
                  : 'Configure SYNC_WORKER_URL and SYNC_WORKER_SECRET first.'
              }
            />
          ) : (
            <TableWrap>
              <table className="w-full">
                <thead className="bg-[var(--surface-2)]">
                  <tr>
                    <Th>Ticket #</Th>
                    <Th>Job</Th>
                    <Th>Client PO</Th>
                    <Th>Date</Th>
                    <Th>EWP</Th>
                    <Th>Status</Th>
                    <Th right>Value</Th>
                    <Th>State</Th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((t) => (
                    <tr key={t.guid} className="border-t border-[var(--border)]">
                      <Td mono>{t.ticket_no ?? '—'}</Td>
                      <Td>
                        <div className="font-mono text-xs">{t.job_no ?? '—'}</div>
                        {t.job_name && (
                          <div className="text-xs text-[var(--text-muted)] truncate max-w-[240px]">
                            {t.job_name}
                          </div>
                        )}
                      </Td>
                      <Td mono muted>{t.client_po ?? '—'}</Td>
                      <Td mono>{t.ticket_date ?? '—'}</Td>
                      <Td mono>
                        {t.ewp_multiple ? (
                          <Badge tone="warn">multi</Badge>
                        ) : t.ewp_no != null ? (
                          <Badge tone="info">EWP {t.ewp_no}</Badge>
                        ) : (
                          <span className="text-[var(--text-muted)]">—</span>
                        )}
                      </Td>
                      <Td muted>
                        <span className="text-xs">{t.office_status ?? '—'}</span>
                      </Td>
                      <Td right mono>
                        {formatMoney(centsToDollars(t.total_billable_cents))}
                      </Td>
                      <Td>
                        {t.approved ? (
                          <Badge tone="under">approved</Badge>
                        ) : (
                          <Badge tone="over">unapproved</Badge>
                        )}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          )}
        </Card>
      </div>
    </PageContainer>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone?: 'info' | 'warn' | 'neutral' }) {
  const color =
    tone === 'info' ? 'text-[var(--info)]' :
    tone === 'warn' ? 'text-[var(--warn)]' :
    'text-[var(--text)]';
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">{label}</div>
      <div className={`tabular text-lg font-semibold ${color}`}>{value}</div>
    </div>
  );
}

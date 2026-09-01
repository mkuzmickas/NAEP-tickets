# Aimsio Sync — Setup Guide

**Not SQL — reference for standing up the read-only Aimsio → NAEP portal sync.**

Adapted directly from the SureLine spec Mike delivered on 2026-09-01. Same
worker architecture, same sticky-approved rule, same tables — just wired into
this codebase.

---

## Architecture recap

Aimsio's Azure SQL firewall allow-lists **one IP**. Vercel egress rotates. Fix:
a small worker on a static-IP VPS that mediates.

```
Portal (Vercel) ──HTTPS+Bearer──▶ Sync worker (static-IP VPS) ──TLS──▶ Aimsio Azure SQL
     │                                                                (read-only)
     └─ mirrors classified tickets into Supabase (aimsio_ticket + friends)
```

The portal never sees Aimsio credentials. The worker never writes to Aimsio.

---

## One-time setup

### 1. Stand up the sync worker

Deploy the SureLine worker's Docker image (or a fresh copy of the same
`azure-sync-worker/` service) on a small VPS with a static outbound IP.
Node + Express + `mssql` + Caddy for HTTPS. Endpoints:

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Liveness |
| GET | `/ip` | Returns egress IP → give this to Aimsio to allow-list |
| POST | `/discover` | Schema introspection |
| POST | `/tickets` | Ticket pull |

Worker env (never leaves the VPS):
- `AIMSIO_SQL_SERVER`, `AIMSIO_SQL_DATABASE`, `AIMSIO_SQL_USER`, `AIMSIO_SQL_PASSWORD` — Aimsio-issued read-only creds
- `SYNC_WORKER_SECRET` — long random shared secret
- `PORT` (default 8080)

Azure SQL requires TLS: `options: { encrypt: true, trustServerCertificate: false }`.

### 2. Get the egress IP allow-listed at Aimsio

```
curl https://<worker-host>/ip
```

Hand that IP to Aimsio Support. On some hosts egress uses a small fixed set —
hit `/ip` a few times and allow-list all of them.

### 3. Run the migration

Paste [db/migrations/0018_add_aimsio_sync_tables.sql](db/migrations/0018_add_aimsio_sync_tables.sql)
into the Supabase SQL editor. Creates four tables plus explicit table grants
(learned from the Apex PVF debug in August):

- `aimsio_ticket` — mirrored ticket rows, PK `guid` = Aimsio `formDataGuid`
- `aimsio_sync` — single heartbeat row (`id = 'current'`)
- `sync_project` — portal-side project defs (seeded with `aitken-creek`)
- `sync_job_map` — Aimsio `job_no` → `sync_project.id`

Money is stored in **cents** (bigint), never dollars.

### 4. Portal env (Vercel → Settings → Environment Variables)

```
SYNC_WORKER_URL      = https://sync.<your-domain>
SYNC_WORKER_SECRET   = <the same long random string from the worker>
```

Redeploy so Vercel picks up the new env.

### 5. Verify

- Log in to the portal
- Sidebar → **Intake → Aimsio Sync**
- Click **Discover** — should list the Aimsio tables (setup smoke test)
- Click **Sync now** — pulls tickets, populates the mirror, writes a heartbeat

The stat tiles at the top show last-synced timestamp + counts. The table at
the bottom is the 100 most recently synced tickets.

---

## Day-to-day operation

- **Sync now** is idempotent — safe to click as often as you want.
- **Approved is sticky** — once a ticket is `approved = true` in the mirror,
  a subsequent sync will not touch that row. Approvals are considered final.
  If Aimsio actually revokes an approval (rare), delete the row manually and
  sync again.
- Voided / draft / blank-status tickets are **excluded** — they do not enter
  the mirror, and if they were previously mirrored as unapproved they are
  removed on the next sync.
- Tickets that disappear from Aimsio entirely (physical delete) are removed
  from the mirror on the next sync, unless they were already approved.

Recommended cadence: manual (button) for now. Once the sync is trusted, wire
a Vercel Cron job to `POST /api/sync/aimsio` on an hourly schedule.

---

## Job → Project mapping

Aimsio tickets carry a `job_no` like `SL26-101`. The portal groups mirrored
tickets by job. To roll jobs up into a project (e.g. Aitken Creek), insert
into `sync_job_map`:

```sql
insert into public.sync_job_map (job_no, project_id) values
  ('SL26-101', 'aitken-creek'),
  ('SL26-102', 'aitken-creek')
on conflict (job_no) do update set project_id = excluded.project_id;
```

The default project `aitken-creek` is already seeded. Add more via
`insert into public.sync_project (id, name) values ('other-id', 'Name')`.

---

## Classification (from SureLine spec §3c)

```
approved:  Approved by Client/PM, Customer Approved, Approved by Client,
           Approved - Revised, Approved - OpenTicket, Invoiced Client
excluded:  Voided, Entered - OpenTicket, Entered - OpenInvoice, blank/null
unapproved: everything else that is tracked
```

Matching is **case-insensitive** and whitespace-trimmed. See
[lib/azure/aimsio.ts](lib/azure/aimsio.ts) `classifyStatus()`.

---

## EWP derivation

Each ticket's EWP is the **first 2 digits of the 6-digit `wbsActivityCode`**
on its labour lines (from the worker's `/tickets` SQL). If the ticket's
labour spans multiple EWPs, `ewp_count > 1` and the mirror row carries
`ewp_multiple = true` with `ewp_no = null`. If all labour maps to one EWP,
`ewp_no` is populated.

4-digit WBS codes (overhead) are excluded from EWP counting — see the CTE
in the worker's ticket query.

---

## Files

- **[db/migrations/0018_add_aimsio_sync_tables.sql](db/migrations/0018_add_aimsio_sync_tables.sql)** — schema
- **[lib/azure/aimsio.ts](lib/azure/aimsio.ts)** — worker client, classifier, mirror pass
- **[app/api/sync/aimsio/route.ts](app/api/sync/aimsio/route.ts)** — Sync-now endpoint
- **[app/api/sync/discover/route.ts](app/api/sync/discover/route.ts)** — Discover endpoint
- **[app/(authed)/sync/page.tsx](app/(authed)/sync/page.tsx)** — page shell
- **[components/sync/SyncView.tsx](components/sync/SyncView.tsx)** — UI

---

## Troubleshooting

**"Sync is not configured"** — env vars missing. Set `SYNC_WORKER_URL` and
`SYNC_WORKER_SECRET` in Vercel, redeploy.

**HTTP 401/403 from worker** — Bearer secret mismatch. Regenerate the shared
secret, set it on both sides.

**HTTP 500 from worker with mssql timeout** — Aimsio hasn't allow-listed the
worker's IP yet, or the IP has drifted. Hit `GET /ip` on the worker, confirm
Aimsio has it.

**"permission denied for table aimsio_ticket"** on `/sync` load — migration
0018 didn't grant table-level SELECT. Re-run the grant block at the bottom
of the migration.

**Mirror shows tickets but they never turn approved** — verify Aimsio's
`office_approval_status` values against the classifier in
[lib/azure/aimsio.ts](lib/azure/aimsio.ts). If your instance uses different
strings, extend `APPROVED_STATUSES`.

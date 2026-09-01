-- =============================================================================
-- 0018: Aimsio ticket sync mirror tables
-- =============================================================================
-- Mirrors ticket state pulled from Aimsio (Azure SQL) via the read-only sync
-- worker. See SYNC_SETUP.md at the repo root for the full architecture.
--
-- Design constants (from the SureLine spec):
--   • Money stored in CENTS (integer), never dollars.
--   • aimsio_ticket.guid  = Aimsio formDataGuid  (natural key, unique).
--   • Approved rows are STICKY — a sync run does not touch them again.
--   • ewp_no is populated only when ewp_count = 1 in the pull; ewp_multiple
--     flags tickets whose labour lines span multiple EWPs.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- aimsio_ticket — one row per non-deleted Aimsio work-management ticket
-- ---------------------------------------------------------------------------
create table if not exists public.aimsio_ticket (
  guid                  text primary key,               -- Aimsio formDataGuid
  ticket_no             text,                           -- formDataFormNo
  job_no                text,                           -- e.g. 'SL26-101'
  job_name              text,
  client_po             text,                           -- purchase_order_no
  office_status         text,                           -- raw Aimsio office_approval_status
  approved              boolean not null default false, -- derived from office_status
  total_billable_cents  bigint  not null default 0,
  ticket_date           date,                           -- first 10 chars of date_ASCII
  client_signed         boolean not null default false,
  supervisor_signed     boolean not null default false,
  ewp_no                int,                            -- null unless ewp_count = 1
  ewp_multiple          boolean not null default false, -- true when ewp_count > 1
  source                text    not null default 'aimsio'
                          check (source = 'aimsio'),
  synced_at             timestamptz not null default now()
);

create index if not exists aimsio_ticket_job_no_idx
  on public.aimsio_ticket (job_no);
create index if not exists aimsio_ticket_approved_idx
  on public.aimsio_ticket (approved);

-- ---------------------------------------------------------------------------
-- aimsio_sync — single-row heartbeat (id = 'current')
-- ---------------------------------------------------------------------------
create table if not exists public.aimsio_sync (
  id               text primary key,                  -- always 'current'
  last_synced_at   timestamptz not null,
  ticket_count     int  not null default 0,
  approved_count   int  not null default 0,
  by_email         text
);

-- ---------------------------------------------------------------------------
-- sync_project — portal-side project definitions Aimsio jobs map into
-- ---------------------------------------------------------------------------
create table if not exists public.sync_project (
  id           text primary key,                       -- e.g. 'aitken-creek'
  name         text not null,
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- sync_job_map — job_no (Aimsio) → project_id (sync_project)
-- Standalone jobs are simply absent from this map.
-- ---------------------------------------------------------------------------
create table if not exists public.sync_job_map (
  job_no      text primary key,
  project_id  text not null references public.sync_project(id) on delete cascade,
  updated_at  timestamptz not null default now()
);

create index if not exists sync_job_map_project_idx
  on public.sync_job_map (project_id);

-- ---------------------------------------------------------------------------
-- Grants — repeat of the lesson learned during Apex tables rollout: table-
-- level SELECT/INSERT/UPDATE/DELETE must be granted explicitly. RLS policies
-- alone are not enough.
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on
  public.aimsio_ticket,
  public.aimsio_sync,
  public.sync_project,
  public.sync_job_map
to anon, authenticated;

-- ---------------------------------------------------------------------------
-- RLS — read for anon (server component fetch), write for authenticated only.
-- (The sync API routes always run authenticated.)
-- ---------------------------------------------------------------------------
alter table public.aimsio_ticket enable row level security;
alter table public.aimsio_sync   enable row level security;
alter table public.sync_project  enable row level security;
alter table public.sync_job_map  enable row level security;

drop policy if exists aimsio_ticket_read  on public.aimsio_ticket;
drop policy if exists aimsio_ticket_write on public.aimsio_ticket;
drop policy if exists aimsio_sync_read    on public.aimsio_sync;
drop policy if exists aimsio_sync_write   on public.aimsio_sync;
drop policy if exists sync_project_read   on public.sync_project;
drop policy if exists sync_project_write  on public.sync_project;
drop policy if exists sync_job_map_read   on public.sync_job_map;
drop policy if exists sync_job_map_write  on public.sync_job_map;

create policy aimsio_ticket_read  on public.aimsio_ticket for select using (true);
create policy aimsio_ticket_write on public.aimsio_ticket for all to authenticated using (true) with check (true);
create policy aimsio_sync_read    on public.aimsio_sync   for select using (true);
create policy aimsio_sync_write   on public.aimsio_sync   for all to authenticated using (true) with check (true);
create policy sync_project_read   on public.sync_project  for select using (true);
create policy sync_project_write  on public.sync_project  for all to authenticated using (true) with check (true);
create policy sync_job_map_read   on public.sync_job_map  for select using (true);
create policy sync_job_map_write  on public.sync_job_map  for all to authenticated using (true) with check (true);

-- Seed the default project so day-one mapping has a target.
insert into public.sync_project (id, name)
values ('aitken-creek', 'Aitken Creek Expansion (Project 30006386)')
on conflict (id) do nothing;

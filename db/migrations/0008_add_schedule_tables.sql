-- ============================================================
-- 0008: Module shipping schedule tables
-- ============================================================
-- schedule_packages: one row per shipping package (module, skid,
--   loose load, tank, etc.). planned_ship_date is what drives
--   calendar placement; rts_date is the "floor" that enforces the
--   earliest legal ship date. convoy_group ties packages that must
--   ship together (e.g. Foremost 750 bbl tanks).
--
-- schedule_walkdowns: free-standing milestones users create by
--   clicking a calendar day. 30/60/90 = design maturity level.
--
-- is_rack / is_over_height are generated columns so the UI never
-- has to compute them from raw fields.
-- ============================================================

create extension if not exists "pgcrypto";

create table public.schedule_packages (
  id                 uuid primary key default gen_random_uuid(),
  ewp                text not null,
  tag                text not null,
  length_ft          numeric(6,2),
  width_ft           numeric(6,2),
  height_ft          numeric(6,2),
  weight_lbs         text,
  shipping_cost      numeric(14,2),
  permits_cost       numeric(14,2),
  total_cost         numeric(14,2),
  actuals            numeric(14,2),
  rts_date           date,
  planned_ship_date  date,
  is_rack            boolean generated always as (ewp like 'North South Rack%') stored,
  is_over_height     boolean generated always as (coalesce(height_ft, 0) > 13) stored,
  convoy_group       text,
  sort_order         int not null default 0,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index schedule_packages_sort_idx on public.schedule_packages(sort_order);
create index schedule_packages_planned_date_idx on public.schedule_packages(planned_ship_date);
create index schedule_packages_group_idx on public.schedule_packages(convoy_group) where convoy_group is not null;

create table public.schedule_walkdowns (
  id           uuid primary key default gen_random_uuid(),
  event_date   date not null,
  level        int not null check (level in (30, 60, 90)),
  name         text not null,
  created_at   timestamptz not null default now(),
  created_by   uuid references auth.users(id)
);

create index schedule_walkdowns_date_idx on public.schedule_walkdowns(event_date);

alter table public.schedule_packages enable row level security;
alter table public.schedule_walkdowns enable row level security;

drop policy if exists auth_read_schedule_packages on public.schedule_packages;
drop policy if exists auth_write_schedule_packages on public.schedule_packages;
drop policy if exists auth_read_schedule_walkdowns on public.schedule_walkdowns;
drop policy if exists auth_write_schedule_walkdowns on public.schedule_walkdowns;

create policy auth_read_schedule_packages
  on public.schedule_packages for select to authenticated using (true);
create policy auth_write_schedule_packages
  on public.schedule_packages for all to authenticated using (true) with check (true);
create policy auth_read_schedule_walkdowns
  on public.schedule_walkdowns for select to authenticated using (true);
create policy auth_write_schedule_walkdowns
  on public.schedule_walkdowns for all to authenticated using (true) with check (true);

grant select, insert, update, delete on public.schedule_packages to authenticated;
grant select, insert, update, delete on public.schedule_walkdowns to authenticated;

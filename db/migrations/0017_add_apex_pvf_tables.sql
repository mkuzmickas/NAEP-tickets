-- =============================================================================
-- 0017: Apex PVF (Pipe, Valves, Fittings) tracking tables
-- =============================================================================
-- Tracks Apex Distribution material orders for the Aitken Creek site.
-- Seven POs, all under GLE package 24198-4001, segregated by EWP.
--
-- Design intent:
--   • apex_pos          — one row per PO (7 total today)
--   • apex_line_items   — one row per line item (~295 total today)
--   • ship_date is nullable — set later by Mike (multi-select + date picker)
--     after his meeting with Apex.
-- =============================================================================

create table if not exists public.apex_pos (
  id                uuid primary key default gen_random_uuid(),
  po_number         text not null unique,
  ewp               text not null,               -- 'EWP #14', 'EWP #55', etc.
  gle_package       text,                        -- '24198-4001-03'
  description       text,                        -- 'Power Generation Area Off Skid Piping'
  requester         text,                        -- 'Jade Rowe'
  supplier          text default 'Apex Distribution',
  order_date        date,
  total_amount      numeric(14,2) not null default 0,
  currency          text default 'CAD',
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists apex_pos_ewp_idx         on public.apex_pos(ewp);
create index if not exists apex_pos_gle_package_idx on public.apex_pos(gle_package);

create table if not exists public.apex_line_items (
  id                uuid primary key default gen_random_uuid(),
  apex_po_id        uuid not null references public.apex_pos(id) on delete cascade,
  line_number       int  not null,
  size              text,                        -- '2"', '6"x4"'
  description       text not null,
  quantity          numeric(14,4) not null,
  uom               text not null,               -- 'Each', 'Feet'
  unit_cost         numeric(14,4) not null,
  amount            numeric(14,2) not null,
  vendor            text,                        -- 'TRILAD', 'BOTHWELL', 'FLEXITALLIC'
  lead_time         text,                        -- 'STOCK', '2-3 WEEKS ARO'
  ship_date         date,                        -- NULL until Mike tags a date
  received_date     date,                        -- NULL until physically received on site
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (apex_po_id, line_number)
);

create index if not exists apex_line_items_po_id_idx     on public.apex_line_items(apex_po_id);
create index if not exists apex_line_items_ship_date_idx on public.apex_line_items(ship_date) where ship_date is not null;
create index if not exists apex_line_items_ewp_idx       on public.apex_line_items(apex_po_id) include (ship_date);

-- Auto-update updated_at on both tables.
create or replace function public.apex_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists apex_pos_updated_at on public.apex_pos;
create trigger apex_pos_updated_at
  before update on public.apex_pos
  for each row execute function public.apex_set_updated_at();

drop trigger if exists apex_line_items_updated_at on public.apex_line_items;
create trigger apex_line_items_updated_at
  before update on public.apex_line_items
  for each row execute function public.apex_set_updated_at();

-- Table-level grants: RLS policies alone aren't enough — the PostgREST-facing
-- roles also need SELECT/INSERT/UPDATE/DELETE privilege on the table itself.
-- Supabase usually auto-grants these on new tables but not always; be explicit.
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.apex_pos, public.apex_line_items
  to anon, authenticated;

-- RLS: allow anon read + authenticated write (match existing service_pos pattern).
alter table public.apex_pos        enable row level security;
alter table public.apex_line_items enable row level security;

drop policy if exists apex_pos_read        on public.apex_pos;
drop policy if exists apex_pos_write       on public.apex_pos;
drop policy if exists apex_lines_read      on public.apex_line_items;
drop policy if exists apex_lines_write     on public.apex_line_items;

create policy apex_pos_read    on public.apex_pos        for select using (true);
create policy apex_pos_write   on public.apex_pos        for all    using (true) with check (true);
create policy apex_lines_read  on public.apex_line_items for select using (true);
create policy apex_lines_write on public.apex_line_items for all    using (true) with check (true);

-- ============================================================
-- 0011: Multi-day schedule events (blackouts / milestones / notes)
-- ============================================================
-- A named date range on the calendar. Used for things like flare
-- stack install ("no package pickups this week"), plant outages,
-- annual holidays, or callout milestones that span multiple days.
--
-- kind = 'blackout'  -> no package pickups, red band
-- kind = 'milestone' -> project event, amber band
-- kind = 'note'      -> informational, blue band
-- ============================================================

create table public.schedule_events (
  id           uuid primary key default gen_random_uuid(),
  start_date   date not null,
  end_date     date not null,
  name         text not null,
  kind         text not null default 'blackout'
                 check (kind in ('blackout', 'milestone', 'note')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  created_by   uuid references auth.users(id),
  check (end_date >= start_date)
);

create index schedule_events_range_idx
  on public.schedule_events (start_date, end_date);

alter table public.schedule_events enable row level security;

drop policy if exists auth_read_schedule_events on public.schedule_events;
drop policy if exists auth_write_schedule_events on public.schedule_events;

create policy auth_read_schedule_events
  on public.schedule_events for select to authenticated using (true);
create policy auth_write_schedule_events
  on public.schedule_events for all to authenticated using (true) with check (true);

grant select, insert, update, delete on public.schedule_events to authenticated;


-- Seed the immediate need: Flare stack installation blackout
-- (Sept 29 – Oct 4, 2026, no package pickups)
insert into public.schedule_events (start_date, end_date, name, kind)
values ('2026-09-29', '2026-10-04', 'Flare Stack Install — no pickups', 'blackout')
on conflict do nothing;

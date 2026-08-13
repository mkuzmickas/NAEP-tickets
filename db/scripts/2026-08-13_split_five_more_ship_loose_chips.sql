-- =============================================================================
-- 2026-08-13 — Split five more combined Ship-Loose chips
-- =============================================================================
-- Before → After
--   MOD-60804/30704 - Ship Loose     →  MOD-60804 - Ship Loose · MOD-30704 - Ship Loose
--   MOD-60806 / 60803 - Ship Loose   →  MOD-60806 - Ship Loose · MOD-60803 - Ship Loose
--   MOD-70401 / 70402 - Ship Loose   →  MOD-70401 - Ship Loose · MOD-70402 - Ship Loose
--   MOD-70406/407 - Ship Loose       →  MOD-70406 - Ship Loose · MOD-70407 - Ship Loose
--   MOD-30705/06 - Ship Loose        →  MOD-30705 - Ship Loose · MOD-30706 - Ship Loose
--
-- Same day + EWP as the original chip for each pair. Idempotent: the second
-- INSERT is guarded so a re-run is a no-op.
-- =============================================================================

begin;

-- ─── 1) MOD-60804/30704 (Skim Slop Pump Building, 2026-08-28) ───────────────
update public.schedule_packages
set tag = 'MOD-60804 - Ship Loose', updated_at = now()
where tag = 'MOD-60804/30704 - Ship Loose';

insert into public.schedule_packages (ewp, tag, planned_ship_date, rts_date, sort_order)
select ewp, 'MOD-30704 - Ship Loose', planned_ship_date, rts_date, sort_order + 1
from public.schedule_packages
where tag = 'MOD-60804 - Ship Loose'
  and not exists (select 1 from public.schedule_packages where tag = 'MOD-30704 - Ship Loose');

-- ─── 2) MOD-60806 / 60803 (Skim Slop Pump Building, 2026-09-11) ────────────
update public.schedule_packages
set tag = 'MOD-60806 - Ship Loose', updated_at = now()
where tag = 'MOD-60806 / 60803 - Ship Loose';

insert into public.schedule_packages (ewp, tag, planned_ship_date, rts_date, sort_order)
select ewp, 'MOD-60803 - Ship Loose', planned_ship_date, rts_date, sort_order + 1
from public.schedule_packages
where tag = 'MOD-60806 - Ship Loose'
  and not exists (select 1 from public.schedule_packages where tag = 'MOD-60803 - Ship Loose');

-- ─── 3) MOD-70401 / 70402 (Flare and Rack, 2026-09-11) ──────────────────────
update public.schedule_packages
set tag = 'MOD-70401 - Ship Loose', updated_at = now()
where tag = 'MOD-70401 / 70402 - Ship Loose';

insert into public.schedule_packages (ewp, tag, planned_ship_date, rts_date, sort_order)
select ewp, 'MOD-70402 - Ship Loose', planned_ship_date, rts_date, sort_order + 1
from public.schedule_packages
where tag = 'MOD-70401 - Ship Loose'
  and not exists (select 1 from public.schedule_packages where tag = 'MOD-70402 - Ship Loose');

-- ─── 4) MOD-70406/407 (Flare and Rack, 2026-09-25) ─────────────────────────
update public.schedule_packages
set tag = 'MOD-70406 - Ship Loose', updated_at = now()
where tag = 'MOD-70406/407 - Ship Loose';

insert into public.schedule_packages (ewp, tag, planned_ship_date, rts_date, sort_order)
select ewp, 'MOD-70407 - Ship Loose', planned_ship_date, rts_date, sort_order + 1
from public.schedule_packages
where tag = 'MOD-70406 - Ship Loose'
  and not exists (select 1 from public.schedule_packages where tag = 'MOD-70407 - Ship Loose');

-- ─── 5) MOD-30705/06 (Flare and Rack, 2026-09-25) ──────────────────────────
update public.schedule_packages
set tag = 'MOD-30705 - Ship Loose', updated_at = now()
where tag = 'MOD-30705/06 - Ship Loose';

insert into public.schedule_packages (ewp, tag, planned_ship_date, rts_date, sort_order)
select ewp, 'MOD-30706 - Ship Loose', planned_ship_date, rts_date, sort_order + 1
from public.schedule_packages
where tag = 'MOD-30705 - Ship Loose'
  and not exists (select 1 from public.schedule_packages where tag = 'MOD-30706 - Ship Loose');

commit;

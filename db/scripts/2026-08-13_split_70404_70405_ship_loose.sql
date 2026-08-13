-- =============================================================================
-- 2026-08-13 — Split MOD-70404/405 Ship Loose into two chips
-- =============================================================================
-- Before: MOD-70404/405 - Ship Loose  →  2026-09-18 · Flare and Rack (EWP 12)
-- After:  MOD-70404 - Ship Loose · MOD-70405 - Ship Loose  (same day + EWP)
-- Idempotent: the INSERT is guarded so a re-run is a no-op.
-- =============================================================================

begin;

update public.schedule_packages
set tag = 'MOD-70404 - Ship Loose', updated_at = now()
where tag = 'MOD-70404/405 - Ship Loose';

insert into public.schedule_packages (ewp, tag, planned_ship_date, rts_date, sort_order)
select ewp, 'MOD-70405 - Ship Loose', planned_ship_date, rts_date, sort_order + 1
from public.schedule_packages
where tag = 'MOD-70404 - Ship Loose'
  and not exists (select 1 from public.schedule_packages where tag = 'MOD-70405 - Ship Loose');

commit;

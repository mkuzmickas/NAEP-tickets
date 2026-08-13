-- =============================================================================
-- 2026-08-13 — Split MOD-30708 / 60805 Ship Loose into two chips
-- =============================================================================
-- Before:
--   MOD-30708 / 60805 - Ship Loose  →  2026-08-21
-- After:
--   MOD-30708 - Ship Loose          →  2026-08-21
--   MOD-60805 - Ship Loose          →  2026-08-21
-- =============================================================================

begin;

-- 1) Rename the existing combined chip.
update public.schedule_packages
set tag = 'MOD-30708 - Ship Loose',
    updated_at = now()
where tag = 'MOD-30708 / 60805 - Ship Loose';
-- Expected: UPDATE 1

-- 2) Add a fresh chip for MOD-60805 on the same day + same EWP.
insert into public.schedule_packages (
  ewp, tag, planned_ship_date, rts_date, sort_order
)
select
  ewp,
  'MOD-60805 - Ship Loose',
  planned_ship_date,
  rts_date,
  sort_order + 1
from public.schedule_packages
where tag = 'MOD-30708 - Ship Loose'
  -- Guard: don't double-insert if this script is re-run.
  and not exists (
    select 1 from public.schedule_packages where tag = 'MOD-60805 - Ship Loose'
  );
-- Expected: INSERT 0 1 (or INSERT 0 0 on a re-run)

commit;

-- =============================================================================
-- 2026-08-04 — Split MOD-11113 / 11114 / 11115 Ship Loose chips
-- =============================================================================
-- Before:
--   MOD-11113/14/15 - Ship Loose Load 1  → 2026-08-07
--   MOD-11113/14/15 - Ship Loose Load 2  → 2026-08-14
-- After:
--   MOD-11113 - Ship Loose               → 2026-08-07  (alone)
--   MOD-11114/15 - Ship Loose            → 2026-08-14  (one load together)
-- =============================================================================

update public.schedule_packages
set tag = 'MOD-11113 - Ship Loose',
    planned_ship_date = '2026-08-07',
    rts_date          = '2026-08-07',
    updated_at        = now()
where tag = 'MOD-11113/14/15 - Ship Loose Load 1';

update public.schedule_packages
set tag = 'MOD-11114/15 - Ship Loose',
    planned_ship_date = '2026-08-14',
    rts_date          = '2026-08-14',
    updated_at        = now()
where tag = 'MOD-11113/14/15 - Ship Loose Load 2';

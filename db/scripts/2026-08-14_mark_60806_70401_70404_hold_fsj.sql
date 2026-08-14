-- =============================================================================
-- 2026-08-14 — Mark MOD-60806, MOD-70401, MOD-70404 Ship Loose as HOLD-FSJ
-- =============================================================================
-- Ship now, hold in Fort St. John, deliver to site Monday the 5th.
--
-- Encoded in the tag so the instruction shows on the chip itself and the
-- MODs-only filter still catches them (tag still starts with "MOD"). Ship
-- dates are left untouched — Mike can drag them later if desired.
--
-- Idempotent: guarded so a re-paste won't re-append the same note.
-- =============================================================================

begin;

update public.schedule_packages
set tag = tag || ' [HOLD FSJ → Site Mon 5]',
    updated_at = now()
where tag in (
  'MOD-60806',
  'MOD-70401',
  'MOD-70404 - Ship Loose'
)
and tag not like '%[HOLD FSJ → Site Mon 5]%';
-- Expected: UPDATE 3 (or UPDATE 0 on a re-run).

commit;

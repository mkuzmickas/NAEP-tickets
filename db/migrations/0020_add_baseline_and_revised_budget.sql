-- ============================================================
-- 0020: Baseline + revised budget on service_pos
-- ============================================================
-- Some vendors (Sureline today) are managed against a baseline
-- budget built from EWP estimates (Rev.0) and a revised budget
-- that layers approved COs and approved trends on top. These are
-- the project cost-control view, separate from the signed PO
-- value (which stays in committed_amount).
--
-- Both columns default NULL. The vendor-page UI only renders the
-- Baseline / Revised tiles for vendors whose POs have them set,
-- so every other vendor is visually unchanged.
--
-- Weekly refresh pattern: paste a one-line UPDATE per PO when
-- Sureline publishes new numbers in their portal. See the Oct 26
-- sync script for Sureline's current values.
-- ============================================================

alter table public.service_pos
  add column if not exists baseline_budget numeric(14,2),
  add column if not exists revised_budget  numeric(14,2);

comment on column public.service_pos.baseline_budget is
  'Baseline budget from the vendor''s approved Rev.0 estimates. '
  'Separate from committed_amount (the signed PO value). Null for '
  'vendors not managed on a baseline/revised model.';

comment on column public.service_pos.revised_budget is
  'Baseline budget + approved change orders + approved trends. '
  'Null for vendors not managed on a baseline/revised model.';

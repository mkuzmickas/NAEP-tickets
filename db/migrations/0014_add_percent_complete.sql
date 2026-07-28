-- =============================================================================
-- 0014: Manual % complete on service_pos - drives Forecast at Completion
-- =============================================================================
-- One nullable percent field per PO. The Forecast page (and the
-- dashboard/vendor roll-ups) compute:
--
--   forecast_at_completion = lem_to_date / (percent_complete / 100)
--
-- when percent_complete > 0. Null / zero => forecast is not computable
-- for that PO and rolls up as zero contribution.
--
-- Precision (5,2) keeps values in the 0.00 - 100.00 range with two
-- decimals of accuracy, which is more than enough for a project engineer
-- typing "37.5" into a text box.
-- =============================================================================

alter table public.service_pos
  add column if not exists percent_complete numeric(5,2);

alter table public.service_pos
  drop constraint if exists service_pos_percent_complete_range,
  add constraint service_pos_percent_complete_range check (
    percent_complete is null
    or (percent_complete >= 0 and percent_complete <= 100)
  );

-- Anyone who can update a PO from the dashboard (RLS is already enforced
-- at the row level via the existing service_pos policy) can update this
-- new column too - no new policy needed. Confirming here so a future
-- reader doesn't wonder why there's no `create policy` in this file.

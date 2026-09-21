-- ============================================================
-- 0018: Baseline ship date on schedule_packages
-- ============================================================
-- Every package now carries TWO ship dates:
--   • baseline_ship_date  — the locked-in commitment, set once from
--                           whatever the planned date was on baseline
--                           day. Never moved by the schedule board.
--   • planned_ship_date   — the current best estimate (existing column).
--                           Freely dragged around on the Ship Schedule
--                           board every week as reality shifts.
-- Actual ship date is derived at read-time from the earliest LaPrairie
-- ticket (schedule_package_id) tied to the row — no column needed.
--
-- Backfill: copy today's planned_ship_date into baseline_ship_date for
-- every row that already has one. From here on, dragging a chip on the
-- board updates only planned_ship_date; baseline stays put so the
-- tracker can report "shipped X days late vs original commitment".
-- ============================================================

alter table public.schedule_packages
  add column baseline_ship_date date;

update public.schedule_packages
   set baseline_ship_date = planned_ship_date
 where planned_ship_date is not null;

create index if not exists schedule_packages_baseline_ship_idx
  on public.schedule_packages(baseline_ship_date)
  where baseline_ship_date is not null;

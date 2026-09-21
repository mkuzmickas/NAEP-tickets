-- ============================================================
-- 0019: manually_delivered flag on schedule_packages
-- ============================================================
-- Not every package's ticket cleanly lands under its own
-- schedule_package_id. LaPrairie sometimes covers a multi-package
-- convoy on one ticket tagged to just the primary skid; other times
-- the ticket paperwork itself takes weeks to catch up. Either way,
-- the tracker used to flash 'Baseline missed' (rose) even when the
-- package was already at site.
--
-- manually_delivered = true is Mike's override: 'yes, it's at site,
-- regardless of what the ticket picture shows'. The tracker treats
-- these as closed once their baseline date has passed; ticket state
-- and cost math are unchanged.
-- ============================================================

alter table public.schedule_packages
  add column manually_delivered boolean not null default false;

create index if not exists schedule_packages_manually_delivered_idx
  on public.schedule_packages(manually_delivered)
  where manually_delivered = true;

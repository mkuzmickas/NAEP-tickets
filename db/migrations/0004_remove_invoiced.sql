-- ============================================================
-- 0004: Remove Invoiced from dashboard views.
-- ============================================================
-- Decision 2026-05-23: Invoiced amounts are tracked in a separate
-- Enbridge AP system, not in this portal. The dashboard now shows
-- only LEM-to-Date as the spend figure against Committed.
--
-- DROP + CREATE (not CREATE OR REPLACE) is required because Postgres
-- only lets you REPLACE a view if columns are appended, not removed.
-- Re-grant SELECT to authenticated since DROP removes grants.
--
-- service_pos.ap_invoiced_amount is preserved in the table (it still
-- holds the seed values for Demolition $49,348.86) but is no longer
-- referenced by either view.
-- ============================================================

drop view if exists public.v_active_po_summary;

create view public.v_active_po_summary as
select
  p.id,
  p.po_number,
  p.vendor_display_name,
  p.scope,
  p.task_wbs,
  p.committed_amount                                              as committed,
  coalesce(sum(t.face_value), 0)                                  as lem_to_date,
  p.committed_amount - coalesce(sum(t.face_value), 0)             as remaining,
  case when p.committed_amount > 0 then
    round(coalesce(sum(t.face_value), 0) / p.committed_amount * 100, 2)
  else 0 end                                                      as pct_used,
  count(t.id)                                                     as ticket_count
from public.service_pos p
join public.tickets t on t.po_id = p.id and t.status in ('pending','invoiced')
group by p.id;

grant select on public.v_active_po_summary to authenticated;


drop view if exists public.v_po_reference;

create view public.v_po_reference as
select
  p.id,
  p.po_number,
  p.vendor_display_name,
  p.vendor_legal_name,
  p.scope,
  p.task_wbs,
  p.committed_amount,
  exists (
    select 1 from public.tickets t
    where t.po_id = p.id and t.status in ('pending','invoiced')
  ) as is_active
from public.service_pos p;

grant select on public.v_po_reference to authenticated;

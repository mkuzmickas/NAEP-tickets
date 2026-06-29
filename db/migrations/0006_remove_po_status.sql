-- ============================================================
-- 0006: Remove active/inactive distinction for POs
-- ============================================================
-- Decision 2026-06-21: every PO in service_pos is "in scope" and
-- appears on the dashboard. POs with no tickets simply show $0
-- spent. The active/inactive concept, the manual override toggle,
-- and the Status column on the admin page are all removed from
-- the UI.
--
-- service_pos.manual_active_override column is preserved in the
-- table (harmless if no view reads it) in case the concept needs
-- to come back later.
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
  coalesce(sum(t.face_value) filter (where t.status in ('pending','invoiced')), 0) as lem_to_date,
  p.committed_amount
    - coalesce(sum(t.face_value) filter (where t.status in ('pending','invoiced')), 0) as remaining,
  case when p.committed_amount > 0 then
    round(coalesce(sum(t.face_value) filter (where t.status in ('pending','invoiced')), 0)
      / p.committed_amount * 100, 2)
  else 0 end                                                      as pct_used,
  count(t.id) filter (where t.status in ('pending','invoiced'))   as ticket_count
from public.service_pos p
left join public.tickets t on t.po_id = p.id
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
  p.committed_amount
from public.service_pos p;

grant select on public.v_po_reference to authenticated;

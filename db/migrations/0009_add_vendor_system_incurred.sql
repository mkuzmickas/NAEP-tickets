-- ============================================================
-- 0009: Add vendor_system_incurred to service_pos + views
-- ============================================================
-- Manual-entry field for what the vendor's internal system says
-- they have submitted against this PO. Meant to catch the gap
-- between tickets logged in the portal and what the vendor is
-- billing/tracking on their side.
--
-- vendor_gap = vendor_system_incurred - lem_to_date
--   > 0 → vendor claims more than we have logged (missing tickets)
--   < 0 → we've logged more than vendor sees (vendor missed one)
--   0 or null → nothing to reconcile
-- ============================================================

alter table public.service_pos
  add column vendor_system_incurred numeric(14,2);


drop view if exists public.v_active_po_summary;

create view public.v_active_po_summary as
select
  p.id,
  p.po_number,
  p.vendor_display_name,
  p.scope,
  p.task_wbs,
  p.project_cost_code,
  p.committed_amount                                              as committed,
  coalesce(sum(t.face_value) filter (where t.status in ('pending','invoiced')), 0) as lem_to_date,
  p.committed_amount
    - coalesce(sum(t.face_value) filter (where t.status in ('pending','invoiced')), 0) as remaining,
  case when p.committed_amount > 0 then
    round(coalesce(sum(t.face_value) filter (where t.status in ('pending','invoiced')), 0)
      / p.committed_amount * 100, 2)
  else 0 end                                                      as pct_used,
  count(t.id) filter (where t.status in ('pending','invoiced'))   as ticket_count,
  p.vendor_system_incurred,
  case
    when p.vendor_system_incurred is null then null
    else p.vendor_system_incurred
      - coalesce(sum(t.face_value) filter (where t.status in ('pending','invoiced')), 0)
  end                                                             as vendor_gap
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
  p.project_cost_code,
  p.committed_amount,
  p.vendor_system_incurred
from public.service_pos p;

grant select on public.v_po_reference to authenticated;

-- ============================================================
-- 0010: Add vendor_job_ref to service_pos + views
-- ============================================================
-- Free-form text field for the vendor's internal job number,
-- work order, or other reference we want to track against a PO
-- (e.g. so we can quote it back when we call about a ticket).
-- ============================================================

alter table public.service_pos
  add column vendor_job_ref text;


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
  end                                                             as vendor_gap,
  p.vendor_job_ref
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
  p.vendor_system_incurred,
  p.vendor_job_ref
from public.service_pos p;

grant select on public.v_po_reference to authenticated;

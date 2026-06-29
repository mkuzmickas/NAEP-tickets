-- ============================================================
-- 0007: Add project_cost_code column to service_pos
-- ============================================================
-- Captures the "Project Cost Code/Task Number" from the procurement
-- requisition summary (column AB of the CSV export). Format is the
-- Enbridge cost-code style, e.g. 04.P1.W.CST.130.502.
--
-- This is distinct from task_wbs, which has been used inconsistently
-- in the existing seed data (some POs hold cost codes there, others
-- hold descriptive names like "NAEP - Grading EWP"). Going forward
-- project_cost_code is the canonical field; task_wbs is retained
-- only for legacy data.
-- ============================================================

alter table public.service_pos
  add column project_cost_code text;

-- Populate the 12 POs currently in the portal per the approved table.
update public.service_pos set project_cost_code = '04.P1.W.CST.130.502' where po_number = 'PUR-6540-2001217';
update public.service_pos set project_cost_code = '04.P1.W.CST.122'     where po_number = 'PUR-6540-2001226';
update public.service_pos set project_cost_code = '04.P1.W.CST.133'     where po_number = 'PUR-6540-2001227';
update public.service_pos set project_cost_code = '04.P1.W.WMI.299'     where po_number = 'PUR-6540-2000943';
update public.service_pos set project_cost_code = '04.P1.W.WMI.299'     where po_number = 'PUR-6540-2001257';
update public.service_pos set project_cost_code = '04.P1.W.CST.130.500' where po_number = 'PUR-6540-2001219';
update public.service_pos set project_cost_code = '04.P1.W.WMI.299'     where po_number = 'PUR-6540-2001171';
update public.service_pos set project_cost_code = '04.P1.W.WMI.244'     where po_number = 'PUR-6540-2000898';
update public.service_pos set project_cost_code = '02.S1.W.WMI.244'     where po_number = 'PUR-6540-2000897';
update public.service_pos set project_cost_code = '04.P1.W.CST.139'     where po_number = 'PUR-6540-2001278';
update public.service_pos set project_cost_code = '05.CO.W.WMI.244'     where po_number = 'PUR-6540-2000896';
update public.service_pos set project_cost_code = '04.P1.W.WMI.299'     where po_number = 'PUR-6540-2001279';


-- Rebuild views to expose project_cost_code.
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
  p.project_cost_code,
  p.committed_amount
from public.service_pos p;

grant select on public.v_po_reference to authenticated;

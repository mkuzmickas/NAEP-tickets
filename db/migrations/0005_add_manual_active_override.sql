-- ============================================================
-- 0005: Manual active override for POs
-- ============================================================
-- Adds a manual_active_override boolean to service_pos so a PO can
-- be flagged as "active" on the dashboard before any tickets exist
-- against it. v_active_po_summary now admits a PO if either:
--   (a) it has at least one pending/invoiced ticket, OR
--   (b) the manual override flag is true.
-- v_po_reference gains manual_active_override and has_tickets fields
-- so the admin UI can distinguish "active naturally" from "forced".
-- ============================================================

alter table public.service_pos
  add column manual_active_override boolean not null default false;


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
where p.manual_active_override = true
   or exists (
     select 1 from public.tickets t2
     where t2.po_id = p.id and t2.status in ('pending','invoiced')
   )
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
  p.manual_active_override,
  exists (
    select 1 from public.tickets t
    where t.po_id = p.id and t.status in ('pending','invoiced')
  ) as has_tickets,
  (
    p.manual_active_override
    or exists (
      select 1 from public.tickets t
      where t.po_id = p.id and t.status in ('pending','invoiced')
    )
  ) as is_active
from public.service_pos p;

grant select on public.v_po_reference to authenticated;

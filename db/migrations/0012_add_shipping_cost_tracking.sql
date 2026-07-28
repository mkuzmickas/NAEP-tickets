-- ============================================================
-- 0012: Shipping-cost tracking — link tickets to schedule packages
-- ============================================================
-- Every LEM logged against a shipping/hauling PO (LaPrairie
-- Equipment Transport today, others later) can now be tagged
-- with the schedule_package it belongs to. That gives the
-- portal per-package actuals it can trend against the budget
-- captured in schedule_packages.shipping_cost /
-- .permits_cost / .total_cost.
--
-- Ticket → package is many-to-one (one ticket, one package).
-- If a load wasn't in the original budget the user creates a
-- fresh schedule_packages row from the assignment modal.
-- ============================================================

alter table public.tickets
  add column schedule_package_id uuid
    references public.schedule_packages(id) on delete set null;

create index tickets_schedule_package_idx
  on public.tickets(schedule_package_id)
  where schedule_package_id is not null;


-- Flag POs whose LEMs should be routed through the tracker.
alter table public.service_pos
  add column tracks_shipping boolean not null default false;

-- Kick it on for the LaPrairie equipment-hauling PO.
update public.service_pos
set tracks_shipping = true
where po_number = 'PUR-6540-2001283';

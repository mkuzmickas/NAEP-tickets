-- ============================================================
-- Seed: LaPrairie Crane tickets (Jun–Jul 2026)
-- Source: LaPrairie invoice register, provided 2026-08.
-- ============================================================
-- Populates the 3 LaPrairie POs with the field tickets Mike is
-- already tracking on his side. Uses ON CONFLICT (ticket_number)
-- DO NOTHING so re-running is safe: any ticket already logged
-- from a PDF upload keeps its real line_items and PDF; only the
-- missing rows get filled in.
--
-- Every seeded ticket gets a single 'equipment' line item that
-- equals face_value with markup=0, so reconciled auto-flips to
-- true via the line_items_recompute_after_change trigger.
--
-- Status mapping:
--   "Invoiced" → 'invoiced'  (green on the ticket map)
--   "Pending"  → 'pending'   (red on the ticket map — at risk)
-- ============================================================

do $$
declare
  po_1257 uuid;
  po_1279 uuid;
  po_1283 uuid;
begin
  select id into po_1257 from public.service_pos where po_number = 'PUR-6540-2001257';
  select id into po_1279 from public.service_pos where po_number = 'PUR-6540-2001279';
  select id into po_1283 from public.service_pos where po_number = 'PUR-6540-2001283';

  if po_1257 is null or po_1279 is null or po_1283 is null then
    raise exception 'One or more LaPrairie POs (2001257 / 2001279 / 2001283) not found on service_pos. Add them first.';
  end if;

  insert into public.tickets
    (po_id, ticket_number, ticket_date, source_type, is_master, face_value, computed_total, reconciled, status)
  values
    -- PUR-6540-2001257  ·  Job 49022 Propane Bullets  (invoiced)
    (po_1257, 'FS49022-040626-164-1', '2026-06-04', 'field_ticket', false, 17345.00, 17345.00, true, 'invoiced'),

    -- PUR-6540-2001279  ·  Job 48807 North Aitken – Cranes
    (po_1279, 'FS48807-260626-000-1', '2026-06-26', 'field_ticket', false,  5155.00,  5155.00, true, 'invoiced'),
    (po_1279, 'FS48807-010726-474-1', '2026-07-01', 'field_ticket', false,  1895.00,  1895.00, true, 'invoiced'),
    (po_1279, 'FS48807-070726-164-1', '2026-07-07', 'field_ticket', false, 57957.50, 57957.50, true, 'invoiced'),
    (po_1279, 'FS48807-080726-164-1', '2026-07-08', 'field_ticket', false, 21975.00, 21975.00, true, 'invoiced'),
    (po_1279, 'FS48807-090726-164-1', '2026-07-09', 'field_ticket', false, 19745.00, 19745.00, true, 'invoiced'),
    (po_1279, 'FS48807-100726-252-1', '2026-07-10', 'field_ticket', false,  5795.00,  5795.00, true, 'invoiced'),
    (po_1279, 'FS48807-130726-000-1', '2026-07-13', 'field_ticket', false,  2845.00,  2845.00, true, 'invoiced'),
    (po_1279, 'FS48807-140726-164-1', '2026-07-14', 'field_ticket', false, 19605.00, 19605.00, true, 'invoiced'),
    (po_1279, 'FS48807-150726-164-1', '2026-07-15', 'field_ticket', false, 11115.00, 11115.00, true, 'invoiced'),
    (po_1279, 'FS48807-160726-252-1', '2026-07-16', 'field_ticket', false, 12010.00, 12010.00, true, 'pending'),
    (po_1279, 'FS48807-180726-164-1', '2026-07-18', 'field_ticket', false,  5690.00,  5690.00, true, 'pending'),
    (po_1279, 'FS48807-220726-164-1', '2026-07-22', 'field_ticket', false, 18902.50, 18902.50, true, 'pending'),

    -- PUR-6540-2001283  ·  Job 49237 North Aitken – Haul
    (po_1283, 'FS49237-220626-000-1', '2026-06-22', 'field_ticket', false, 10612.00, 10612.00, true, 'invoiced'),
    (po_1283, 'FS49237-250626-000-1', '2026-06-25', 'field_ticket', false,  8721.04,  8721.04, true, 'invoiced'),
    (po_1283, 'FS49237-260626-000-1', '2026-06-26', 'field_ticket', false, 21459.84, 21459.84, true, 'invoiced'),
    (po_1283, 'FS49237-260626-000-2', '2026-06-26', 'field_ticket', false,  1350.00,  1350.00, true, 'invoiced'),
    (po_1283, 'FS49237-050726-000-1', '2026-07-05', 'field_ticket', false, 48309.00, 48309.00, true, 'invoiced'),
    (po_1283, 'FS49237-050726-000-2', '2026-07-05', 'field_ticket', false, 43676.10, 43676.10, true, 'invoiced'),
    (po_1283, 'FS49237-090726-000-1', '2026-07-09', 'field_ticket', false, 11520.00, 11520.00, true, 'invoiced'),
    (po_1283, 'FS49237-090726-000-2', '2026-07-09', 'field_ticket', false,  9570.00,  9570.00, true, 'invoiced'),
    (po_1283, 'FS49237-130726-000-1', '2026-07-13', 'field_ticket', false, 52608.00, 52608.00, true, 'invoiced'),
    (po_1283, 'FS49237-140726-000-1', '2026-07-14', 'field_ticket', false, 55037.55, 55037.55, true, 'invoiced'),
    (po_1283, 'FS49237-140726-000-2', '2026-07-14', 'field_ticket', false, 54793.85, 54793.85, true, 'invoiced'),
    (po_1283, 'FS49237-180726-000-1', '2026-07-18', 'field_ticket', false, 11015.36, 11015.36, true, 'pending')
  on conflict (ticket_number) do nothing;

  -- Add one equipment line item per seeded ticket that has no line items yet.
  -- The trigger sets final_amount = source_amount * (1 + markup/100) and then
  -- refreshes computed_total + reconciled on the parent ticket.
  insert into public.line_items (ticket_id, category, description, source_amount, markup_percent, final_amount, sort_order)
  select
    t.id,
    'equipment',
    'Field ticket total (seeded from LaPrairie invoice register)',
    t.face_value,
    0,
    0,
    1
  from public.tickets t
  where t.po_id in (po_1257, po_1279, po_1283)
    and t.ticket_number like any (array['FS49022-%', 'FS48807-%', 'FS49237-%'])
    and not exists (select 1 from public.line_items li where li.ticket_id = t.id);
end $$;

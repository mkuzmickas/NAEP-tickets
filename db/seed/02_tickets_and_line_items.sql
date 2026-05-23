-- ============================================================
-- Seed: tickets + line_items + bol_registry
-- 53 tickets total, all status='pending'.
-- Includes 3 Energetic master tickets consolidating 17 BOLs.
-- Tie Breaker PO (PUR-6540-2001181): all 4 tickets pending,
--   ap_invoiced=0 on the PO (Mike confirmed 2026-05-23).
-- ============================================================

begin;

-- Disable recompute trigger during bulk insert; re-enabled at end
-- and tickets recomputed in one pass.
alter table public.line_items disable trigger line_items_recompute_after_change;

-- ------------------------------------------------------------
-- Tickets
-- ------------------------------------------------------------
insert into public.tickets
  (po_id, ticket_number, ticket_date, source_type, is_master, face_value, computed_total, reconciled, status)
values
  -- Golden Base — PUR-6540-2001219 (6 tickets)
  ((select id from public.service_pos where po_number='PUR-6540-2001219'), 'FS-26-057-001', '2026-05-06', 'field_ticket', false,  9430.00,  9430.00, true, 'pending'),
  ((select id from public.service_pos where po_number='PUR-6540-2001219'), 'FS-26-057-002', '2026-05-07', 'field_ticket', false,  7815.00,  7815.00, true, 'pending'),
  ((select id from public.service_pos where po_number='PUR-6540-2001219'), 'FS-26-057-003', '2026-05-08', 'field_ticket', false, 13885.00, 13885.00, true, 'pending'),
  ((select id from public.service_pos where po_number='PUR-6540-2001219'), 'FS-26-057-004', '2026-05-09', 'field_ticket', false, 12185.00, 12185.00, true, 'pending'),
  ((select id from public.service_pos where po_number='PUR-6540-2001219'), 'FS-26-057-005', '2026-05-11', 'field_ticket', false, 14414.20, 14414.20, true, 'pending'),
  ((select id from public.service_pos where po_number='PUR-6540-2001219'), 'FS-26-057-006', '2026-05-12', 'field_ticket', false, 17421.56, 17421.56, true, 'pending'),

  -- Surepoint Demolition — PUR-6540-2000868 (14 tickets)
  ((select id from public.service_pos where po_number='PUR-6540-2000868'), '260119-B23-000-13', '2026-01-19', 'field_ticket', false, 4168.00, 4168.00, true, 'pending'),
  ((select id from public.service_pos where po_number='PUR-6540-2000868'), '260120-B23-000-17', '2026-01-20', 'field_ticket', false, 3273.00, 3273.00, true, 'pending'),
  ((select id from public.service_pos where po_number='PUR-6540-2000868'), '260121-B23-000-21', '2026-01-21', 'field_ticket', false, 2654.00, 2654.00, true, 'pending'),
  ((select id from public.service_pos where po_number='PUR-6540-2000868'), '260122-B23-000-28', '2026-01-22', 'field_ticket', false, 2800.00, 2800.00, true, 'pending'),
  ((select id from public.service_pos where po_number='PUR-6540-2000868'), '260123-B25-000-48', '2026-01-23', 'field_ticket', false, 2818.00, 2818.00, true, 'pending'),
  ((select id from public.service_pos where po_number='PUR-6540-2000868'), '260124-B25-000-52', '2026-01-24', 'field_ticket', false, 4306.00, 4306.00, true, 'pending'),
  ((select id from public.service_pos where po_number='PUR-6540-2000868'), '260125-B25-000-55', '2026-01-25', 'field_ticket', false, 4306.00, 4306.00, true, 'pending'),
  ((select id from public.service_pos where po_number='PUR-6540-2000868'), '260126-B27-000-31', '2026-01-26', 'field_ticket', false, 3288.00, 3288.00, true, 'pending'),
  ((select id from public.service_pos where po_number='PUR-6540-2000868'), '260128-B29-000-18', '2026-01-28', 'field_ticket', false, 3632.86, 3632.86, true, 'pending'),
  ((select id from public.service_pos where po_number='PUR-6540-2000868'), '260202-B06-000-14', '2026-02-02', 'field_ticket', false, 1316.00, 1316.00, true, 'pending'),
  ((select id from public.service_pos where po_number='PUR-6540-2000868'), '260203-B06-000-16', '2026-02-03', 'field_ticket', false, 4060.00, 4060.00, true, 'pending'),
  ((select id from public.service_pos where po_number='PUR-6540-2000868'), '260209-B12-000-17', '2026-02-09', 'field_ticket', false, 2064.00, 2064.00, true, 'pending'),
  ((select id from public.service_pos where po_number='PUR-6540-2000868'), '260213-B19-000-22', '2026-02-13', 'field_ticket', false,  740.00,  740.00, true, 'pending'),
  ((select id from public.service_pos where po_number='PUR-6540-2000868'), '260227-B04-000-21', '2026-02-27', 'field_ticket', false, 2876.00, 2876.00, true, 'pending'),

  -- Surepoint Tie Breaker — PUR-6540-2001181 (4 tickets, all pending)
  ((select id from public.service_pos where po_number='PUR-6540-2001181'), '260417-B18-000-5',  '2026-04-17', 'field_ticket', false, 4295.86, 4295.86, true, 'pending'),
  ((select id from public.service_pos where po_number='PUR-6540-2001181'), '260506-B06-000-23', '2026-05-06', 'field_ticket', false,  242.00,  242.00, true, 'pending'),
  ((select id from public.service_pos where po_number='PUR-6540-2001181'), '260507-B07-000-40', '2026-05-07', 'field_ticket', false, 2580.40, 2580.40, true, 'pending'),
  ((select id from public.service_pos where po_number='PUR-6540-2001181'), '260508-B08-000-58', '2026-05-08', 'field_ticket', false, 1032.00, 1032.00, true, 'pending'),

  -- Energetic Svcs regular — PUR-6540-2001227 (16 tickets)
  ((select id from public.service_pos where po_number='PUR-6540-2001227'), '1287344', '2026-05-07', 'field_ticket', false, 3850.00, 3850.00, true, 'pending'),
  ((select id from public.service_pos where po_number='PUR-6540-2001227'), '1246484', '2026-05-07', 'field_ticket', false, 4620.00, 4620.00, true, 'pending'),
  ((select id from public.service_pos where po_number='PUR-6540-2001227'), '1287345', '2026-05-08', 'field_ticket', false, 4042.50, 4042.50, true, 'pending'),
  ((select id from public.service_pos where po_number='PUR-6540-2001227'), '1246485', '2026-05-08', 'field_ticket', false, 4427.50, 4427.50, true, 'pending'),
  ((select id from public.service_pos where po_number='PUR-6540-2001227'), '1287346', '2026-05-09', 'field_ticket', false, 3657.50, 3657.50, true, 'pending'),
  ((select id from public.service_pos where po_number='PUR-6540-2001227'), '1246486', '2026-05-09', 'field_ticket', false, 3657.50, 3657.50, true, 'pending'),
  ((select id from public.service_pos where po_number='PUR-6540-2001227'), '1287347', '2026-05-10', 'field_ticket', false, 3657.50, 3657.50, true, 'pending'),
  ((select id from public.service_pos where po_number='PUR-6540-2001227'), '1287348', '2026-05-11', 'field_ticket', false, 3850.00, 3850.00, true, 'pending'),
  ((select id from public.service_pos where po_number='PUR-6540-2001227'), '1287349', '2026-05-12', 'field_ticket', false, 3657.50, 3657.50, true, 'pending'),
  ((select id from public.service_pos where po_number='PUR-6540-2001227'), '1246487', '2026-05-10', 'field_ticket', false, 3931.39, 3931.39, true, 'pending'),
  ((select id from public.service_pos where po_number='PUR-6540-2001227'), '1246488', '2026-05-11', 'field_ticket', false, 4138.30, 4138.30, true, 'pending'),
  ((select id from public.service_pos where po_number='PUR-6540-2001227'), '1246489', '2026-05-12', 'field_ticket', false, 3517.56, 3517.56, true, 'pending'),
  ((select id from public.service_pos where po_number='PUR-6540-2001227'), '1246490', '2026-05-13', 'field_ticket', false, 5331.43, 5331.43, true, 'pending'),
  ((select id from public.service_pos where po_number='PUR-6540-2001227'), '1287351', '2026-05-13', 'field_ticket', false, 4921.32, 4921.32, true, 'pending'),
  ((select id from public.service_pos where po_number='PUR-6540-2001227'), '1246491', '2026-05-14', 'field_ticket', false, 4473.70, 4473.70, true, 'pending'),
  ((select id from public.service_pos where po_number='PUR-6540-2001227'), '1287352', '2026-05-14', 'field_ticket', false, 4270.35, 4270.35, true, 'pending'),

  -- Energetic Svcs Master Tickets — PUR-6540-2001227 (3 masters)
  ((select id from public.service_pos where po_number='PUR-6540-2001227'), 'MT2026-000492', '2026-05-15', 'master_ticket', true, 24549.10, 24549.10, true, 'pending'),
  ((select id from public.service_pos where po_number='PUR-6540-2001227'), 'MT2026-000493', '2026-05-16', 'master_ticket', true, 28650.51, 28650.51, true, 'pending'),
  ((select id from public.service_pos where po_number='PUR-6540-2001227'), 'MT2026-000494', '2026-05-17', 'master_ticket', true, 26212.17, 26212.17, true, 'pending'),

  -- Albright Flush — PUR-6540-2001226 (6 tickets)
  ((select id from public.service_pos where po_number='PUR-6540-2001226'), '207910', '2026-05-07', 'field_ticket', false, 4440.00, 4440.00, true, 'pending'),
  ((select id from public.service_pos where po_number='PUR-6540-2001226'), '207937', '2026-05-08', 'field_ticket', false, 4440.00, 4440.00, true, 'pending'),
  ((select id from public.service_pos where po_number='PUR-6540-2001226'), '207938', '2026-05-09', 'field_ticket', false, 4440.00, 4440.00, true, 'pending'),
  ((select id from public.service_pos where po_number='PUR-6540-2001226'), '207939', '2026-05-10', 'field_ticket', false, 4160.00, 4160.00, true, 'pending'),
  ((select id from public.service_pos where po_number='PUR-6540-2001226'), '207954', '2026-05-11', 'field_ticket', false, 4440.00, 4440.00, true, 'pending'),
  ((select id from public.service_pos where po_number='PUR-6540-2001226'), '207999', '2026-05-12', 'field_ticket', false, 5280.00, 5280.00, true, 'pending'),

  -- Vector Geomatics — Aitken Creek c-A20-D — PUR-6540-2000896 (1 ticket)
  ((select id from public.service_pos where po_number='PUR-6540-2000896'), '60073', '2026-04-30', 'field_ticket', false, 1221.25, 1221.25, true, 'pending'),

  -- Vector Geomatics — 44-L/94-A-13 — PUR-6540-2000898 (3 tickets)
  ((select id from public.service_pos where po_number='PUR-6540-2000898'), '62382', '2026-04-30', 'field_ticket', false,  6884.07,  6884.07, true, 'pending'),
  ((select id from public.service_pos where po_number='PUR-6540-2000898'), '62453', '2026-04-30', 'field_ticket', false,  3530.00,  3530.00, true, 'pending'),
  ((select id from public.service_pos where po_number='PUR-6540-2000898'), '62627', '2026-04-30', 'field_ticket', false, 29403.50, 29403.50, true, 'pending');

-- ------------------------------------------------------------
-- Line items — one per non-zero category. Two carry +10% markup.
-- ------------------------------------------------------------
insert into public.line_items
  (ticket_id, category, description, source_amount, markup_percent, final_amount, sort_order)
values
  -- Golden Base
  ((select id from public.tickets where ticket_number='FS-26-057-001'), 'labour',    'Labour (rolled up)',     2415.00, 0,  2415.00, 1),
  ((select id from public.tickets where ticket_number='FS-26-057-001'), 'equipment', 'Equipment (rolled up)',  7015.00, 0,  7015.00, 2),
  ((select id from public.tickets where ticket_number='FS-26-057-002'), 'labour',    'Labour (rolled up)',     2670.00, 0,  2670.00, 1),
  ((select id from public.tickets where ticket_number='FS-26-057-002'), 'equipment', 'Equipment (rolled up)',  5145.00, 0,  5145.00, 2),
  ((select id from public.tickets where ticket_number='FS-26-057-003'), 'labour',    'Labour (rolled up)',     2415.00, 0,  2415.00, 1),
  ((select id from public.tickets where ticket_number='FS-26-057-003'), 'equipment', 'Equipment (rolled up)', 11470.00, 0, 11470.00, 2),
  ((select id from public.tickets where ticket_number='FS-26-057-004'), 'labour',    'Labour (rolled up)',     2415.00, 0,  2415.00, 1),
  ((select id from public.tickets where ticket_number='FS-26-057-004'), 'equipment', 'Equipment (rolled up)',  9770.00, 0,  9770.00, 2),
  ((select id from public.tickets where ticket_number='FS-26-057-005'), 'labour',    'Labour (rolled up)',     3180.00, 0,  3180.00, 1),
  ((select id from public.tickets where ticket_number='FS-26-057-005'), 'equipment', 'Equipment (rolled up)',  9725.00, 0,  9725.00, 2),
  ((select id from public.tickets where ticket_number='FS-26-057-005'), 'loa_other', 'Third-party LOA charges (+10% markup)', 1372.00, 10, 1509.20, 3),
  ((select id from public.tickets where ticket_number='FS-26-057-006'), 'labour',    'Labour (rolled up)',     3095.00, 0,  3095.00, 1),
  ((select id from public.tickets where ticket_number='FS-26-057-006'), 'equipment', 'Equipment (rolled up)', 11645.00, 0, 11645.00, 2),
  ((select id from public.tickets where ticket_number='FS-26-057-006'), 'materials', 'Third-party materials (+10% markup)', 2437.78, 10, 2681.56, 3),

  -- Surepoint Demolition
  ((select id from public.tickets where ticket_number='260119-B23-000-13'), 'labour',    'Labour (rolled up)',    3400.00, 0, 3400.00, 1),
  ((select id from public.tickets where ticket_number='260119-B23-000-13'), 'equipment', 'Equipment (rolled up)',  768.00, 0,  768.00, 2),
  ((select id from public.tickets where ticket_number='260120-B23-000-17'), 'labour',    'Labour (rolled up)',    2697.00, 0, 2697.00, 1),
  ((select id from public.tickets where ticket_number='260120-B23-000-17'), 'equipment', 'Equipment (rolled up)',  576.00, 0,  576.00, 2),
  ((select id from public.tickets where ticket_number='260121-B23-000-21'), 'labour',    'Labour (rolled up)',    2110.00, 0, 2110.00, 1),
  ((select id from public.tickets where ticket_number='260121-B23-000-21'), 'equipment', 'Equipment (rolled up)',  544.00, 0,  544.00, 2),
  ((select id from public.tickets where ticket_number='260122-B23-000-28'), 'labour',    'Labour (rolled up)',    2224.00, 0, 2224.00, 1),
  ((select id from public.tickets where ticket_number='260122-B23-000-28'), 'equipment', 'Equipment (rolled up)',  576.00, 0,  576.00, 2),
  ((select id from public.tickets where ticket_number='260123-B25-000-48'), 'labour',    'Labour (rolled up)',    2306.00, 0, 2306.00, 1),
  ((select id from public.tickets where ticket_number='260123-B25-000-48'), 'equipment', 'Equipment (rolled up)',  512.00, 0,  512.00, 2),
  ((select id from public.tickets where ticket_number='260124-B25-000-52'), 'labour',    'Labour (rolled up)',    3216.00, 0, 3216.00, 1),
  ((select id from public.tickets where ticket_number='260124-B25-000-52'), 'equipment', 'Equipment (rolled up)',  640.00, 0,  640.00, 2),
  ((select id from public.tickets where ticket_number='260124-B25-000-52'), 'loa_other', 'LOA/Subsistence (rolled up)', 450.00, 0, 450.00, 3),
  ((select id from public.tickets where ticket_number='260125-B25-000-55'), 'labour',    'Labour (rolled up)',    3216.00, 0, 3216.00, 1),
  ((select id from public.tickets where ticket_number='260125-B25-000-55'), 'equipment', 'Equipment (rolled up)',  640.00, 0,  640.00, 2),
  ((select id from public.tickets where ticket_number='260125-B25-000-55'), 'loa_other', 'LOA/Subsistence (rolled up)', 450.00, 0, 450.00, 3),
  ((select id from public.tickets where ticket_number='260126-B27-000-31'), 'labour',    'Labour (rolled up)',    2262.00, 0, 2262.00, 1),
  ((select id from public.tickets where ticket_number='260126-B27-000-31'), 'equipment', 'Equipment (rolled up)',  576.00, 0,  576.00, 2),
  ((select id from public.tickets where ticket_number='260126-B27-000-31'), 'loa_other', 'LOA/Subsistence (rolled up)', 450.00, 0, 450.00, 3),
  ((select id from public.tickets where ticket_number='260128-B29-000-18'), 'labour',    'Labour (rolled up)',    1268.00, 0, 1268.00, 1),
  ((select id from public.tickets where ticket_number='260128-B29-000-18'), 'equipment', 'Equipment (rolled up)',  384.00, 0,  384.00, 2),
  ((select id from public.tickets where ticket_number='260128-B29-000-18'), 'materials', 'Materials (rolled up)', 1980.86, 0, 1980.86, 3),
  ((select id from public.tickets where ticket_number='260202-B06-000-14'), 'labour',    'Labour (rolled up)',    1064.00, 0, 1064.00, 1),
  ((select id from public.tickets where ticket_number='260202-B06-000-14'), 'equipment', 'Equipment (rolled up)',  252.00, 0,  252.00, 2),
  ((select id from public.tickets where ticket_number='260203-B06-000-16'), 'labour',    'Labour (rolled up)',    2592.00, 0, 2592.00, 1),
  ((select id from public.tickets where ticket_number='260203-B06-000-16'), 'equipment', 'Equipment (rolled up)', 1468.00, 0, 1468.00, 2),
  ((select id from public.tickets where ticket_number='260209-B12-000-17'), 'labour',    'Labour (rolled up)',    1680.00, 0, 1680.00, 1),
  ((select id from public.tickets where ticket_number='260209-B12-000-17'), 'equipment', 'Equipment (rolled up)',  384.00, 0,  384.00, 2),
  ((select id from public.tickets where ticket_number='260213-B19-000-22'), 'labour',    'Labour (rolled up)',     580.00, 0,  580.00, 1),
  ((select id from public.tickets where ticket_number='260213-B19-000-22'), 'equipment', 'Equipment (rolled up)',  160.00, 0,  160.00, 2),
  ((select id from public.tickets where ticket_number='260227-B04-000-21'), 'labour',    'Labour (rolled up)',    2492.00, 0, 2492.00, 1),
  ((select id from public.tickets where ticket_number='260227-B04-000-21'), 'equipment', 'Equipment (rolled up)',  384.00, 0,  384.00, 2),

  -- Surepoint Tie Breaker
  ((select id from public.tickets where ticket_number='260417-B18-000-5'),  'labour',    'Labour (rolled up)',    3412.00, 0, 3412.00, 1),
  ((select id from public.tickets where ticket_number='260417-B18-000-5'),  'equipment', 'Equipment (rolled up)',  764.00, 0,  764.00, 2),
  ((select id from public.tickets where ticket_number='260417-B18-000-5'),  'materials', 'Materials (rolled up)',  119.86, 0,  119.86, 3),
  ((select id from public.tickets where ticket_number='260506-B06-000-23'), 'labour',    'Labour (rolled up)',     178.00, 0,  178.00, 1),
  ((select id from public.tickets where ticket_number='260506-B06-000-23'), 'equipment', 'Equipment (rolled up)',   64.00, 0,   64.00, 2),
  ((select id from public.tickets where ticket_number='260507-B07-000-40'), 'labour',    'Labour (rolled up)',    1462.00, 0, 1462.00, 1),
  ((select id from public.tickets where ticket_number='260507-B07-000-40'), 'equipment', 'Equipment (rolled up)',  384.00, 0,  384.00, 2),
  ((select id from public.tickets where ticket_number='260507-B07-000-40'), 'materials', 'Materials (rolled up)',  734.40, 0,  734.40, 3),
  ((select id from public.tickets where ticket_number='260508-B08-000-58'), 'labour',    'Labour (rolled up)',     840.00, 0,  840.00, 1),
  ((select id from public.tickets where ticket_number='260508-B08-000-58'), 'equipment', 'Equipment (rolled up)',  192.00, 0,  192.00, 2),

  -- Energetic Svcs regular tickets (Labour + Equipment per hydrovac format)
  ((select id from public.tickets where ticket_number='1287344'), 'labour',    'Swamper labour (hours)',                       750.00, 0,  750.00, 1),
  ((select id from public.tickets where ticket_number='1287344'), 'equipment', 'Hydrovac truck hours (incl. fuel surcharge)', 3100.00, 0, 3100.00, 2),
  ((select id from public.tickets where ticket_number='1246484'), 'labour',    'Swamper labour (hours)',                       900.00, 0,  900.00, 1),
  ((select id from public.tickets where ticket_number='1246484'), 'equipment', 'Hydrovac truck hours (incl. fuel surcharge)', 3720.00, 0, 3720.00, 2),
  ((select id from public.tickets where ticket_number='1287345'), 'labour',    'Swamper labour (hours)',                       787.50, 0,  787.50, 1),
  ((select id from public.tickets where ticket_number='1287345'), 'equipment', 'Hydrovac truck hours (incl. fuel surcharge)', 3255.00, 0, 3255.00, 2),
  ((select id from public.tickets where ticket_number='1246485'), 'labour',    'Swamper labour (hours)',                       862.50, 0,  862.50, 1),
  ((select id from public.tickets where ticket_number='1246485'), 'equipment', 'Hydrovac truck hours (incl. fuel surcharge)', 3565.00, 0, 3565.00, 2),
  ((select id from public.tickets where ticket_number='1287346'), 'labour',    'Swamper labour (hours)',                       712.50, 0,  712.50, 1),
  ((select id from public.tickets where ticket_number='1287346'), 'equipment', 'Hydrovac truck hours (incl. fuel surcharge)', 2945.00, 0, 2945.00, 2),
  ((select id from public.tickets where ticket_number='1246486'), 'labour',    'Swamper labour (hours)',                       712.50, 0,  712.50, 1),
  ((select id from public.tickets where ticket_number='1246486'), 'equipment', 'Hydrovac truck hours (incl. fuel surcharge)', 2945.00, 0, 2945.00, 2),
  ((select id from public.tickets where ticket_number='1287347'), 'labour',    'Swamper labour (hours)',                       712.50, 0,  712.50, 1),
  ((select id from public.tickets where ticket_number='1287347'), 'equipment', 'Hydrovac truck hours (incl. fuel surcharge)', 2945.00, 0, 2945.00, 2),
  ((select id from public.tickets where ticket_number='1287348'), 'labour',    'Swamper labour (hours)',                       750.00, 0,  750.00, 1),
  ((select id from public.tickets where ticket_number='1287348'), 'equipment', 'Hydrovac truck hours (incl. fuel surcharge)', 3100.00, 0, 3100.00, 2),
  ((select id from public.tickets where ticket_number='1287349'), 'labour',    'Swamper labour (hours)',                       712.50, 0,  712.50, 1),
  ((select id from public.tickets where ticket_number='1287349'), 'equipment', 'Hydrovac truck hours (incl. fuel surcharge)', 2945.00, 0, 2945.00, 2),
  ((select id from public.tickets where ticket_number='1246487'), 'labour',    'Swamper labour (hours)',                       712.50, 0,  712.50, 1),
  ((select id from public.tickets where ticket_number='1246487'), 'equipment', 'Hydrovac truck hours (incl. fuel surcharge)', 3218.89, 0, 3218.89, 2),
  ((select id from public.tickets where ticket_number='1246488'), 'labour',    'Swamper labour (hours)',                       750.00, 0,  750.00, 1),
  ((select id from public.tickets where ticket_number='1246488'), 'equipment', 'Hydrovac truck hours (incl. fuel surcharge)', 3388.30, 0, 3388.30, 2),
  ((select id from public.tickets where ticket_number='1246489'), 'labour',    'Swamper labour (hours)',                       637.50, 0,  637.50, 1),
  ((select id from public.tickets where ticket_number='1246489'), 'equipment', 'Hydrovac truck hours (incl. fuel surcharge)', 2880.06, 0, 2880.06, 2),
  ((select id from public.tickets where ticket_number='1246490'), 'labour',    'Swamper labour (hours)',                       975.00, 0,  975.00, 1),
  ((select id from public.tickets where ticket_number='1246490'), 'equipment', 'Hydrovac truck hours (incl. fuel surcharge)', 4356.43, 0, 4356.43, 2),
  ((select id from public.tickets where ticket_number='1287351'), 'labour',    'Swamper labour (hours)',                       900.00, 0,  900.00, 1),
  ((select id from public.tickets where ticket_number='1287351'), 'equipment', 'Hydrovac truck hours (incl. fuel surcharge)', 4021.32, 0, 4021.32, 2),
  ((select id from public.tickets where ticket_number='1246491'), 'labour',    'Swamper labour (hours)',                       825.00, 0,  825.00, 1),
  ((select id from public.tickets where ticket_number='1246491'), 'equipment', 'Hydrovac truck hours (incl. fuel surcharge)', 3648.70, 0, 3648.70, 2),
  ((select id from public.tickets where ticket_number='1287352'), 'labour',    'Swamper labour (hours)',                       787.50, 0,  787.50, 1),
  ((select id from public.tickets where ticket_number='1287352'), 'equipment', 'Hydrovac truck hours (incl. fuel surcharge)', 3482.85, 0, 3482.85, 2),

  -- Energetic Svcs master tickets (aggregated rollup)
  ((select id from public.tickets where ticket_number='MT2026-000492'), 'labour',    'Master ticket — swamper labour (5 BOLs)',         4537.50, 0,  4537.50, 1),
  ((select id from public.tickets where ticket_number='MT2026-000492'), 'equipment', 'Master ticket — hydrovac truck hours (5 BOLs)',  20011.60, 0, 20011.60, 2),
  ((select id from public.tickets where ticket_number='MT2026-000493'), 'labour',    'Master ticket — swamper labour (6 BOLs)',         5287.50, 0,  5287.50, 1),
  ((select id from public.tickets where ticket_number='MT2026-000493'), 'equipment', 'Master ticket — hydrovac truck hours (6 BOLs)',  23363.01, 0, 23363.01, 2),
  ((select id from public.tickets where ticket_number='MT2026-000494'), 'labour',    'Master ticket — swamper labour (6 BOLs)',         4837.50, 0,  4837.50, 1),
  ((select id from public.tickets where ticket_number='MT2026-000494'), 'equipment', 'Master ticket — hydrovac truck hours (6 BOLs)',  21374.67, 0, 21374.67, 2),

  -- Albright Flush — vac truck loads (categorized as Materials per dashboard mapping)
  ((select id from public.tickets where ticket_number='207910'), 'materials', 'Waste fluid disposal — vac truck load', 4440.00, 0, 4440.00, 1),
  ((select id from public.tickets where ticket_number='207937'), 'materials', 'Waste fluid disposal — vac truck load', 4440.00, 0, 4440.00, 1),
  ((select id from public.tickets where ticket_number='207938'), 'materials', 'Waste fluid disposal — vac truck load', 4440.00, 0, 4440.00, 1),
  ((select id from public.tickets where ticket_number='207939'), 'materials', 'Waste fluid disposal — vac truck load', 4160.00, 0, 4160.00, 1),
  ((select id from public.tickets where ticket_number='207954'), 'materials', 'Waste fluid disposal — vac truck load', 4440.00, 0, 4440.00, 1),
  ((select id from public.tickets where ticket_number='207999'), 'materials', 'Waste fluid disposal — vac truck load', 5280.00, 0, 5280.00, 1),

  -- Vector Geomatics — Aitken Creek c-A20-D
  ((select id from public.tickets where ticket_number='60073'), 'labour', 'Survey labour (rolled up)', 1221.25, 0, 1221.25, 1),

  -- Vector Geomatics — 44-L/94-A-13
  ((select id from public.tickets where ticket_number='62382'), 'labour',    'Survey labour (rolled up)',     5425.00, 0,  5425.00, 1),
  ((select id from public.tickets where ticket_number='62382'), 'equipment', 'Survey equipment (rolled up)',   644.50, 0,   644.50, 2),
  ((select id from public.tickets where ticket_number='62382'), 'materials', 'Materials (rolled up)',          814.57, 0,   814.57, 3),
  ((select id from public.tickets where ticket_number='62453'), 'labour',    'Survey labour (rolled up)',     3205.00, 0,  3205.00, 1),
  ((select id from public.tickets where ticket_number='62453'), 'equipment', 'Survey equipment (rolled up)',   325.00, 0,   325.00, 2),
  ((select id from public.tickets where ticket_number='62627'), 'labour',    'Survey labour (rolled up)',    20020.00, 0, 20020.00, 1),
  ((select id from public.tickets where ticket_number='62627'), 'equipment', 'Survey equipment (rolled up)', 9383.50, 0,  9383.50, 2);

-- ------------------------------------------------------------
-- BOL registry — 17 BOLs consolidated across 3 master tickets
-- ------------------------------------------------------------
insert into public.bol_registry (master_ticket_id, bol_number) values
  ((select id from public.tickets where ticket_number='MT2026-000492'), '1246492'),
  ((select id from public.tickets where ticket_number='MT2026-000492'), '1285876'),
  ((select id from public.tickets where ticket_number='MT2026-000492'), '1287353'),
  ((select id from public.tickets where ticket_number='MT2026-000492'), '1287355'),
  ((select id from public.tickets where ticket_number='MT2026-000492'), '1287356'),
  ((select id from public.tickets where ticket_number='MT2026-000493'), '1246493'),
  ((select id from public.tickets where ticket_number='MT2026-000493'), '1285877'),
  ((select id from public.tickets where ticket_number='MT2026-000493'), '1285903'),
  ((select id from public.tickets where ticket_number='MT2026-000493'), '1285926'),
  ((select id from public.tickets where ticket_number='MT2026-000493'), '1285951'),
  ((select id from public.tickets where ticket_number='MT2026-000493'), '1287357'),
  ((select id from public.tickets where ticket_number='MT2026-000494'), '1246494'),
  ((select id from public.tickets where ticket_number='MT2026-000494'), '1285878'),
  ((select id from public.tickets where ticket_number='MT2026-000494'), '1285904'),
  ((select id from public.tickets where ticket_number='MT2026-000494'), '1285927'),
  ((select id from public.tickets where ticket_number='MT2026-000494'), '1285952'),
  ((select id from public.tickets where ticket_number='MT2026-000494'), '1287358');

-- ------------------------------------------------------------
-- Re-enable recompute trigger; run one recompute pass.
-- If any ticket fails to reconcile, the CHECK constraint aborts.
-- ------------------------------------------------------------
alter table public.line_items enable trigger line_items_recompute_after_change;

update public.tickets t set
  computed_total = coalesce((select sum(final_amount) from public.line_items where ticket_id = t.id), 0),
  reconciled = abs(t.face_value - coalesce((select sum(final_amount) from public.line_items where ticket_id = t.id), 0)) < 0.005;

-- Safety check
do $$
declare c int;
begin
  select count(*) into c from public.tickets where not reconciled and status <> 'rejected';
  if c > 0 then
    raise exception 'Seed failed: % unreconciled non-rejected tickets', c;
  end if;
end$$;

commit;

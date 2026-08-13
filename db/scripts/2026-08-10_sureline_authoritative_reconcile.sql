-- =============================================================================
-- 2026-08-10 — Sureline authoritative reconcile (337 tickets across 6 POs)
-- =============================================================================
-- Source: SURELINE_TICKETS_FOR_NAEP.md exported by SureLine's Azure sync.
-- Sureline is now the source of truth for these 6 POs. This script wipes
-- every existing ticket on those POs and re-inserts exactly the spec's
-- 337 rows in a single transaction.
--
-- Prerequisites:
--   1. Migration 0016 applied (drops face_value >= 0 constraint so credit
--      tickets can land). This script also drops it defensively.
--   2. All 6 POs must exist in service_pos. If PUR-6540-2001278 is missing
--      because Sureline knows it as PUR-6540-2000884, run this first:
--        update public.service_pos
--        set po_number = 'PUR-6540-2001278'
--        where po_number = 'PUR-6540-2000884';
--
-- Approval-status translation (per spec, all six count as approved):
--   'Approved by Client/PM', 'Customer Approved', 'Approved by Client',
--   'Approved - Revised',   'Approved - OpenTicket', 'Invoiced Client'
--     → status = 'invoiced'
--   Everything else (e.g. 'Sent to Client via Portal', 'See Notes')
--     → status = 'pending'
--
-- Dates: spec does not include ticket_date. Existing dates are snapshotted
-- into a temp table and re-applied by (po_number, ticket_number). New
-- rows that don't have an existing date fall back to sentinel 2026-06-01,
-- which the next Aimsio pull will overwrite.
--
-- Expected: 337 tickets total, 324 approved, approved sum $3,420,551.98,
-- combined sum $3,538,748.89.
-- =============================================================================

begin;

-- 1) Guard: all 6 Sureline POs must exist.
do $$
declare cnt int;
begin
  select count(*) into cnt from public.service_pos
   where po_number in (
     'PUR-6540-2001285', 'PUR-6540-2001280', 'PUR-6540-2000943',
     'PUR-6540-2001271', 'PUR-6540-2001171', 'PUR-6540-2001278'
   );
  if cnt <> 6 then
    raise exception 'Expected 6 Sureline POs, found %. Check PUR-6540-2001278 vs PUR-6540-2000884 rename.', cnt;
  end if;
end $$;

-- 2) Snapshot existing dates so we don't lose them across delete+insert.
create temp table sureline_reconcile_dates on commit drop as
select p.po_number, t.ticket_number, t.ticket_date
from public.tickets t
join public.service_pos p on p.id = t.po_id
where p.po_number in (
  'PUR-6540-2001285', 'PUR-6540-2001280', 'PUR-6540-2000943',
  'PUR-6540-2001271', 'PUR-6540-2001171', 'PUR-6540-2001278'
);

-- 3) Drop face_value >= 0 constraint (see migration 0016). Idempotent.
alter table public.tickets drop constraint if exists tickets_face_value_check;

-- 4) Wipe all existing tickets on the 6 Sureline POs.
delete from public.tickets
where po_id in (
  select id from public.service_pos where po_number in (
    'PUR-6540-2001285', 'PUR-6540-2001280', 'PUR-6540-2000943',
    'PUR-6540-2001271', 'PUR-6540-2001171', 'PUR-6540-2001278'
  )
);

-- 5) Insert the spec's 337 tickets.
with r(po_number, ticket_number, face_value, approval_status) as (values
  -- ─── PUR-6540-2000943 · SL26-010 (closed) · 33 tickets ────────────────────
  ('PUR-6540-2000943', '06-03-SL26-010-000-001', 12623.00::numeric(14,2), 'Approved by Client/PM'),
  ('PUR-6540-2000943', '06-05-SL26-010-000-001', 12323.00, 'Approved by Client/PM'),
  ('PUR-6540-2000943', 'SL26-010-000-001',        7265.00, 'Approved by Client/PM'),
  ('PUR-6540-2000943', 'SL26-010-000-002',        3090.00, 'Approved by Client/PM'),
  ('PUR-6540-2000943', 'SL26-010-000-003',        7265.00, 'Approved by Client/PM'),
  ('PUR-6540-2000943', 'SL26-010-000-004',        7265.00, 'Approved by Client/PM'),
  ('PUR-6540-2000943', 'SL26-010-000-005',        3090.00, 'Approved by Client/PM'),
  ('PUR-6540-2000943', 'SL26-010-000-006',        7265.00, 'Approved by Client/PM'),
  ('PUR-6540-2000943', 'SL26-010-000-007',        7265.00, 'Approved by Client/PM'),
  ('PUR-6540-2000943', 'SL26-010-000-008',        7265.00, 'Approved by Client/PM'),
  ('PUR-6540-2000943', 'SL26-010-000-009',       43184.40, 'Approved by Client/PM'),
  ('PUR-6540-2000943', 'SL26-010-000-010',        7265.00, 'Approved by Client/PM'),
  ('PUR-6540-2000943', 'SL26-010-000-011',       11241.00, 'Approved by Client/PM'),
  ('PUR-6540-2000943', 'SL26-010-000-012',       11241.00, 'Approved by Client/PM'),
  ('PUR-6540-2000943', 'SL26-010-000-013',        5430.00, 'Approved by Client/PM'),
  ('PUR-6540-2000943', 'SL26-010-000-014',        6367.00, 'Approved by Client/PM'),
  ('PUR-6540-2000943', 'SL26-010-000-015',        9537.00, 'Approved by Client/PM'),
  ('PUR-6540-2000943', 'SL26-010-000-016',        7265.00, 'Approved by Client/PM'),
  ('PUR-6540-2000943', 'SL26-010-000-017',        7265.00, 'Approved by Client/PM'),
  ('PUR-6540-2000943', 'SL26-010-000-018',        7817.50, 'Approved by Client/PM'),
  ('PUR-6540-2000943', 'SL26-010-000-019',        7265.00, 'Approved by Client/PM'),
  ('PUR-6540-2000943', 'SL26-010-000-020',        8265.00, 'Approved by Client/PM'),
  ('PUR-6540-2000943', 'SL26-010-000-021',        3090.00, 'Approved by Client/PM'),
  ('PUR-6540-2000943', 'SL26-010-000-022',        6537.00, 'Approved by Client/PM'),
  ('PUR-6540-2000943', 'SL26-010-000-023',       10283.00, 'Approved by Client/PM'),
  ('PUR-6540-2000943', 'SL26-010-000-024',       10283.00, 'Approved by Client/PM'),
  ('PUR-6540-2000943', 'SL26-010-000-025',       11123.00, 'Approved by Client/PM'),
  ('PUR-6540-2000943', 'SL26-010-000-026',       19002.26, 'Approved by Client/PM'),
  ('PUR-6540-2000943', 'SL26-010-000-027',        3632.50, 'Approved by Client/PM'),
  ('PUR-6540-2000943', 'SL26-010-000-028',        2590.00, 'Approved by Client/PM'),
  ('PUR-6540-2000943', 'SL26-010-000-029',        3632.50, 'Approved by Client/PM'),
  ('PUR-6540-2000943', 'SL26-010-000-031',        3090.00, 'Approved by Client/PM'),
  ('PUR-6540-2000943', 'SL26-010-000-032',        1545.00, 'Approved by Client/PM'),

  -- ─── PUR-6540-2001171 · SL26-047 · 42 tickets (2 legacy formats: -TP, -TS) ─
  ('PUR-6540-2001171', 'SL26-047-000-001',       53008.59, 'Approved by Client/PM'),
  ('PUR-6540-2001171', 'SL26-047-000-002',        1250.00, 'Approved by Client/PM'),
  ('PUR-6540-2001171', 'SL26-047-000-003',        3363.00, 'Approved by Client/PM'),
  ('PUR-6540-2001171', 'SL26-047-TP-5834',        2156.25, 'Approved by Client/PM'),
  ('PUR-6540-2001171', 'SL26-047-TP-5844',       31227.51, 'Approved by Client/PM'),
  ('PUR-6540-2001171', 'SL26-047-TP-5845',       23577.63, 'Approved by Client/PM'),
  ('PUR-6540-2001171', 'SL26-047-TS-01',          4405.50, 'Approved by Client/PM'),
  ('PUR-6540-2001171', 'SL26-047-TS-02',          4405.50, 'Approved by Client/PM'),
  ('PUR-6540-2001171', 'SL26-047-TS-03',          1718.00, 'Approved by Client/PM'),
  ('PUR-6540-2001171', 'SL26-047-TS-04',           996.25, 'Approved by Client/PM'),
  ('PUR-6540-2001171', 'SL26-047-TS-05',          1300.00, 'Approved by Client/PM'),
  ('PUR-6540-2001171', 'SL26-047-TS-06',          4516.25, 'Approved by Client/PM'),
  ('PUR-6540-2001171', 'SL26-047-TS-07',          6328.25, 'Approved by Client/PM'),
  ('PUR-6540-2001171', 'SL26-047-TS-08',          4249.25, 'Approved by Client/PM'),
  ('PUR-6540-2001171', 'SL26-047-TS-09',         14365.00, 'Approved by Client/PM'),
  ('PUR-6540-2001171', 'SL26-047-TS-10',         15147.75, 'Approved by Client/PM'),
  ('PUR-6540-2001171', 'SL26-047-TS-11',         19832.75, 'Approved by Client/PM'),
  ('PUR-6540-2001171', 'SL26-047-TS-12',         19909.75, 'Approved by Client/PM'),
  ('PUR-6540-2001171', 'SL26-047-TS-13',          2768.00, 'Approved by Client/PM'),
  ('PUR-6540-2001171', 'SL26-047-TS-14',         19716.80, 'Approved by Client/PM'),
  ('PUR-6540-2001171', 'SL26-047-TS-15',          2768.00, 'Approved by Client/PM'),
  ('PUR-6540-2001171', 'SL26-047-TS-16',         11048.70, 'Approved by Client/PM'),
  ('PUR-6540-2001171', 'SL26-047-TS-17',          9840.50, 'Approved by Client/PM'),
  ('PUR-6540-2001171', 'SL26-047-TS-18',         10533.00, 'Approved by Client/PM'),
  ('PUR-6540-2001171', 'SL26-047-TS-19',           700.00, 'Approved by Client/PM'),
  ('PUR-6540-2001171', 'SL26-047-TS-20',         12047.50, 'Approved by Client/PM'),
  ('PUR-6540-2001171', 'SL26-047-TS-21',          8257.75, 'Approved by Client/PM'),
  ('PUR-6540-2001171', 'SL26-047-TS-22',         10086.25, 'Approved by Client/PM'),
  ('PUR-6540-2001171', 'SL26-047-TS-23',         17139.25, 'Approved by Client/PM'),
  ('PUR-6540-2001171', 'SL26-047-TS-24',          3677.00, 'Approved by Client/PM'),
  ('PUR-6540-2001171', 'SL26-047-TS-25',         35654.50, 'Approved by Client/PM'),
  ('PUR-6540-2001171', 'SL26-047-TS-26',         30756.50, 'Approved by Client/PM'),
  ('PUR-6540-2001171', 'SL26-047-TS-27',           711.25, 'Approved by Client/PM'),
  ('PUR-6540-2001171', 'SL26-047-TS-28',          3667.50, 'Approved by Client/PM'),
  ('PUR-6540-2001171', 'SL26-047-TS-29',          3167.50, 'Approved by Client/PM'),
  ('PUR-6540-2001171', 'SL26-047-TS-30',         34006.00, 'Approved by Client/PM'),
  ('PUR-6540-2001171', 'SL26-047-TS-31',           190.00, 'Approved by Client/PM'),
  ('PUR-6540-2001171', 'SL26-047-TS-32',         43942.25, 'Approved by Client/PM'),
  ('PUR-6540-2001171', 'SL26-047-TS-33',         26851.50, 'Approved by Client/PM'),
  ('PUR-6540-2001171', 'SL26-047-TS-34',          9116.00, 'Approved by Client/PM'),
  ('PUR-6540-2001171', 'SL26-047-TS-35',         -4900.00, 'Approved by Client/PM'),  -- credit ticket
  ('PUR-6540-2001171', 'SL26-047-TS-36',           255.00, 'Approved by Client/PM'),

  -- ─── PUR-6540-2001271 · SL26-085 · 46 tickets ────────────────────────────
  ('PUR-6540-2001271', 'SL26-085-000-001',        7443.00, 'Approved by Client/PM'),
  ('PUR-6540-2001271', 'SL26-085-000-002',        7443.00, 'Approved by Client/PM'),
  ('PUR-6540-2001271', 'SL26-085-000-003',        2085.00, 'Approved by Client/PM'),
  ('PUR-6540-2001271', 'SL26-085-000-004',        8053.00, 'Approved by Client/PM'),
  ('PUR-6540-2001271', 'SL26-085-000-005',        8053.00, 'Approved by Client/PM'),
  ('PUR-6540-2001271', 'SL26-085-000-006',        8053.00, 'Approved by Client/PM'),
  ('PUR-6540-2001271', 'SL26-085-000-007',        8841.00, 'Approved by Client/PM'),
  ('PUR-6540-2001271', 'SL26-085-000-008',       12334.00, 'Approved by Client/PM'),
  ('PUR-6540-2001271', 'SL26-085-000-009',       12869.00, 'Approved by Client/PM'),
  ('PUR-6540-2001271', 'SL26-085-000-010',       14019.00, 'Approved by Client/PM'),
  ('PUR-6540-2001271', 'SL26-085-000-011',       15244.00, 'Approved by Client/PM'),
  ('PUR-6540-2001271', 'SL26-085-000-012',       13769.00, 'Approved by Client/PM'),
  ('PUR-6540-2001271', 'SL26-085-000-013',       15433.00, 'Approved by Client/PM'),
  ('PUR-6540-2001271', 'SL26-085-000-014',        3033.00, 'Approved by Client/PM'),
  ('PUR-6540-2001271', 'SL26-085-000-015',       10642.00, 'Approved by Client/PM'),
  ('PUR-6540-2001271', 'SL26-085-000-016',        9526.00, 'Approved by Client/PM'),
  ('PUR-6540-2001271', 'SL26-085-000-017',        8053.00, 'Approved by Client/PM'),
  ('PUR-6540-2001271', 'SL26-085-000-018',         170.00, 'Approved by Client/PM'),
  ('PUR-6540-2001271', 'SL26-085-000-019',        9526.00, 'Approved by Client/PM'),
  ('PUR-6540-2001271', 'SL26-085-000-020',        9526.00, 'Approved by Client/PM'),
  ('PUR-6540-2001271', 'SL26-085-000-021',        9016.00, 'Approved by Client/PM'),
  ('PUR-6540-2001271', 'SL26-085-000-022',        8836.00, 'Approved by Client/PM'),
  ('PUR-6540-2001271', 'SL26-085-000-023',        9361.00, 'Approved by Client/PM'),
  ('PUR-6540-2001271', 'SL26-085-000-024',        9361.00, 'Approved by Client/PM'),
  ('PUR-6540-2001271', 'SL26-085-000-025',        9361.00, 'Approved by Client/PM'),
  ('PUR-6540-2001271', 'SL26-085-000-026',        6771.00, 'Approved by Client/PM'),
  ('PUR-6540-2001271', 'SL26-085-000-027',       13844.00, 'Approved by Client/PM'),
  ('PUR-6540-2001271', 'SL26-085-000-028',       10965.00, 'Approved by Client/PM'),
  ('PUR-6540-2001271', 'SL26-085-000-029',      122077.11, 'Approved by Client/PM'),
  ('PUR-6540-2001271', 'SL26-085-000-030',        9994.50, 'Approved by Client/PM'),
  ('PUR-6540-2001271', 'SL26-085-000-031',       10384.50, 'Approved by Client/PM'),
  ('PUR-6540-2001271', 'SL26-085-000-032',       10384.50, 'Approved by Client/PM'),
  ('PUR-6540-2001271', 'SL26-085-000-033',       10384.50, 'Approved by Client/PM'),
  ('PUR-6540-2001271', 'SL26-085-000-034',       10777.00, 'Approved by Client/PM'),
  ('PUR-6540-2001271', 'SL26-085-000-035',        8674.00, 'Approved by Client/PM'),
  ('PUR-6540-2001271', 'SL26-085-000-036',       10929.00, 'Approved by Client/PM'),
  ('PUR-6540-2001271', 'SL26-085-000-037',        8339.00, 'Approved by Client/PM'),
  ('PUR-6540-2001271', 'SL26-085-000-038',        8239.00, 'Approved by Client/PM'),
  ('PUR-6540-2001271', 'SL26-085-000-039',        8214.00, 'Approved by Client/PM'),
  ('PUR-6540-2001271', 'SL26-085-000-040',        8804.00, 'Approved by Client/PM'),
  ('PUR-6540-2001271', 'SL26-085-000-041',        9303.50, 'Approved by Client/PM'),
  ('PUR-6540-2001271', 'SL26-085-000-042',        3199.50, 'Approved by Client/PM'),
  ('PUR-6540-2001271', 'SL26-085-000-043',         450.00, 'Approved by Client/PM'),
  ('PUR-6540-2001271', 'SL26-085-000-044',       70571.52, 'Approved by Client/PM'),
  ('PUR-6540-2001271', 'SL26-085-000-045',         180.00, 'Approved by Client/PM'),
  ('PUR-6540-2001271', 'SL26-085-000-046',       10035.84, 'Sent to Client via Portal'),

  -- ─── PUR-6540-2001278 · SL26-095 · 72 tickets ────────────────────────────
  ('PUR-6540-2001278', 'SL26-095-000-001',        9348.50, 'Approved by Client/PM'),
  ('PUR-6540-2001278', 'SL26-095-000-002',        9348.50, 'Approved by Client/PM'),
  ('PUR-6540-2001278', 'SL26-095-000-003',        1094.00, 'Approved by Client/PM'),
  ('PUR-6540-2001278', 'SL26-095-000-004',        3213.00, 'Approved by Client/PM'),
  ('PUR-6540-2001278', 'SL26-095-000-005',        4243.00, 'Approved by Client/PM'),
  ('PUR-6540-2001278', 'SL26-095-000-006',        1142.50, 'Approved by Client/PM'),
  ('PUR-6540-2001278', 'SL26-095-000-007',        4063.00, 'Approved by Client/PM'),
  ('PUR-6540-2001278', 'SL26-095-000-008',       15514.00, 'Approved by Client/PM'),
  ('PUR-6540-2001278', 'SL26-095-000-009',       22842.00, 'Approved by Client/PM'),
  ('PUR-6540-2001278', 'SL26-095-000-010',           0.00, 'See Notes'),
  ('PUR-6540-2001278', 'SL26-095-000-012',       25304.00, 'Approved by Client/PM'),
  ('PUR-6540-2001278', 'SL26-095-000-013',        4521.00, 'Approved by Client/PM'),
  ('PUR-6540-2001278', 'SL26-095-000-014',       21126.50, 'Approved by Client/PM'),
  ('PUR-6540-2001278', 'SL26-095-000-015',       20983.00, 'Approved by Client/PM'),
  ('PUR-6540-2001278', 'SL26-095-000-016',       21711.00, 'Approved by Client/PM'),
  ('PUR-6540-2001278', 'SL26-095-000-017',       18820.00, 'Approved by Client/PM'),
  ('PUR-6540-2001278', 'SL26-095-000-018',        5621.00, 'Approved by Client/PM'),
  ('PUR-6540-2001278', 'SL26-095-000-019',        9825.00, 'Approved by Client/PM'),
  ('PUR-6540-2001278', 'SL26-095-000-020',       22883.50, 'Approved by Client/PM'),
  ('PUR-6540-2001278', 'SL26-095-000-021',          85.00, 'Approved by Client/PM'),
  ('PUR-6540-2001278', 'SL26-095-000-022',       23371.50, 'Approved by Client/PM'),
  ('PUR-6540-2001278', 'SL26-095-000-023',       23955.50, 'Approved by Client/PM'),
  ('PUR-6540-2001278', 'SL26-095-000-024',       21557.50, 'Approved by Client/PM'),
  ('PUR-6540-2001278', 'SL26-095-000-025',       11412.00, 'Approved by Client/PM'),
  ('PUR-6540-2001278', 'SL26-095-000-026',       11268.50, 'Approved by Client/PM'),
  ('PUR-6540-2001278', 'SL26-095-000-027',       11412.00, 'Approved by Client/PM'),
  ('PUR-6540-2001278', 'SL26-095-000-028',       14831.00, 'Approved by Client/PM'),
  ('PUR-6540-2001278', 'SL26-095-000-029',        2125.00, 'Approved by Client/PM'),
  ('PUR-6540-2001278', 'SL26-095-000-030',        5048.00, 'Approved by Client/PM'),
  ('PUR-6540-2001278', 'SL26-095-000-031',       10004.00, 'Approved by Client/PM'),
  ('PUR-6540-2001278', 'SL26-095-000-032',       11408.50, 'Approved by Client/PM'),
  ('PUR-6540-2001278', 'SL26-095-000-033',        2125.00, 'Approved by Client/PM'),
  ('PUR-6540-2001278', 'SL26-095-000-034',       16237.00, 'Approved by Client/PM'),
  ('PUR-6540-2001278', 'SL26-095-000-035',       22110.00, 'Approved by Client/PM'),
  ('PUR-6540-2001278', 'SL26-095-000-036',       18680.50, 'Approved by Client/PM'),
  ('PUR-6540-2001278', 'SL26-095-000-037',       12152.00, 'Approved by Client/PM'),
  ('PUR-6540-2001278', 'SL26-095-000-038',      167162.18, 'Approved by Client/PM'),
  ('PUR-6540-2001278', 'SL26-095-000-039',       16876.00, 'Approved by Client/PM'),
  ('PUR-6540-2001278', 'SL26-095-000-040',       14417.50, 'Approved by Client/PM'),
  ('PUR-6540-2001278', 'SL26-095-000-041',       14220.00, 'Approved by Client/PM'),
  ('PUR-6540-2001278', 'SL26-095-000-042',       14265.00, 'Approved by Client/PM'),
  ('PUR-6540-2001278', 'SL26-095-000-043',       23691.00, 'Approved by Client/PM'),
  ('PUR-6540-2001278', 'SL26-095-000-044',       16390.00, 'Approved by Client/PM'),
  ('PUR-6540-2001278', 'SL26-095-000-045',       27716.00, 'Approved by Client/PM'),
  ('PUR-6540-2001278', 'SL26-095-000-046',        6843.00, 'Approved by Client/PM'),
  ('PUR-6540-2001278', 'SL26-095-000-047',        9784.00, 'Approved by Client/PM'),
  ('PUR-6540-2001278', 'SL26-095-000-048',        7288.00, 'Approved by Client/PM'),
  ('PUR-6540-2001278', 'SL26-095-000-049',        9279.50, 'Approved by Client/PM'),
  ('PUR-6540-2001278', 'SL26-095-000-050',        4226.00, 'See Notes'),
  ('PUR-6540-2001278', 'SL26-095-000-051',        9875.00, 'Approved by Client/PM'),
  ('PUR-6540-2001278', 'SL26-095-000-052',       25913.25, 'Approved by Client/PM'),
  ('PUR-6540-2001278', 'SL26-095-000-053',        2853.00, 'Approved by Client/PM'),
  ('PUR-6540-2001278', 'SL26-095-000-054',       25656.25, 'Approved by Client/PM'),
  ('PUR-6540-2001278', 'SL26-095-000-055',        2825.36, 'Approved by Client/PM'),
  ('PUR-6540-2001278', 'SL26-095-000-056',       13553.25, 'Approved by Client/PM'),
  ('PUR-6540-2001278', 'SL26-095-000-057',        4549.00, 'Approved by Client/PM'),
  ('PUR-6540-2001278', 'SL26-095-000-058',        7189.25, 'Approved by Client/PM'),
  ('PUR-6540-2001278', 'SL26-095-000-059',         496.00, 'Approved by Client/PM'),
  ('PUR-6540-2001278', 'SL26-095-000-060',       23174.25, 'Approved by Client/PM'),
  ('PUR-6540-2001278', 'SL26-095-000-061',       16411.25, 'Approved by Client/PM'),
  ('PUR-6540-2001278', 'SL26-095-000-062',        8559.00, 'Approved by Client/PM'),
  ('PUR-6540-2001278', 'SL26-095-000-063',       18596.25, 'Approved by Client/PM'),
  ('PUR-6540-2001278', 'SL26-095-000-064',       16089.36, 'Sent to Client via Portal'),
  ('PUR-6540-2001278', 'SL26-095-000-065',        5719.25, 'Approved by Client/PM'),
  ('PUR-6540-2001278', 'SL26-095-000-066',        2853.00, 'Approved by Client/PM'),
  ('PUR-6540-2001278', 'SL26-095-000-067',       10034.00, 'Approved by Client/PM'),
  ('PUR-6540-2001278', 'SL26-095-000-068',        1469.00, 'Approved by Client/PM'),
  ('PUR-6540-2001278', 'SL26-095-000-069',        9212.00, 'Approved by Client/PM'),
  ('PUR-6540-2001278', 'SL26-095-000-070',       26741.00, 'Approved by Client/PM'),
  ('PUR-6540-2001278', 'SL26-095-000-071',        2853.00, 'Approved by Client/PM'),
  ('PUR-6540-2001278', 'SL26-095-000-072',       20062.00, 'Approved by Client/PM'),
  ('PUR-6540-2001278', 'SL26-095-000-073',       34028.94, 'Sent to Client via Portal'),

  -- ─── PUR-6540-2001280 · SL26-010 (open) · 30 tickets ─────────────────────
  ('PUR-6540-2001280', 'SL26-010-000-033',        2590.00, 'Approved by Client/PM'),
  ('PUR-6540-2001280', 'SL26-010-000-034',        3632.50, 'Approved by Client/PM'),
  ('PUR-6540-2001280', 'SL26-010-000-035',        4927.50, 'Approved by Client/PM'),
  ('PUR-6540-2001280', 'SL26-010-000-036',        2590.00, 'Approved by Client/PM'),
  ('PUR-6540-2001280', 'SL26-010-000-037',        3632.50, 'Approved by Client/PM'),
  ('PUR-6540-2001280', 'SL26-010-000-038',        3090.00, 'Approved by Client/PM'),
  ('PUR-6540-2001280', 'SL26-010-000-039',        3090.00, 'Approved by Client/PM'),
  ('PUR-6540-2001280', 'SL26-010-000-040',        2590.00, 'Approved by Client/PM'),
  ('PUR-6540-2001280', 'SL26-010-000-041',        2590.00, 'Approved by Client/PM'),
  ('PUR-6540-2001280', 'SL26-010-000-042',        2590.00, 'Approved by Client/PM'),
  ('PUR-6540-2001280', 'SL26-010-000-043',        3090.00, 'Approved by Client/PM'),
  ('PUR-6540-2001280', 'SL26-010-000-045',        3090.00, 'Approved by Client/PM'),
  ('PUR-6540-2001280', 'SL26-010-000-046',        2590.00, 'Approved by Client/PM'),
  ('PUR-6540-2001280', 'SL26-010-000-047',        8918.13, 'Approved by Client/PM'),
  ('PUR-6540-2001280', 'SL26-010-000-048',        4132.50, 'Approved by Client/PM'),
  ('PUR-6540-2001280', 'SL26-010-000-049',        2590.00, 'Approved by Client/PM'),
  ('PUR-6540-2001280', 'SL26-010-000-050',        2590.00, 'Approved by Client/PM'),
  ('PUR-6540-2001280', 'SL26-010-000-051',        2590.00, 'Approved by Client/PM'),
  ('PUR-6540-2001280', 'SL26-010-000-052',       14767.50, 'Approved by Client/PM'),
  ('PUR-6540-2001280', 'SL26-010-000-053',        2590.00, 'Approved by Client/PM'),
  ('PUR-6540-2001280', 'SL26-010-000-054',        2590.00, 'Approved by Client/PM'),
  ('PUR-6540-2001280', 'SL26-010-000-055',        2590.00, 'Approved by Client/PM'),
  ('PUR-6540-2001280', 'SL26-010-000-056',        2154.00, 'Approved by Client/PM'),
  ('PUR-6540-2001280', 'SL26-010-000-057',        3090.00, 'Approved by Client/PM'),
  ('PUR-6540-2001280', 'SL26-010-000-058',        6123.00, 'Approved by Client/PM'),
  ('PUR-6540-2001280', 'SL26-010-000-059',        5443.00, 'Approved by Client/PM'),
  ('PUR-6540-2001280', 'SL26-010-000-060',        2590.00, 'Approved by Client/PM'),
  ('PUR-6540-2001280', 'SL26-010-000-061',        1000.00, 'Approved by Client/PM'),
  ('PUR-6540-2001280', 'SL26-010-000-062',        2590.00, 'Approved by Client/PM'),
  ('PUR-6540-2001280', 'SL26-010-000-063',        1304.33, 'Sent to Client via Portal'),

  -- ─── PUR-6540-2001285 · SL26-096 (4) + SL26-101 (110) · 114 tickets ──────
  ('PUR-6540-2001285', 'SL26-096-000-001',        3632.50, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-096-000-002',        2587.50, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-096-000-003',        2337.50, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-096-000-004',       31814.75, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-001',         720.00, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-002',        1845.00, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-003',        1725.00, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-004',        8094.00, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-005',       22641.50, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-006',       20281.00, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-007',       22871.00, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-008',       12976.00, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-009',         960.00, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-010',         960.00, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-011',        3094.50, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-012',        1440.00, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-013',        5488.00, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-014',        1485.00, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-015',         765.00, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-016',        8096.50, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-017',       12152.50, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-018',       11861.50, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-019',         720.00, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-020',       20460.50, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-021',       24392.00, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-022',         720.00, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-023',        2235.00, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-024',        8097.50, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-025',        1304.50, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-026',        2235.00, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-027',       11867.00, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-028',        8812.00, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-030',        8705.00, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-031',        2235.00, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-032',        1906.50, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-033',       10967.00, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-034',        5494.50, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-035',        9107.50, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-036',        2235.00, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-037',        1005.00, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-038',        3196.50, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-039',       37763.70, 'Sent to Client via Portal'),
  ('PUR-6540-2001285', 'SL26-101-000-040',       94317.94, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-041',         765.00, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-042',        1845.00, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-043',        9632.00, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-044',        1542.50, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-045',        2853.00, 'Sent to Client via Portal'),
  ('PUR-6540-2001285', 'SL26-101-000-046',       16946.00, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-047',        1845.00, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-048',        2853.00, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-049',        1845.00, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-050',        1460.50, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-051',        1271.25, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-052',        1485.00, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-053',        1845.00, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-054',        6700.00, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-055',       12701.00, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-056',        5075.00, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-057',        4371.25, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-058',         600.00, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-059',       29574.00, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-060',        7695.00, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-061',        4579.72, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-063',       11402.25, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-064',       15652.25, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-065',        6358.50, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-066',       11305.25, 'Sent to Client via Portal'),
  ('PUR-6540-2001285', 'SL26-101-000-067',        8214.00, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-068',        9889.00, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-069',       27357.25, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-070',        1440.00, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-071',         720.00, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-072',         720.00, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-073',         728.00, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-074',       10079.00, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-075',        1469.00, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-077',       11196.00, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-078',        9829.00, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-079',        5838.00, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-080',       14728.63, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-081',       10993.00, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-082',       13059.00, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-083',         960.00, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-084',         960.00, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-085',           0.00, 'Sent to Client via Portal'),
  ('PUR-6540-2001285', 'SL26-101-000-086',       13630.00, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-087',       10993.00, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-088',        8998.00, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-089',        1573.00, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-090',       13785.00, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-091',       10764.22, 'Sent to Client via Portal'),
  ('PUR-6540-2001285', 'SL26-101-000-092',        2644.43, 'Sent to Client via Portal'),
  ('PUR-6540-2001285', 'SL26-101-000-093',        5443.00, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-094',       15335.00, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-095',        9829.00, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-096',      -12818.16, 'Sent to Client via Portal'),  -- credit ticket
  ('PUR-6540-2001285', 'SL26-101-000-097',        9829.00, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-098',       12248.00, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-099',        1250.00, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-100',        8464.00, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-101',       24142.00, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-102',        8464.00, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-103',       33982.25, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-104',        1250.00, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-105',         720.00, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-106',         240.00, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-107',       30474.25, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-108',       16435.25, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-109',        8214.00, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-111',       15714.25, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-112',        2750.00, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-113',        8514.00, 'Approved by Client/PM'),
  ('PUR-6540-2001285', 'SL26-101-000-114',       13894.25, 'Approved by Client/PM')
)
insert into public.tickets (
  po_id, ticket_number, ticket_date, source_type, is_master,
  face_value, computed_total, reconciled, status, approval_status, ewp_no
)
select
  p.id,
  r.ticket_number,
  coalesce(d.ticket_date, '2026-06-01'::date),
  'aimsio_status',
  false,
  r.face_value,
  r.face_value,
  true,
  case
    when r.approval_status in (
      'Approved by Client/PM','Customer Approved','Approved by Client',
      'Approved - Revised','Approved - OpenTicket','Invoiced Client'
    ) then 'invoiced'
    else 'pending'
  end,
  r.approval_status,
  case
    when r.po_number = 'PUR-6540-2001271' then 11    -- whole-PO EWP 11
    else null::int
  end
from r
join public.service_pos p on p.po_number = r.po_number
left join sureline_reconcile_dates d
  on d.po_number = r.po_number and d.ticket_number = r.ticket_number;

commit;

-- =============================================================================
-- Verification — run after commit.
-- =============================================================================
--   select
--     p.po_number,
--     count(*)                                                    as tickets,
--     count(*) filter (where t.status = 'invoiced')               as approved,
--     sum(t.face_value)::numeric(14,2)                            as total,
--     sum(t.face_value) filter (where t.status = 'invoiced')::numeric(14,2) as approved_sum
--   from public.service_pos p
--   join public.tickets t on t.po_id = p.id
--   where p.po_number in (
--     'PUR-6540-2001285','PUR-6540-2001280','PUR-6540-2000943',
--     'PUR-6540-2001271','PUR-6540-2001171','PUR-6540-2001278'
--   )
--   group by p.po_number
--   order by p.po_number;
--
-- Expected grand totals across the 6 POs:
--   tickets      = 337
--   approved     = 324
--   total        = $3,538,748.89
--   approved_sum = $3,420,551.98

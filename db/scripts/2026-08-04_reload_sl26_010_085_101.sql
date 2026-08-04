-- =============================================================================
-- 2026-08-04 — Reload SL26-010 / SL26-085 / SL26-101 from fresh Aimsio exports
-- =============================================================================
-- Follows the same shape as `sync_job_tickets`: DELETE every existing ticket
-- whose ticket_number carries the job prefix (matches BOTH the plain
-- SL26-NNN-000-XXX form AND any Aimsio date-prefixed variant like
-- 06-05-SL26-010-000-001), then INSERT the current CSV verbatim. Wrapped in
-- a single transaction, so if any step raises, the tracker never lands in a
-- half-loaded state.
--
-- Storage rule: ticket_number = the raw column value from Aimsio, including
-- any date prefix. Rows like 06-05-SL26-010-000-001 carry their own WMT
-- GUID and workday and are distinct tickets — NOT duplicates of the plain
-- 001. (This is the corrected rule; the earlier collapse strategy was
-- losing real approved work.)
--
-- Void filter: SL26-101-000-045 (CP Approval Status = Void) is the only
-- row dropped across the three files.
--
-- Status translation: 'Approved by Client/PM' -> 'invoiced', everything
-- else -> 'pending'. Approval_status column carries the Aimsio value
-- verbatim so the Ticket Map's strict rule still renders correctly.
--
-- EWP roll-up:
--   PO 2001280 (SL26-010) — no EWP breakdown; ewp_no = NULL for all rows.
--   PO 2001271 (SL26-085) — whole-PO EWP 11 rule; ewp_no = 11 for all.
--   PO 2001285 (SL26-101) — per-ticket lookup from lib/ewp/ticket-ewp.ts;
--     tickets 039 and 061 span multiple EWPs (rendered in "Multiple EWPs"
--     bucket, ewp_no = NULL); post-041 tickets without a coding sheet
--     entry stay NULL and render in "Unassigned to EWP" until SureLine
--     sends the next codes.
--
-- Expected inserts:  SL26-010 → 57 · SL26-085 → 44 · SL26-101 → 83
-- Expected LEM:      SL26-010 $370,361.79 · SL26-085 $572,355.63 ·
--                    SL26-101 $733,519.67
-- =============================================================================

begin;

-- Sanity: bail early if the three POs aren't seeded.
do $$
declare cnt int;
begin
  select count(*) into cnt from public.service_pos
   where po_number in ('PUR-6540-2001280','PUR-6540-2001271','PUR-6540-2001285');
  if cnt <> 3 then
    raise exception 'Expected 3 service POs (2001280, 2001271, 2001285), found %', cnt;
  end if;
end $$;

-- ============================================================================
-- SL26-010 → PUR-6540-2001280 · 57 tickets (0 voids, 0 collisions)
-- ============================================================================
delete from public.tickets where ticket_number like '%SL26-010-%';

with po as (select id from public.service_pos where po_number = 'PUR-6540-2001280'),
r(ticket_number, ticket_date, face_value, status_val, approval_status) as (values
  ('SL26-010-000-057',       '2026-08-02'::date,  3090.00,'pending', 'Sent to Client via Portal'),
  ('SL26-010-000-056',       '2026-08-01'::date,  2154.00,'pending', 'Sent to Client via Portal'),
  ('SL26-010-000-055',       '2026-07-31'::date,  2590.00,'pending', 'Sent to Client via Portal'),
  ('SL26-010-000-054',       '2026-07-30'::date,  2590.00,'pending', 'Sent to Client via Portal'),
  ('SL26-010-000-053',       '2026-07-29'::date,  2590.00,'pending', 'Sent to Client via Portal'),
  ('SL26-010-000-052',       '2026-07-29'::date, 14767.50,'invoiced','Approved by Client/PM'),
  ('SL26-010-000-051',       '2026-07-28'::date,  2590.00,'pending', 'Sent to Client via Portal'),
  ('SL26-010-000-050',       '2026-07-27'::date,  2590.00,'pending', 'Sent to Client via Portal'),
  ('SL26-010-000-048',       '2026-07-18'::date,  4132.50,'invoiced','Approved by Client/PM'),
  ('SL26-010-000-047',       '2026-07-13'::date,  8918.13,'pending', 'Sent to Client via Portal'),
  ('SL26-010-000-049',       '2026-07-07'::date,  2590.00,'pending', 'Sent to Client via Portal'),
  ('SL26-010-000-046',       '2026-07-06'::date,  2590.00,'invoiced','Approved by Client/PM'),
  ('SL26-010-000-045',       '2026-07-05'::date,  3090.00,'invoiced','Approved by Client/PM'),
  ('SL26-010-000-043',       '2026-07-04'::date,  3090.00,'invoiced','Approved by Client/PM'),
  ('SL26-010-000-042',       '2026-07-02'::date,  2590.00,'invoiced','Approved by Client/PM'),
  ('SL26-010-000-041',       '2026-07-01'::date,  2590.00,'invoiced','Approved by Client/PM'),
  ('SL26-010-000-040',       '2026-06-29'::date,  2590.00,'invoiced','Approved by Client/PM'),
  ('SL26-010-000-039',       '2026-06-28'::date,  3090.00,'invoiced','Approved by Client/PM'),
  ('SL26-010-000-038',       '2026-06-27'::date,  3090.00,'invoiced','Approved by Client/PM'),
  ('SL26-010-000-037',       '2026-06-26'::date,  3632.50,'invoiced','Approved by Client/PM'),
  ('SL26-010-000-036',       '2026-06-25'::date,  2590.00,'invoiced','Approved by Client/PM'),
  ('SL26-010-000-035',       '2026-06-24'::date,  4927.50,'invoiced','Approved by Client/PM'),
  ('SL26-010-000-034',       '2026-06-23'::date,  3632.50,'invoiced','Approved by Client/PM'),
  ('SL26-010-000-033',       '2026-06-22'::date,  2590.00,'invoiced','Approved by Client/PM'),
  ('SL26-010-000-032',       '2026-06-21'::date,  1545.00,'invoiced','Approved by Client/PM'),
  ('SL26-010-000-031',       '2026-06-20'::date,  3090.00,'invoiced','Approved by Client/PM'),
  ('SL26-010-000-029',       '2026-06-18'::date,  3632.50,'invoiced','Approved by Client/PM'),
  ('SL26-010-000-026',       '2026-06-17'::date, 19002.26,'invoiced','Approved by Client/PM'),
  ('SL26-010-000-028',       '2026-06-17'::date,  2590.00,'invoiced','Approved by Client/PM'),
  ('SL26-010-000-027',       '2026-06-16'::date,  3632.50,'invoiced','Approved by Client/PM'),
  ('SL26-010-000-022',       '2026-06-15'::date,  6537.00,'invoiced','Approved by Client/PM'),
  ('SL26-010-000-021',       '2026-06-14'::date,  3090.00,'invoiced','Approved by Client/PM'),
  ('SL26-010-000-020',       '2026-06-13'::date,  8265.00,'invoiced','Approved by Client/PM'),
  ('SL26-010-000-019',       '2026-06-12'::date,  7265.00,'invoiced','Approved by Client/PM'),
  ('SL26-010-000-018',       '2026-06-11'::date,  7817.50,'invoiced','Approved by Client/PM'),
  ('SL26-010-000-017',       '2026-06-10'::date,  7265.00,'invoiced','Approved by Client/PM'),
  ('SL26-010-000-016',       '2026-06-09'::date,  7265.00,'invoiced','Approved by Client/PM'),
  ('SL26-010-000-015',       '2026-06-08'::date,  9537.00,'invoiced','Approved by Client/PM'),
  ('SL26-010-000-014',       '2026-06-05'::date,  6367.00,'invoiced','Approved by Client/PM'),
  ('SL26-010-000-013',       '2026-06-04'::date,  5430.00,'invoiced','Approved by Client/PM'),
  ('06-05-SL26-010-000-001', '2026-06-03'::date, 12323.00,'invoiced','Approved by Client/PM'),
  ('06-03-SL26-010-000-001', '2026-06-02'::date, 12623.00,'invoiced','Approved by Client/PM'),
  ('SL26-010-000-012',       '2026-05-31'::date, 11241.00,'invoiced','Approved by Client/PM'),
  ('SL26-010-000-011',       '2026-05-30'::date, 11241.00,'invoiced','Approved by Client/PM'),
  ('SL26-010-000-009',       '2026-05-30'::date, 43184.40,'invoiced','Approved by Client/PM'),
  ('SL26-010-000-010',       '2026-05-29'::date,  7265.00,'invoiced','Approved by Client/PM'),
  ('SL26-010-000-008',       '2026-05-28'::date,  7265.00,'invoiced','Approved by Client/PM'),
  ('SL26-010-000-007',       '2026-05-27'::date,  7265.00,'invoiced','Approved by Client/PM'),
  ('SL26-010-000-006',       '2026-05-26'::date,  7265.00,'invoiced','Approved by Client/PM'),
  ('SL26-010-000-004',       '2026-05-25'::date,  7265.00,'invoiced','Approved by Client/PM'),
  ('SL26-010-000-005',       '2026-05-24'::date,  3090.00,'invoiced','Approved by Client/PM'),
  ('SL26-010-000-002',       '2026-05-23'::date,  3090.00,'invoiced','Approved by Client/PM'),
  ('SL26-010-000-003',       '2026-05-22'::date,  7265.00,'invoiced','Approved by Client/PM'),
  ('SL26-010-000-001',       '2026-05-21'::date,  7265.00,'invoiced','Approved by Client/PM'),
  ('SL26-010-000-025',       '2026-05-20'::date, 11123.00,'invoiced','Approved by Client/PM'),
  ('SL26-010-000-024',       '2026-05-19'::date, 10283.00,'invoiced','Approved by Client/PM'),
  ('SL26-010-000-023',       '2026-05-14'::date, 10283.00,'invoiced','Approved by Client/PM')
)
insert into public.tickets (po_id, ticket_number, ticket_date, source_type, is_master,
                             face_value, computed_total, reconciled, status,
                             approval_status, ewp_no)
select po.id, r.ticket_number, r.ticket_date, 'aimsio_status', false,
       r.face_value, r.face_value, true, r.status_val, r.approval_status, null::int
from r, po;

-- ============================================================================
-- SL26-085 → PUR-6540-2001271 · 44 tickets (0 voids, whole-PO EWP 11)
-- ============================================================================
delete from public.tickets where ticket_number like '%SL26-085-%';

with po as (select id from public.service_pos where po_number = 'PUR-6540-2001271'),
r(ticket_number, ticket_date, face_value, status_val, approval_status) as (values
  ('SL26-085-000-044', '2026-07-30'::date,  70571.52,'invoiced','Approved by Client/PM'),
  ('SL26-085-000-043', '2026-07-28'::date,    450.00,'pending', 'Sent to Client via Portal'),
  ('SL26-085-000-042', '2026-07-27'::date,   3199.50,'pending', 'Sent to Client via Portal'),
  ('SL26-085-000-041', '2026-07-25'::date,   9303.50,'pending', 'Sent to Client via Portal'),
  ('SL26-085-000-040', '2026-07-24'::date,   8804.00,'pending', 'Sent to Client via Portal'),
  ('SL26-085-000-039', '2026-07-23'::date,   8214.00,'pending', 'Sent to Client via Portal'),
  ('SL26-085-000-038', '2026-07-22'::date,   8239.00,'invoiced','Approved by Client/PM'),
  ('SL26-085-000-037', '2026-07-21'::date,   8339.00,'invoiced','Approved by Client/PM'),
  ('SL26-085-000-036', '2026-07-20'::date,  10929.00,'invoiced','Approved by Client/PM'),
  ('SL26-085-000-035', '2026-07-18'::date,   8674.00,'invoiced','Approved by Client/PM'),
  ('SL26-085-000-034', '2026-07-17'::date,  10777.00,'invoiced','Approved by Client/PM'),
  ('SL26-085-000-033', '2026-07-16'::date,  10384.50,'invoiced','Approved by Client/PM'),
  ('SL26-085-000-032', '2026-07-15'::date,  10384.50,'invoiced','Approved by Client/PM'),
  ('SL26-085-000-031', '2026-07-14'::date,  10384.50,'invoiced','Approved by Client/PM'),
  ('SL26-085-000-030', '2026-07-13'::date,   9994.50,'invoiced','Approved by Client/PM'),
  ('SL26-085-000-029', '2026-07-13'::date, 122077.11,'invoiced','Approved by Client/PM'),
  ('SL26-085-000-028', '2026-07-12'::date,  10965.00,'invoiced','Approved by Client/PM'),
  ('SL26-085-000-027', '2026-07-11'::date,  13844.00,'invoiced','Approved by Client/PM'),
  ('SL26-085-000-026', '2026-07-10'::date,   6771.00,'invoiced','Approved by Client/PM'),
  ('SL26-085-000-025', '2026-07-09'::date,   9361.00,'invoiced','Approved by Client/PM'),
  ('SL26-085-000-024', '2026-07-08'::date,   9361.00,'invoiced','Approved by Client/PM'),
  ('SL26-085-000-023', '2026-07-07'::date,   9361.00,'invoiced','Approved by Client/PM'),
  ('SL26-085-000-021', '2026-06-27'::date,   9016.00,'invoiced','Approved by Client/PM'),
  ('SL26-085-000-020', '2026-06-26'::date,   9526.00,'invoiced','Approved by Client/PM'),
  ('SL26-085-000-019', '2026-06-25'::date,   9526.00,'invoiced','Approved by Client/PM'),
  ('SL26-085-000-022', '2026-06-24'::date,   8836.00,'invoiced','Approved by Client/PM'),
  ('SL26-085-000-018', '2026-06-23'::date,    170.00,'invoiced','Approved by Client/PM'),
  ('SL26-085-000-017', '2026-06-23'::date,   8053.00,'invoiced','Approved by Client/PM'),
  ('SL26-085-000-016', '2026-06-22'::date,   9526.00,'invoiced','Approved by Client/PM'),
  ('SL26-085-000-015', '2026-06-21'::date,  10642.00,'invoiced','Approved by Client/PM'),
  ('SL26-085-000-014', '2026-06-21'::date,   3033.00,'invoiced','Approved by Client/PM'),
  ('SL26-085-000-013', '2026-06-20'::date,  15433.00,'invoiced','Approved by Client/PM'),
  ('SL26-085-000-012', '2026-06-19'::date,  13769.00,'invoiced','Approved by Client/PM'),
  ('SL26-085-000-011', '2026-06-18'::date,  15244.00,'invoiced','Approved by Client/PM'),
  ('SL26-085-000-010', '2026-06-17'::date,  14019.00,'invoiced','Approved by Client/PM'),
  ('SL26-085-000-009', '2026-06-16'::date,  12869.00,'invoiced','Approved by Client/PM'),
  ('SL26-085-000-008', '2026-06-15'::date,  12334.00,'invoiced','Approved by Client/PM'),
  ('SL26-085-000-007', '2026-06-13'::date,   8841.00,'invoiced','Approved by Client/PM'),
  ('SL26-085-000-006', '2026-06-12'::date,   8053.00,'invoiced','Approved by Client/PM'),
  ('SL26-085-000-005', '2026-06-11'::date,   8053.00,'invoiced','Approved by Client/PM'),
  ('SL26-085-000-004', '2026-06-10'::date,   8053.00,'invoiced','Approved by Client/PM'),
  ('SL26-085-000-003', '2026-06-09'::date,   2085.00,'invoiced','Approved by Client/PM'),
  ('SL26-085-000-002', '2026-06-05'::date,   7443.00,'invoiced','Approved by Client/PM'),
  ('SL26-085-000-001', '2026-06-04'::date,   7443.00,'invoiced','Approved by Client/PM')
)
insert into public.tickets (po_id, ticket_number, ticket_date, source_type, is_master,
                             face_value, computed_total, reconciled, status,
                             approval_status, ewp_no)
select po.id, r.ticket_number, r.ticket_date, 'aimsio_status', false,
       r.face_value, r.face_value, true, r.status_val, r.approval_status, 11::int
from r, po;

-- ============================================================================
-- SL26-101 → PUR-6540-2001285 · 83 tickets (1 void skipped: 045)
-- Per-ticket EWP mapping from lib/ewp/ticket-ewp.ts; tickets 039 + 061 span
-- multiple EWPs (NULL here → rendered in "Multiple EWPs" bucket).
-- ============================================================================
delete from public.tickets where ticket_number like '%SL26-101-%';

with po as (select id from public.service_pos where po_number = 'PUR-6540-2001285'),
r(ticket_number, ticket_date, face_value, status_val, approval_status, ewp_no) as (values
  ('SL26-101-000-087', '2026-08-02'::date, 10993.00,'pending', 'Sent to Client via Portal', null::int),
  ('SL26-101-000-086', '2026-08-02'::date, 13630.00,'pending', 'Sent to Client via Portal', null::int),
  ('SL26-101-000-085', '2026-08-01'::date,     0.00,'pending', 'Sent to Client via Portal', null::int),
  ('SL26-101-000-080', '2026-08-01'::date, 14728.63,'invoiced','Approved by Client/PM',     null::int),
  ('SL26-101-000-082', '2026-08-01'::date, 13059.00,'invoiced','Approved by Client/PM',     null::int),
  ('SL26-101-000-081', '2026-08-01'::date, 10993.00,'invoiced','Approved by Client/PM',     null::int),
  ('SL26-101-000-079', '2026-07-31'::date,  5838.00,'invoiced','Approved by Client/PM',     null::int),
  ('SL26-101-000-078', '2026-07-31'::date,  9829.00,'invoiced','Approved by Client/PM',     null::int),
  ('SL26-101-000-084', '2026-07-31'::date,   960.00,'invoiced','Approved by Client/PM',     null::int),
  ('SL26-101-000-083', '2026-07-30'::date,   960.00,'invoiced','Approved by Client/PM',     null::int),
  ('SL26-101-000-077', '2026-07-30'::date, 11196.00,'pending', 'Sent to Client via Portal', null::int),
  ('SL26-101-000-075', '2026-07-30'::date,  1469.00,'pending', 'Sent to Client via Portal', null::int),
  ('SL26-101-000-074', '2026-07-30'::date, 10079.00,'pending', 'Sent to Client via Portal', null::int),
  ('SL26-101-000-073', '2026-07-29'::date,   728.00,'pending', 'Sent to Client via Portal', null::int),
  ('SL26-101-000-068', '2026-07-29'::date,  9889.00,'pending', 'Sent to Client via Portal', null::int),
  ('SL26-101-000-070', '2026-07-29'::date,  1440.00,'pending', 'Sent to Client via Portal', null::int),
  ('SL26-101-000-069', '2026-07-29'::date, 27357.25,'pending', 'Sent to Client via Portal', null::int),
  ('SL26-101-000-067', '2026-07-28'::date,  8214.00,'pending', 'Sent to Client via Portal', null::int),
  ('SL26-101-000-066', '2026-07-28'::date, 11305.25,'pending', 'Sent to Client via Portal', null::int),
  ('SL26-101-000-071', '2026-07-28'::date,   720.00,'pending', 'Sent to Client via Portal', null::int),
  ('SL26-101-000-072', '2026-07-27'::date,   720.00,'pending', 'Sent to Client via Portal', null::int),
  ('SL26-101-000-065', '2026-07-27'::date,  6358.50,'pending', 'Sent to Client via Portal', null::int),
  ('SL26-101-000-064', '2026-07-27'::date, 15652.25,'pending', 'Sent to Client via Portal', null::int),
  ('SL26-101-000-061', '2026-07-27'::date,  4579.72,'pending', 'Sent to Client via Portal', null::int),
  ('SL26-101-000-063', '2026-07-26'::date, 11402.25,'pending', 'Sent to Client via Portal', 8),
  ('SL26-101-000-060', '2026-07-25'::date,  7695.00,'pending', 'Sent to Client via Portal', 18),
  ('SL26-101-000-059', '2026-07-25'::date, 29574.00,'pending', 'Sent to Client via Portal', 8),
  ('SL26-101-000-058', '2026-07-24'::date,   600.00,'pending', 'Sent to Client via Portal', 13),
  ('SL26-101-000-056', '2026-07-24'::date,  5075.00,'pending', 'Sent to Client via Portal', 8),
  ('SL26-101-000-057', '2026-07-24'::date,  4371.25,'pending', 'Sent to Client via Portal', 18),
  ('SL26-101-000-055', '2026-07-23'::date, 12701.00,'invoiced','Approved by Client/PM',     null::int),
  ('SL26-101-000-054', '2026-07-23'::date,  6700.00,'invoiced','Approved by Client/PM',     null::int),
  ('SL26-101-000-053', '2026-07-23'::date,  1845.00,'invoiced','Approved by Client/PM',     null::int),
  ('SL26-101-000-048', '2026-07-22'::date,  2853.00,'invoiced','Approved by Client/PM',     null::int),
  ('SL26-101-000-047', '2026-07-22'::date,  1845.00,'invoiced','Approved by Client/PM',     null::int),
  ('SL26-101-000-046', '2026-07-22'::date, 16946.00,'invoiced','Approved by Client/PM',     null::int),
  ('SL26-101-000-042', '2026-07-21'::date,  1845.00,'invoiced','Approved by Client/PM',     null::int),
  ('SL26-101-000-043', '2026-07-21'::date,  9632.00,'invoiced','Approved by Client/PM',     null::int),
  ('SL26-101-000-044', '2026-07-21'::date,  1542.50,'invoiced','Approved by Client/PM',     null::int),
  ('SL26-101-000-040', '2026-07-20'::date, 94317.94,'invoiced','Approved by Client/PM',     12),
  ('SL26-101-000-039', '2026-07-20'::date, 63897.38,'pending', 'Sent to Client via Portal', null::int),
  ('SL26-101-000-049', '2026-07-20'::date,  1845.00,'pending', 'Sent to Client via Portal', 13),
  ('SL26-101-000-038', '2026-07-18'::date,  3196.50,'invoiced','Approved by Client/PM',     5),
  ('SL26-101-000-041', '2026-07-17'::date,   765.00,'invoiced','Approved by Client/PM',     13),
  ('SL26-101-000-031', '2026-07-17'::date,  2235.00,'invoiced','Approved by Client/PM',     5),
  ('SL26-101-000-033', '2026-07-17'::date, 10967.00,'invoiced','Approved by Client/PM',     8),
  ('SL26-101-000-032', '2026-07-17'::date,  1906.50,'invoiced','Approved by Client/PM',     8),
  ('SL26-101-000-037', '2026-07-16'::date,  1005.00,'invoiced','Approved by Client/PM',     13),
  ('SL26-101-000-036', '2026-07-16'::date,  2235.00,'pending', 'Sent to Client via Portal', 5),
  ('SL26-101-000-035', '2026-07-16'::date,  9107.50,'invoiced','Approved by Client/PM',     4),
  ('SL26-101-000-034', '2026-07-16'::date,  5494.50,'invoiced','Approved by Client/PM',     8),
  ('SL26-101-000-052', '2026-07-15'::date,  1485.00,'pending', 'Sent to Client via Portal', 8),
  ('SL26-101-000-028', '2026-07-15'::date,  8812.00,'invoiced','Approved by Client/PM',     4),
  ('SL26-101-000-030', '2026-07-15'::date,  8705.00,'invoiced','Approved by Client/PM',     8),
  ('SL26-101-000-027', '2026-07-14'::date, 11867.00,'invoiced','Approved by Client/PM',     8),
  ('SL26-101-000-026', '2026-07-14'::date,  2235.00,'invoiced','Approved by Client/PM',     5),
  ('SL26-101-000-023', '2026-07-13'::date,  2235.00,'invoiced','Approved by Client/PM',     8),
  ('SL26-101-000-025', '2026-07-13'::date,  1304.50,'invoiced','Approved by Client/PM',     5),
  ('SL26-101-000-024', '2026-07-13'::date,  8097.50,'invoiced','Approved by Client/PM',     5),
  ('SL26-101-000-050', '2026-07-11'::date,  1460.50,'pending', 'Sent to Client via Portal', 5),
  ('SL26-101-000-022', '2026-07-11'::date,   720.00,'invoiced','Approved by Client/PM',     8),
  ('SL26-101-000-021', '2026-07-11'::date, 24392.00,'invoiced','Approved by Client/PM',     8),
  ('SL26-101-000-020', '2026-07-10'::date, 20460.50,'invoiced','Approved by Client/PM',     8),
  ('SL26-101-000-019', '2026-07-09'::date,   720.00,'invoiced','Approved by Client/PM',     8),
  ('SL26-101-000-018', '2026-07-09'::date, 11861.50,'invoiced','Approved by Client/PM',     8),
  ('SL26-101-000-017', '2026-07-08'::date, 12152.50,'invoiced','Approved by Client/PM',     8),
  ('SL26-101-000-016', '2026-07-07'::date,  8096.50,'invoiced','Approved by Client/PM',     8),
  ('SL26-101-000-051', '2026-07-07'::date,  1271.25,'pending', 'Sent to Client via Portal', 8),
  ('SL26-101-000-015', '2026-07-06'::date,   765.00,'invoiced','Approved by Client/PM',     8),
  ('SL26-101-000-014', '2026-07-03'::date,  1485.00,'invoiced','Approved by Client/PM',     8),
  ('SL26-101-000-012', '2026-07-03'::date,  1440.00,'invoiced','Approved by Client/PM',     8),
  ('SL26-101-000-013', '2026-07-02'::date,  5488.00,'invoiced','Approved by Client/PM',     13),
  ('SL26-101-000-010', '2026-07-02'::date,   960.00,'invoiced','Approved by Client/PM',     8),
  ('SL26-101-000-011', '2026-07-02'::date,  3094.50,'invoiced','Approved by Client/PM',     8),
  ('SL26-101-000-009', '2026-07-01'::date,   960.00,'invoiced','Approved by Client/PM',     8),
  ('SL26-101-000-008', '2026-07-01'::date, 12976.00,'invoiced','Approved by Client/PM',     8),
  ('SL26-101-000-007', '2026-06-30'::date, 22871.00,'invoiced','Approved by Client/PM',     8),
  ('SL26-101-000-006', '2026-06-29'::date, 20281.00,'invoiced','Approved by Client/PM',     8),
  ('SL26-101-000-005', '2026-06-28'::date, 22641.50,'invoiced','Approved by Client/PM',     8),
  ('SL26-101-000-004', '2026-06-27'::date,  8094.00,'invoiced','Approved by Client/PM',     8),
  ('SL26-101-000-003', '2026-06-26'::date,  1725.00,'invoiced','Approved by Client/PM',     8),
  ('SL26-101-000-002', '2026-06-25'::date,  1845.00,'invoiced','Approved by Client/PM',     8),
  ('SL26-101-000-001', '2026-06-24'::date,   720.00,'invoiced','Approved by Client/PM',     8)
)
insert into public.tickets (po_id, ticket_number, ticket_date, source_type, is_master,
                             face_value, computed_total, reconciled, status,
                             approval_status, ewp_no)
select po.id, r.ticket_number, r.ticket_date, 'aimsio_status', false,
       r.face_value, r.face_value, true, r.status_val, r.approval_status, r.ewp_no
from r, po;

commit;

-- =============================================================================
-- Verification — run these after commit to eyeball the reload.
-- =============================================================================
--   select
--     p.po_number,
--     count(*)                                             as ticket_count,
--     count(*) filter (where t.status = 'invoiced')        as approved,
--     count(*) filter (where t.status = 'pending')         as pending,
--     sum(t.face_value)::numeric(14,2)                     as lem
--   from public.service_pos p
--   join public.tickets t on t.po_id = p.id
--   where p.po_number in ('PUR-6540-2001280','PUR-6540-2001271','PUR-6540-2001285')
--   group by p.po_number
--   order by p.po_number;
--
--   Expected:
--     PUR-6540-2001271 (SL26-085) → 44 tickets · $572,355.63
--     PUR-6540-2001280 (SL26-010) → 57 tickets · $370,361.79
--     PUR-6540-2001285 (SL26-101) → 83 tickets · $733,519.67

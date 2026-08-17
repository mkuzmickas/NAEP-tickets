-- =============================================================================
-- 2026-08-17 — Apex PVF supplementary seed · PO 2001335 (EWP #20)
-- =============================================================================
-- One more Apex Distribution PO landed after the earlier seeds. Additive
-- INSERTs only — the 11 existing POs (2001314-2001322 + 2001331-2001334) are
-- untouched.
--
--   PUR-6540-2001335 · EWP #20 · Recycle Compressor Area Off Skid Piping
--                                                        67 lines · $34,426.93
--
-- Order date 2026-07-30 · Jade Rowe · Apex Distribution · 4 weeks ARO.
--
-- Not idempotent — apex_pos.po_number has UNIQUE, so a re-run fails on the
-- INSERT with duplicate key (that's the desired behaviour).
-- =============================================================================

begin;

insert into public.apex_pos
  (po_number, ewp, gle_package, description, requester, supplier, order_date, total_amount, currency, notes)
values
  ('PUR-6540-2001335', 'EWP #20', '24198-4001-10', 'Recycle Compressor Area Off Skid Piping', 'Jade Rowe', 'Apex Distribution', '2026-07-30', 34426.93, 'CAD', 'Req-6540-1001338 · quote 070826-RW-ENBRIDGE dated 2026-07-14 · lead time 4 weeks ARO');

insert into public.apex_line_items (apex_po_id, line_number, size, description, quantity, uom, unit_cost, amount, lead_time)
select (select id from public.apex_pos where po_number = 'PUR-6540-2001335'),
       v.line_number, v.size, v.description, v.quantity, v.uom, v.unit_cost, v.amount, '4 WEEKS ARO'
from (values
  ( 1, '4"',      'ELBOW, 45 DEG, BW, LR, SCH 80, A420 GR WPL6 WELD ELBOW 4" XH (.337) LR 45 A420-WPL6 APPROVED',                                                             2::numeric,'Each',    15.36::numeric,     30.72::numeric),
  ( 2, '6"',      'ELBOW, 45 DEG, BW, LR, SCH STD, A420 GR WPL6 WELD ELBOW 6" STD (.280) LR 45 A420-WPL6 APPROVED',                                                           4::numeric,'Each',    46.67::numeric,    186.68::numeric),
  ( 3, '2"',      'ELBOW, 90 DEG, BW, LR, SCH 80, A234 GR WPB WELD ELBOW 2" XH (.218) LR 90 A420-WPL6 APPROVED',                                                              6::numeric,'Each',     5.69::numeric,     34.14::numeric),
  ( 4, '2"',      'ELBOW, 90 DEG, BW, LR, SCH 80, A420 GR WPL6 WELD ELBOW 2" XH (.218) LR 90 A420-WPL6 APPROVED',                                                            31::numeric,'Each',     5.69::numeric,    176.39::numeric),
  ( 5, '4"',      'ELBOW, 90 DEG, BW, LR, SCH 80, A420 GR WPL6 WELD ELBOW 4" XH (.337) LR 90 A420-WPL6 APPROVED',                                                            10::numeric,'Each',    28.15::numeric,    281.50::numeric),
  ( 6, '4"',      'ELBOW, 90 DEG, BW, LR, SCH STD, A420 GR WPL6 WELD ELBOW 4" STD (.237) LR 90 A420-WPL6 APPROVED',                                                           3::numeric,'Each',    19.43::numeric,     58.29::numeric),
  ( 7, '6"',      'ELBOW, 90 DEG, BW, LR, SCH STD, A420 GR WPL6 WELD ELBOW 6" STD (.280) LR 90 A420-WPL6 APPROVED',                                                          15::numeric,'Each',    50.33::numeric,    754.95::numeric),
  ( 8, '8"',      'ELBOW, 90 DEG, BW, LR, SCH STD, A420 GR WPL6 WELD ELBOW 8" STD (.322) LR 90 A420-WPL6 APPROVED',                                                           5::numeric,'Each',   102.29::numeric,    511.45::numeric),
  ( 9, '2"',      'FLANGE, RF, BLIND, CL150 ASME, A350 GR LF2 CL1 FLANGE RF BLIND 2" 150 A350-LF2 APPROVED',                                                                  6::numeric,'Each',    12.01::numeric,     72.06::numeric),
  (10, '6"',      'FLANGE, RF, BLIND, CL150 ASME, A350 GR LF2 CL1 FLANGE RF BLIND 6" 150 A350-LF2 APPROVED',                                                                  1::numeric,'Each',    55.33::numeric,     55.33::numeric),
  (11, '8"',      'FLANGE, RF, BLIND, CL150 ASME, A350 GR LF2 CL1 FLANGE RF BLIND 8" 150 A350-LF2',                                                                           2::numeric,'Each',    96.00::numeric,    192.00::numeric),
  (12, '2"',      'FLANGE, RF, BLIND, CL300 ASME, A105N FLANGE RF BLIND 2" 300 A105N APPROVED',                                                                               4::numeric,'Each',    15.93::numeric,     63.72::numeric),
  (13, '4"',      'FLANGE, RF, BLIND, CL600 ASME, A350 GR LF2 CL1 FLANGE RF BLIND 4" 600 A350-LF2 APPROVED',                                                                  2::numeric,'Each',    78.35::numeric,    156.70::numeric),
  (14, '2"',      'FLANGE, RFWN, CL150 ASME, SCH 80 BORE, A350 GR LF2 CL1 FLANGE RFWN 2" 150 XH A350-LF2 APPROVED',                                                          19::numeric,'Each',    14.83::numeric,    281.77::numeric),
  (15, '4"',      'FLANGE, RFWN, CL150 ASME, SCH STD BORE, A350 GR LF2 CL1 FLANGE RFWN 4" 150 STD A350-LF2 APPROVED',                                                         6::numeric,'Each',    30.08::numeric,    180.48::numeric),
  (16, '6"',      'FLANGE, RFWN, CL150 ASME, SCH STD BORE, A350 GR LF2 CL1 FLANGE RFWN 6" 150 STD A350-LF2 APPROVED',                                                        13::numeric,'Each',    62.00::numeric,    806.00::numeric),
  (17, '8"',      'FLANGE, RFWN, CL150 ASME, SCH STD BORE, A350 GR LF2 CL1 FLANGE RFWN 8" 150 STD A350-LF2 APPROVED',                                                         7::numeric,'Each',    92.00::numeric,    644.00::numeric),
  (18, '2"',      'FLANGE, RFWN, CL300 ASME, SCH 80 BORE, A105N FLANGE RFWN 2" 300 XH A105N APPROVED',                                                                        8::numeric,'Each',    16.11::numeric,    128.88::numeric),
  (19, '2"',      'FLANGE, RFWN, CL300 ASME, SCH 80 BORE, A350 GR LF2 CL1 FLANGE RFWN 2" 300 XH A350-LF2 APPROVED',                                                           1::numeric,'Each',    18.13::numeric,     18.13::numeric),
  (20, '6"',      'FLANGE, RFWN, CL300 ASME, SCH STD BORE, A350 GR LF2 CL1 FLANGE RFWN 6" 300 STD A350-LF2 APPROVED',                                                         2::numeric,'Each',    95.33::numeric,    190.66::numeric),
  (21, '8"',      'FLANGE, RFWN, CL300 ASME, SCH STD BORE, A350 GR LF2 CL1 FLANGE RFWN 8" 300 STD A350-LF2 APPROVED',                                                         2::numeric,'Each',   153.33::numeric,    306.66::numeric),
  (22, '4"',      'FLANGE, RFWN, CL600 ASME, SCH 80 BORE, A350 GR LF2 CL1 FLANGE RFWN 4" 600 XH A350-LF2 APPROVED',                                                           6::numeric,'Each',    85.44::numeric,    512.64::numeric),
  (23, '2"',      'GASKET, 3.2mm, CGI, CL150, ASME B16.20, SS 304/GRAPHITE, CS/SS 304 INNER · SW CGI 2" 150# 316L/316L/FG/CS IRID 2.187"',                                   22::numeric,'Each',     2.91::numeric,     64.02::numeric),
  (24, '4"',      'GASKET, 3.2mm, CGI, CL150, ASME B16.20, SS 304/GRAPHITE, CS/SS 304 INNER · SW CGI 4" 150# 316L/316L/FG/CS IRID 4.187"',                                    5::numeric,'Each',     6.35::numeric,     31.75::numeric),
  (25, '6"',      'GASKET, 3.2mm, CGI, CL150, ASME B16.20, SS 304/GRAPHITE, CS/SS 304 INNER · SW CGI 6" 150# 316L/316L/FG/CS IRID 6.187"',                                   11::numeric,'Each',     8.57::numeric,     94.27::numeric),
  (26, '8"',      'GASKET, 3.2mm, CGI, CL150, ASME B16.20, SS 304/GRAPHITE, CS/SS 304 INNER · SW CGI 8" 150# 316L/316L/FG/CS IRID 8.50"',                                     7::numeric,'Each',    10.17::numeric,     71.19::numeric),
  (27, '2"',      'GASKET, 3.2mm, CGI, CL300, ASME B16.20, SS 304/GRAPHITE, CS/SS 304 INNER · SW CGI 2" 3/4/600# 316L/316L/FG/CS IRID 2.187"',                               11::numeric,'Each',     3.39::numeric,     37.29::numeric),
  (28, '6"',      'GASKET, 3.2mm, CGI, CL300, ASME B16.20, SS 304/GRAPHITE, CS/SS 304 INNER · SW CGI 6" 300# 316L/316L/FG/CS IRID 6.187"',                                    2::numeric,'Each',    10.15::numeric,     20.30::numeric),
  (29, '8"',      'GASKET, 3.2mm, CGI, CL300, ASME B16.20, SS 304/GRAPHITE, CS/SS 304 INNER · SW CGI 8" 300# 316L/316L/FG/CS IRID 8.50"',                                     2::numeric,'Each',    11.72::numeric,     23.44::numeric),
  (30, '4"',      'GASKET, 3.2mm, CGI, CL600, ASME B16.20, SS 304/GRAPHITE, CS/SS 304 INNER · SW CGI 4" 600# 316L/316L/FG/CS IRID 4.04"',                                     6::numeric,'Each',     7.57::numeric,     45.42::numeric),
  (31, '2"',      'GLE C-01 PIPE CLAMP [PIP-GLE-0C01 R5] C-01-2, CLAMPED PIPE SHOE (S-02 Shoe Base), 2NPS',                                                                  17::numeric,'Each',   144.16::numeric,   2450.72::numeric),
  (32, '4"',      'GLE C-01 PIPE CLAMP [PIP-GLE-0C01 R3] C-01-4, CLAMPED PIPE SHOE (S-02 Shoe Base), 4NPS',                                                                   9::numeric,'Each',   148.11::numeric,   1332.99::numeric),
  (33, '6"',      'GLE C-01 PIPE CLAMP [PIP-GLE-0C01 R3] C-01-6, CLAMPED PIPE SHOE (S-02 Shoe Base), 6NPS',                                                                  13::numeric,'Each',   166.46::numeric,   2163.98::numeric),
  (34, '8"',      'GLE C-01 PIPE CLAMP [PIP-GLE-0C01 R3] C-01-8, CLAMPED PIPE SHOE (S-02 Shoe Base), 8NPS',                                                                   3::numeric,'Each',   173.23::numeric,    519.69::numeric),
  (35, '2"',      'PIPE, SMLS, SCH 80, A106 GR B BBE PIPE 2" XH (.218) A106B/A333-6/GR359 CAT II NACE CSAZ245.1 SMLS APPROVED',                                          106.54::numeric,'Feet',     9.51::numeric,   1013.15::numeric),
  (36, '2"',      'PIPE, SMLS, SCH 80, A333 GR 6 BBE PIPE 2" XH (.218) A106B/A333-6/GR359 CAT II NACE CSAZ245.1 SMLS DRL APPROVED',                                      311.16::numeric,'Feet',    10.73::numeric,   3338.76::numeric),
  (37, '3"',      'PIPE, SMLS, SCH 80, A333 GR 6 BBE PIPE 3" XH (.300) A106B/A333-6/GR359 CAT II NACE CSAZ245.1 SMLS APPROVED',                                            4.94::numeric,'Feet',    18.48::numeric,     91.37::numeric),
  (38, '4"',      'PIPE, SMLS, SCH 80, A333 GR 6 BBE PIPE 4" XH (.337) A106B/A333-6/GR359 CAT II NACE CSAZ245.1 SMLS APPROVED',                                           99.10::numeric,'Feet',    27.63::numeric,   2738.16::numeric),
  (39, '2"',      'PIPE, SMLS, SCH 80, A333 GR 6 BOE-TOE PIPE 2" XH (.218) A106B/A333-6/GR359 CAT II NACE CSAZ245.1 SMLS APPROVED',                                        0.79::numeric,'Feet',    10.73::numeric,      8.52::numeric),
  (40, '4"',      'PIPE, SMLS, SCH STD, A333 GR 6 BBE PIPE 4" STD (.237) A106B/A333-6/GR359 CAT II NACE CSAZ245.1 SMLS DRL APPROVED',                                     32.59::numeric,'Feet',    19.46::numeric,    634.17::numeric),
  (41, '6"',      'PIPE, SMLS, SCH STD, A333 GR 6 BBE PIPE 6" STD (.280) A106B/A333-6/GR359 CAT II NACE CSAZ245.1 SMLS DRL APPROVED',                                    174.38::numeric,'Feet',    40.24::numeric,   7017.18::numeric),
  (42, '8"',      'PIPE, SMLS, SCH STD, A333 GR 6 BBE PIPE 8" STD (.322) A106B/A333-6/GR359 CAT II NACE CSAZ245.1 SMLS APPROVED',                                         89.25::numeric,'Feet',    54.62::numeric,   4874.76::numeric),
  (43, '8"x6"',   'REDUCER, CONC, BW, SCH STD LE x SCH STD SE, A420 GR WPL6 WELD CONC REDUCER 8" X 6" STD (.322/.280) A420-WPL6',                                             1::numeric,'Each',    53.33::numeric,     53.33::numeric),
  (44, '4"x2"',   'REDUCER, ECC, BW, SCH STD LE x SCH 80 SE, A420 GR WPL6 WELD ECC REDUCER 4" X 2" STD/XH A420-WPL6',                                                         1::numeric,'Each',    26.67::numeric,     26.67::numeric),
  (45, '8"x6"',   'REDUCER, ECC, BW, SCH STD LE x SCH STD SE, A420 GR WPL6 WELD ECC REDUCER 8" X 6" STD A420-WPL6',                                                           1::numeric,'Each',    55.33::numeric,     55.33::numeric),
  (46, '2"',      'SPECTACLE BLIND, RF, CL150 ASME, A516 GR 70N (IMPACT TESTED) FLANGE RF BLIND SPECTACLE 2" 150 A516-70N 1/4" THICK',                                        2::numeric,'Each',    41.56::numeric,     83.12::numeric),
  (47, '4"',      'SPECTACLE BLIND, RF, CL150 ASME, A516 GR 70N (IMPACT TESTED) FLANGE RF BLIND SPECTACLE 4" 150 A516-70N 3/8" THICK',                                        1::numeric,'Each',    70.00::numeric,     70.00::numeric),
  (48, '6"',      'SPECTACLE BLIND, RF, CL150 ASME, A516 GR 70N (IMPACT TESTED) FLANGE RF BLIND SPECTACLE 6" 150 A516-70N 1/2" THICK',                                        1::numeric,'Each',   116.56::numeric,    116.56::numeric),
  (49, '2"',      'SPECTACLE BLIND, RF, CL300 ASME, A516 GR 70N (IMPACT TESTED) FLANGE RF BLIND SPECTACLE 2" 300 A516-70N 3/8" THICK',                                        1::numeric,'Each',    50.63::numeric,     50.63::numeric),
  (50, '4"',      'SPECTACLE BLIND, RF, CL600 ASME, A516 GR 70N (IMPACT TESTED) FLANGE RF BLIND SPECTACLE 4" 600 A516-70N 5/8" THICK',                                        1::numeric,'Each',   115.31::numeric,    115.31::numeric),
  (51, '8"x4"',   'TEE, RED, BW, SCH STD LE x SCH STD SE, A420 GR WPL6 WELD REDUCING TEE 8" X 8" X 4" STD (.322/.237) A420-WPL6',                                             3::numeric,'Each',   146.67::numeric,    440.01::numeric),
  (52, '2"',      'TEE, STR, BW, SCH 80, A234 GR WPB WELD TEE 2" XH (.218) A234-WPB APPROVED',                                                                                2::numeric,'Each',     9.64::numeric,     19.28::numeric),
  (53, '2"',      'TEE, STR, BW, SCH 80, A420 GR WPL6 WELD TEE 2" XH (.218) A420-WPL6 APPROVED',                                                                              6::numeric,'Each',    11.79::numeric,     70.74::numeric),
  (54, '4"',      'TEE, STR, BW, SCH 80, A420 GR WPL6 WELD TEE 4" XH (.337) A420-WPL6 APPROVED',                                                                              2::numeric,'Each',    44.31::numeric,     88.62::numeric),
  (55, '6"',      'TEE, STR, BW, SCH STD, A420 GR WPL6 WELD TEE 6" STD (.280) A420-WPL6 APPROVED',                                                                            4::numeric,'Each',    66.47::numeric,    265.88::numeric),
  (56, '8"',      'TEE, STR, BW, SCH STD, A420 GR WPL6 WELD TEE 8" STD (.322) A420-WPL6 APPROVED',                                                                            1::numeric,'Each',   133.33::numeric,    133.33::numeric),
  (57, '3/4"',    '(12) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM 127 STUD B7M 3/4" X 5"',                                                                                 24::numeric,'Each',     1.71::numeric,     41.04::numeric),
  (58, '3/4"',    '(8) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM 101.6 STUD B7M 3/4" X 4"',                                                                                72::numeric,'Each',     1.52::numeric,    109.44::numeric),
  (59, '3/4"',    '(8) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM 114.3 STUD B7M 3/4" X 4-1/2"',                                                                            56::numeric,'Each',     1.68::numeric,     94.08::numeric),
  (60, '3/4"',    '(8) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM 120.65 STUD B7M 3/4" X 4-3/4"',                                                                            8::numeric,'Each',     1.68::numeric,     13.44::numeric),
  (61, '5/8"',    '(4) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM 82.6 STUD B7M 5/8" X 3-1/4"',                                                                             72::numeric,'Each',     0.92::numeric,     66.24::numeric),
  (62, '5/8"',    '(4) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM 95.25 STUD B7M 5/8" X 3-3/4"',                                                                             8::numeric,'Each',     1.02::numeric,      8.16::numeric),
  (63, '5/8"',    '(8) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM 95.25 STUD B7M 5/8" X 3-3/4"',                                                                            72::numeric,'Each',     1.02::numeric,     73.44::numeric),
  (64, '5/8"',    '(8) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM 95.3 STUD B7M 5/8" X 3-3/4"',                                                                             24::numeric,'Each',     1.02::numeric,     24.48::numeric),
  (65, '5/8"',    '(8) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM 107.95 STUD B7M 5/8" X 4-1/4"',                                                                           16::numeric,'Each',     1.08::numeric,     17.28::numeric),
  (66, '7/8"',    '(12) *CL300* STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM 139.7 STUD B7M 7/8" X 5-1/2"',                                                                   24::numeric,'Each',     2.61::numeric,     62.64::numeric),
  (67, '7/8"',    '(8) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM 152.4 STUD B7M 7/8" X 6"',                                                                                40::numeric,'Each',     2.84::numeric,    113.60::numeric)
) as v(line_number, size, description, quantity, uom, unit_cost, amount);

commit;

-- =============================================================================
-- Verify — run after commit.
-- =============================================================================
--   select p.po_number, p.ewp, count(l.*) as lines,
--          sum(l.amount)::numeric(14,2) as sum_of_lines,
--          p.total_amount as po_total,
--          (sum(l.amount) - p.total_amount)::numeric(14,2) as diff
--   from public.apex_pos p
--   left join public.apex_line_items l on l.apex_po_id = p.id
--   where p.po_number = 'PUR-6540-2001335'
--   group by p.po_number, p.ewp, p.total_amount;
--
-- Expected: 2001335 · EWP #20 · 67 lines · $34,426.93 · diff 0.00
--
-- Grand total across all 12 Apex POs:
--   $96,900.68 (7 original) + $1,965,221.47 (4-PO addendum) + $34,426.93 (this)
--   = $2,096,549.08

-- =============================================================================
-- 2026-08-14 — Apex PVF supplementary seed · 4 additional POs
-- =============================================================================
-- Adds four Apex Distribution POs that landed after the original 7-PO seed
-- (2026-08-14_seed_apex_pos_and_lines.sql) had already been loaded.
--
-- These are additive INSERTs only — the seven POs already in the database
-- (PUR-6540-2001314 through 2001322) are untouched.
--
--   PUR-6540-2001331 · EWP #18 · KBZ Area Off Skid Piping     · 75 lines · $   818,154.69
--   PUR-6540-2001332 · EWP #13 · Battery Area Off Skid Piping · 78 lines · $    72,073.59
--   PUR-6540-2001333 · EWP #18 · KBZ Area Off Skid Piping     · 75 lines · $   158,498.77
--   PUR-6540-2001334 · EWP #18 · KBZ Area Off Skid Piping     · 73 lines · $   916,494.42
--                                                        Total 301 lines · $ 1,965,221.47
--
-- Order date on all four: 2026-07-30. Requester: Jade Rowe. Supplier: Apex.
-- All materials ship to Aitken Creek site. Lead time is PO-level (5 or 3 weeks ARO).
--
-- Not idempotent by itself — apex_pos.po_number has a UNIQUE constraint, so a
-- second run will fail on the first INSERT with a duplicate-key error, which
-- is the desired behaviour (won't silently double-insert lines).
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- POs
-- -----------------------------------------------------------------------------
insert into public.apex_pos
  (po_number, ewp, gle_package, description, requester, supplier, order_date, total_amount, currency, notes)
values
  ('PUR-6540-2001331', 'EWP #18', '24198-4001-08', 'KBZ Area Off Skid Piping',    'Jade Rowe', 'Apex Distribution', '2026-07-30',  818154.69, 'CAD', 'Req-6540-1001341 · quote 070826-RW-ENBRIDGE dated 2026-07-04 · lead time 5 weeks ARO'),
  ('PUR-6540-2001332', 'EWP #13', '24198-4001-09', 'Battery Area Off Skid Piping','Jade Rowe', 'Apex Distribution', '2026-07-30',   72073.59, 'CAD', 'Req-6540-1001340 · quote 070826-RW-ENBRIDGE dated 2026-07-14 · lead time 3 weeks ARO'),
  ('PUR-6540-2001333', 'EWP #18', '24198-4001-08', 'KBZ Area Off Skid Piping',    'Jade Rowe', 'Apex Distribution', '2026-07-30',  158498.77, 'CAD', 'Req-6540-1001339 · quote 070826-RW-ENBRIDGE dated 2026-07-14 · lead time 3 weeks ARO'),
  ('PUR-6540-2001334', 'EWP #18', '24198-4001-08', 'KBZ Area Off Skid Piping',    'Jade Rowe', 'Apex Distribution', '2026-07-30',  916494.42, 'CAD', 'Req-6540-1001337 · quote 070826-RW-ENBRIDGE dated 2026-07-14 · lead time 5 weeks ARO');

-- -----------------------------------------------------------------------------
-- PUR-6540-2001331 · 75 lines · $818,154.69
-- -----------------------------------------------------------------------------
insert into public.apex_line_items (apex_po_id, line_number, size, description, quantity, uom, unit_cost, amount, lead_time)
select (select id from public.apex_pos where po_number = 'PUR-6540-2001331'),
       v.line_number, v.size, v.description, v.quantity, v.uom, v.unit_cost, v.amount, '5 WEEKS ARO'
from (values
  ( 1, '14"',    'FLANGE, RTJWN, CL1500 ASME, SCH 120 BORE, A350 GR LF2 CL1',                                                     3::numeric,      'Each',    2866.67::numeric,     8600.01::numeric),
  ( 2, '4"',     'FLANGE, RTJWN, CL1500 ASME, SCH 120 BORE, A350 GR LF2 CL1',                                                     3::numeric,      'Each',     193.33::numeric,      579.99::numeric),
  ( 3, '4"',     'FLANGE RTJWN 4" 1500 SCH 160 (.531) A350-LF2 APPROVED',                                                         6::numeric,      'Each',     190.21::numeric,     1141.26::numeric),
  ( 4, '10"',    'GASKET, 3.2mm, CGI, CL150, ASME B16.20, SS 304/GRAPHITE, CS/SS 304 INNER · SW CGI 10" 150# 316L/316L/FG/CS IRID 10.56"',   7::numeric, 'Each',      13.73::numeric,       96.11::numeric),
  ( 5, '12"',    'GASKET, 3.2mm, CGI, CL150, ASME B16.20, SS 304/GRAPHITE, CS/SS 304 INNER · SW CGI 12" 150# 316L/316L/FG/CS IRID 12.50"',  13::numeric, 'Each',      18.57::numeric,      241.41::numeric),
  ( 6, '16"',    'GASKET, 3.2mm, CGI, CL150, ASME B16.20, SS 304/GRAPHITE, CS/SS 304 INNER · SW CGI 16" 150# 316L/316L/FG/CS IRID 15.75"',   1::numeric, 'Each',      27.49::numeric,       27.49::numeric),
  ( 7, '2"',     'GASKET, 3.2mm, CGI, CL150, ASME B16.20, SS 304/GRAPHITE, CS/SS 304 INNER · SW CGI 2" 150# 316L/316L/FG/CS IRID 2.187"',  196::numeric, 'Each',       2.91::numeric,      570.36::numeric),
  ( 8, '3"',     'GASKET, 3.2mm, CGI, CL150, ASME B16.20, SS 304/GRAPHITE, CS/SS 304 INNER · SW CGI 3" 150# 316L/316L/FG/CS IRID 3.187"',   75::numeric, 'Each',       5.23::numeric,      392.25::numeric),
  ( 9, '4"',     'GASKET, 3.2mm, CGI, CL150, ASME B16.20, SS 304/GRAPHITE, CS/SS 304 INNER · SW CGI 4" 150# 316L/316L/FG/CS IRID 4.187"',   24::numeric, 'Each',       6.35::numeric,      152.40::numeric),
  (10, '6"',     'GASKET, 3.2mm, CGI, CL150, ASME B16.20, SS 304/GRAPHITE, CS/SS 304 INNER · SW CGI 6" 150# 316L/316L/FG/CS IRID 6.187"',   30::numeric, 'Each',       8.57::numeric,      257.10::numeric),
  (11, '8"',     'GASKET, 3.2mm, CGI, CL150, ASME B16.20, SS 304/GRAPHITE, CS/SS 304 INNER · SW CGI 8" 150# 316L/316L/FG/CS IRID 8.50"',     6::numeric, 'Each',      10.17::numeric,       61.02::numeric),
  (12, '2"',     'GASKET, 3.2mm, CGI, CL300, ASME B16.20, SS 304/GRAPHITE, CS/SS 304 INNER · SW CGI 2" 3/4/600# 316L/316L/FG/CS IRID 2.187"', 30::numeric,'Each',       3.39::numeric,      101.70::numeric),
  (13, '1"',     'GASKET, 3.2mm, CGI, CL600, ASME B16.20, SS 304/GRAPHITE, CS/SS 304 INNER · SW CGI 1" 3/4/600# 316L/316L/FG/CS IRID 1.062"',  4::numeric,'Each',       1.37::numeric,        5.48::numeric),
  (14, '14"',    'GASKET, 3.2mm, CGI, CL600, ASME B16.20, SS 304/GRAPHITE, CS/SS 304 INNER · SW CGI 14" 600# 316L/316L/FG/CS IRID 13.500"',  12::numeric,'Each',      30.11::numeric,      361.32::numeric),
  (15, '16"',    'GASKET, 3.2mm, CGI, CL600, ASME B16.20, SS 304/GRAPHITE, CS/SS 304 INNER · SW CGI 16" 600# 316L/316L/FG/CS IRID 15.35"',   12::numeric,'Each',      34.68::numeric,      416.16::numeric),
  (16, '18"',    'GASKET, 3.2mm, CGI, CL600, ASME B16.20, SS 304/GRAPHITE, CS/SS 304 INNER · SW CGI 18" 600# 316L/316L/FG/CS IRID 17.25"',   17::numeric,'Each',      44.24::numeric,      752.08::numeric),
  (17, '2"',     'GASKET, 3.2mm, CGI, CL600, ASME B16.20, SS 304/GRAPHITE, CS/SS 304 INNER · SW CGI 2" 3/4/600# 316L/316L/FG/CS IRID 2.187"',41::numeric,'Each',       3.39::numeric,      138.99::numeric),
  (18, '20"',    'GASKET, 3.2mm, CGI, CL600, ASME B16.20, SS 304/GRAPHITE, CS/SS 304 INNER · SW CGI 20" 600# 316L/316L/FG/CS IRID 19.25"',    1::numeric,'Each',      48.96::numeric,       48.96::numeric),
  (19, '24"',    'GASKET, 3.2mm, CGI, CL600, ASME B16.20, SS 304/GRAPHITE, CS/SS 304 INNER · SW CGI 24" 600# 316L/316L/FG/CS IRID 23.25"',   23::numeric,'Each',      69.76::numeric,     1604.48::numeric),
  (20, '3"',     'GASKET, 3.2mm, CGI, CL600, ASME B16.20, SS 304/GRAPHITE, CS/SS 304 INNER · SW CGI 3" 3/4/600# 316L/316L/FG/CS IRID 3.19"',  4::numeric,'Each',       5.09::numeric,       20.36::numeric),
  (21, '4"',     'GASKET, 3.2mm, CGI, CL600, ASME B16.20, SS 304/GRAPHITE, CS/SS 304 INNER · SW CGI 4" 600# 316L/316L/FG/CS IRID 4.04"',      2::numeric,'Each',       7.57::numeric,       15.14::numeric),
  (22, '6"',     'GASKET, 3.2mm, CGI, CL600, ASME B16.20, SS 304/GRAPHITE, CS/SS 304 INNER · SW CGI 6" 600# 316L/316L/FG/CS IRID 6.10"',      4::numeric,'Each',      10.51::numeric,       42.04::numeric),
  (23, '1"',     'GASKET, 3.2mm, CGI, CL900, ASME B16.20, SS 304/GRAPHITE, CS/SS 304 INNER · SW CGI 1" 9/1500# 316L/316L/FG/CS IRID 1.062"',  2::numeric,'Each',       1.53::numeric,        3.06::numeric),
  (24, '12"',    'GASKET, 3.2mm, CGI, CL900, ASME B16.20, SS 304/GRAPHITE, CS/SS 304 INNER · SW CGI 12" 900# 316L/316L/FG/CS IRID 11.50"',   18::numeric,'Each',      33.43::numeric,      601.74::numeric),
  (25, '14"',    'GASKET, 3.2mm, CGI, CL900, ASME B16.20, SS 304/GRAPHITE, CS/SS 304 INNER CGI 304L/304L/FG/CS 14 900 B16.20 12.63x14x15.75x20.5x0.175',    9::numeric,'Each',      85.73::numeric,      771.57::numeric),
  (26, '16"',    'GASKET, 3.2mm, CGI, CL900, ASME B16.20, SS 304/GRAPHITE, CS/SS 304 INNER CGI 304L/304L/FG/CS 16 900 B16.20 14.75x16.25x18x22.63x0.175',  12::numeric,'Each',     152.31::numeric,     1827.72::numeric),
  (27, '2"',     'GASKET, 3.2mm, CGI, CL900, ASME B16.20, SS 304/GRAPHITE, CS/SS 304 INNER · SW CGI 2" 9/1500# 316L/316L/FG/CS IRID 2.06"',  30::numeric,'Each',       4.41::numeric,      132.30::numeric),
  (28, '24"',    'GASKET, 3.2mm, CGI, CL900, ASME B16.20, SS 304/GRAPHITE, CS/SS 304 INNER CGI 304L/304L/FG/CS 24 900 B16.20 23.25x24.75x26.75x33x0.175', 12::numeric,'Each',     104.12::numeric,     1249.44::numeric),
  (29, '4"',     'GASKET, 3.2mm, CGI, CL900, ASME B16.20, SS 304/GRAPHITE, CS/SS 304 INNER · SW CGI 4" 900# 316L/316L/FG/CS IRID 4.04"',     4::numeric, 'Each',       7.03::numeric,       28.12::numeric),
  (30, '4"',     'GASKET, RTJ, CL1500, RING R39, OVAL, SOFT IRON R39 GASKET RING JOINT R-39 316SS OVAL',                                    12::numeric, 'Each',      20.68::numeric,      248.16::numeric),
  (31, '10"',    'GASKET, RTJ, CL1500, RING R54, OVAL, SOFT IRON R54 RTJ OVAL R-54-D SOFT IRON ASME B16-20-2023 / API 6A-21E',              33::numeric, 'Each',      67.60::numeric,     2230.80::numeric),
  (32, '12"',    'GASKET, RTJ, CL1500, RING R58, OVAL, SOFT IRON R58 RTJ OVAL R-58-D SOFT IRON ASME B16-20-2023 / API 6A-21E',               6::numeric, 'Each',     108.57::numeric,      651.42::numeric),
  (33, '14"',    'GASKET, RTJ, CL1500, RING R63, OVAL, SOFT IRON R63 RTJ OVAL R-63 SOFT IRON ASME B16-20-2023 / API 6A-21E',                 3::numeric, 'Each',    3961.91::numeric,    11885.73::numeric),
  (34, '2"',     'PIPE, SMLS, SCH 80, A106 GR B BBE PIPE 2" XH (.218) A106B/A333-6/GR359 CAT II NACE CSAZ245.1 SMLS APPROVED',            147.64::numeric,'Feet',       9.51::numeric,     1404.07::numeric),
  (35, '2"',     'PIPE, SMLS, SCH 80, A333 GR 6 BBE PIPE 2" XH (.218) A106B/A333-6/GR359 CAT II NACE CSAZ245.1 SMLS DRL APPROVED',      1916.84::numeric,'Feet',      10.73::numeric,    20567.73::numeric),
  (36, '3"',     'PIPE, SMLS, SCH STD, A333 GR 6 BBE PIPE 3" STD (.216) A106B/A333-6/GR359 CAT II NACE CSAZ245.1 SMLS DRL APPROVED',      332.17::numeric,'Feet',      12.80::numeric,     4251.72::numeric),
  (37, '3"',     'PIPE, SMLS, SCH STD, A106 GR B BBE PIPE 3" STD (.216) A106B/A333-6/GR359 CAT II NACE CSAZ245.1 SMLS APPROVED',            6.78::numeric,'Feet',      13.66::numeric,       92.68::numeric),
  (38, '3"',     'PIPE, SMLS, SCH 80, A333 GR 6 BBE PIPE 3" XH (.300) A106B/A333-6/GR359 CAT II NACE CSAZ245.1 SMLS APPROVED',             83.94::numeric,'Feet',      18.48::numeric,     1551.28::numeric),
  (39, '3"',     'PIPE, SMLS, SCH 160, A333 GR 6 BBE PIPE 3" SCH 160 (.438) A333-6 SMLS CSA',                                                3.79::numeric,'Feet',      26.22::numeric,       99.36::numeric),
  (40, '4"',     'PIPE, SMLS, SCH STD, A106 GR B BBE PIPE 4" STD (.237) A106B/A333-6/GR359 CAT II NACE CSAZ245.1 SMLS APPROVED',           51.79::numeric,'Feet',      19.46::numeric,     1007.80::numeric),
  (41, '4"',     'PIPE, SMLS, SCH STD, A333 GR 6 BBE PIPE 4" STD (.237) A106B/A333-6/GR359 CAT II NACE CSAZ245.1 SMLS DRL APPROVED',      200.44::numeric,'Feet',      19.46::numeric,     3900.56::numeric),
  (42, '4"',     'PIPE, SMLS, SCH 120, A333 GR 6 BBE PIPE 4" SCH 120 (.438) A333-6 SMLS CSA',                                              59.48::numeric,'Feet',      41.22::numeric,     2451.56::numeric),
  (43, '4"',     'PIPE, SMLS, SCH 160, A333 GR 6 BBE PIPE 4" SCH 160 (.531) A333-6 SMLS CSA',                                              88.53::numeric,'Feet',      46.34::numeric,     4102.34::numeric),
  (44, '6"',     'PIPE, SMLS, SCH STD, A333 GR 6 BBE PIPE 6" STD (.280) A106B/A333-6/GR359 CAT II NACE CSAZ245.1 SMLS DRL APPROVED',      195.03::numeric,'Feet',      40.24::numeric,     7847.86::numeric),
  (45, '6"',     'PIPE, SMLS, SCH 80, A333 GR 6 BBE PIPE 6" XH (.432) A106B/A333-6/GR359 CAT II NACE CSAZ245.1 SMLS DRL APPROVED',         68.61::numeric,'Feet',      49.57::numeric,     3400.78::numeric),
  (46, '8"',     'PIPE, SMLS, SCH STD, A333 GR 6 BBE PIPE 8" STD (.322) A106B/A333-6/GR359 CAT II NACE CSAZ245.1 SMLS APPROVED',           21.36::numeric,'Feet',      54.62::numeric,     1166.95::numeric),
  (47, '10"',    'PIPE, SMLS, SCH STD, A333 GR 6 BBE PIPE 10" STD (.365) A106B/A333-6/GR359 CAT II NACE CSAZ245.1 SMLS DRL APPROVED',     111.05::numeric,'Feet',      91.46::numeric,    10156.32::numeric),
  (48, '10"',    'PIPE, SMLS, SCH 120, A333 GR 6 BBE',                                                                                    132.12::numeric,'Feet',     201.22::numeric,    26585.73::numeric),
  (49, '12"',    'PIPE, SMLS, SCH STD, A333 GR 6 BBE PIPE 12" STD (.375) A106B/A333-6/GR359 CAT II NACE CSAZ245.1 SMLS APPROVED',          68.97::numeric,'Feet',      88.73::numeric,     6119.40::numeric),
  (50, '12"',    'PIPE, SMLS, SCH 80, A333 GR 6 BBE PIPE 12" SCH 80 (.688) A106B/A333-6/GR359 CAT II NACE CSAZ245.1 SMLS APPROVED',         7.18::numeric,'Feet',     151.17::numeric,     1085.67::numeric),
  (51, '12"',    'PIPE, SMLS, SCH 120, A333 GR 6 BBE PIPE 12" XXH/SCH 120 (1.000) A333-6 SMLS',                                           161.43::numeric,'Feet',     335.37::numeric,    54137.83::numeric),
  (52, '14"',    'PIPE, SMLS, SCH 80, A333 GR 6 BBE PIPE 14" SCH 80 (.750) A333-6 SMLS',                                                   86.36::numeric,'Feet',     262.26::numeric,    22649.18::numeric),
  (53, '14"',    'PIPE, SMLS, SCH 120, A333 GR 6 BBE',                                                                                     54.28::numeric,'Feet',     396.34::numeric,    21512.63::numeric),
  (54, '16"',    'PIPE, SMLS, SCH STD, A333 GR 6 BBE PIPE 16" STD/SCH 30 (.375) A53B/A106B/A333-6 NACE CSA Z245.1 GR359 CAT III SMLS APPROVED', 20.39::numeric,'Feet',     135.17::numeric,     2756.17::numeric),
  (55, '16"',    'PIPE, SMLS, SCH 80, A333 GR 6 BBE PIPE 16" SCH 80 (.844) A53B/A106B/A333-6 NACE CSA Z245.1 GR359 CAT III SMLS APPROVED', 75.10::numeric,'Feet',     352.26::numeric,    26455.33::numeric),
  (56, '16"',    'PIPE, SMLS, SCH 120, A333 GR 6 BBE PIPE 16" SCH 120 (1.219) A333-6 SMLS APPROVED',                                      191.09::numeric,'Feet',     494.32::numeric,    94460.85::numeric),
  (57, '18"',    'PIPE, SMLS, SCH 80, A333 GR 6 BBE PIPE 18" SCH 80 (.938) A333-6 SMLS',                                                  208.27::numeric,'Feet',     488.64::numeric,   101769.54::numeric),
  (58, '20"',    'PIPE, SMLS, SCH 80, A333 GR 6 BBE PIPE 20" SCH 80 (1.031) A53B/A106B/A333-6 NACE SMLS DRL APPROVED',                      8.59::numeric,'Feet',     646.65::numeric,     5554.23::numeric),
  (59, '24"',    'PIPE, SMLS, SCH 80, A333 GR 6 BBE PIPE 24" SCH 80 (1.219) A53B/A106B/A333-6 NACE SMLS DRL APPROVED',                    238.62::numeric,'Feet',     863.64::numeric,   206083.55::numeric),
  (60, '24"',    'PIPE, SMLS, SCH 100, A333 GR 6 BBE',                                                                                     48.72::numeric,'Feet',    1158.05::numeric,    56420.74::numeric),
  (61, '12"x10"','REDUCER, CONC, BW, SCH 120 LE x SCH 120 SE, A420 GR WPL6',                                                                 6::numeric, 'Each',     633.33::numeric,     3799.98::numeric),
  (62, '14"x12"','REDUCER, CONC, BW, SCH 120 LE x SCH 120 SE, A420 GR WPL6 (rev A)',                                                         2::numeric, 'Each',    2195.12::numeric,     4390.24::numeric),
  (63, '14"x12"','REDUCER, CONC, BW, SCH 120 LE x SCH 120 SE, A420 GR WPL6 (rev B)',                                                         4::numeric, 'Each',    3654.88::numeric,    14619.52::numeric),
  (64, '24"x18"','REDUCER, CONC, BW, SCH 80 LE x SCH 80 SE, A420 GR WPL6',                                                                   4::numeric, 'Each',    4573.17::numeric,    18292.68::numeric),
  (65, '3"x2"',  'REDUCER, CONC, BW, SCH 80 LE x SCH 80 SE, A420 GR WPL6 WELD CONC REDUCER 3" X 2" XH (.300/.218) A420-WPL6 APPROVED',       1::numeric, 'Each',      13.33::numeric,       13.33::numeric),
  (66, '3"x2"',  'REDUCER, CONC, BW, SCH STD LE x SCH 80 SE, A420 GR WPL6 WELD CONC REDUCER 3" X 2" STD/XH (.216/.218) A420-WPL6 APPROVED',  6::numeric, 'Each',       5.92::numeric,       35.52::numeric),
  (67, '8"x6"',  'REDUCER, CONC, BW, SCH STD LE x SCH STD SE, A420 GR WPL6 WELD CONC REDUCER 8" X 6" STD (.322/.280) A420-WPL6',             6::numeric, 'Each',      53.33::numeric,      319.98::numeric),
  (68, '14"x10"','REDUCER, ECC, BW, SCH 120 LE x SCH 120 SE, A420 GR WPL6 (rev A)',                                                          4::numeric, 'Each',    2100.00::numeric,     8400.00::numeric),
  (69, '14"x10"','REDUCER, ECC, BW, SCH 120 LE x SCH 120 SE, A420 GR WPL6 (rev B)',                                                          2::numeric, 'Each',    4169.33::numeric,     8338.66::numeric),
  (70, '20"x16"','REDUCER, ECC, BW, SCH 80 LE x SCH 80 SE, A420 GR WPL6 WELD ECC REDUCER 20" X 16" SCH 80 A420-WPL6',                        1::numeric, 'Each',    3333.33::numeric,     3333.33::numeric),
  (71, '24"x18"','REDUCER, ECC, BW, SCH 80 LE x SCH 80 SE, A420 GR WPL6',                                                                    2::numeric, 'Each',    5133.33::numeric,    10266.66::numeric),
  (72, '6"x4"',  'REDUCER, ECC, BW, SCH 80 LE x SCH 80 SE, A420 GR WPL6 WELD ECC REDUCER 6" X 4" XH A420-WPL6',                              1::numeric, 'Each',      48.00::numeric,       48.00::numeric),
  (73, '4"x2"',  'REDUCER, ECC, BW, SCH STD LE x SCH 80 SE, A420 GR WPL6 WELD ECC REDUCER 4" X 2" STD/XH A420-WPL6',                         3::numeric, 'Each',      26.67::numeric,       80.01::numeric),
  (74, '16"',    'SPACER PADDLE W/ BLIND PADDLE, RF, CL600 ASME, A516 GR 70N (IMPACT TESTED) 16" 600 RF Blind & Spacer Set',                 1::numeric, 'Each',    2368.75::numeric,     2368.75::numeric),
  (75, '24"',    'SPACER PADDLE W/ BLIND PADDLE, RF, CL600 ASME, A516 GR 70N (IMPACT TESTED) 24" 600 RF Blind & Spacer Set',                 4::numeric, 'Each',    5250.00::numeric,    21000.00::numeric)
) as v(line_number, size, description, quantity, uom, unit_cost, amount);

-- -----------------------------------------------------------------------------
-- PUR-6540-2001332 · 78 lines · $72,073.59
-- -----------------------------------------------------------------------------
insert into public.apex_line_items (apex_po_id, line_number, size, description, quantity, uom, unit_cost, amount, lead_time)
select (select id from public.apex_pos where po_number = 'PUR-6540-2001332'),
       v.line_number, v.size, v.description, v.quantity, v.uom, v.unit_cost, v.amount, '3 WEEKS ARO'
from (values
  ( 1, '2"',   'CAP, BW, SCH 80, A420 GR WPL6 WELD CAP 2" XH A420-WPL6',                                                     5::numeric, 'Each',   5.47::numeric,   27.35::numeric),
  ( 2, '4"',   'CAP, BW, SCH STD, A420 GR WPL6 WELD CAP 4" STD A420-WPL6',                                                   1::numeric, 'Each',  13.33::numeric,   13.33::numeric),
  ( 3, '2"',   'ELBOW, 45 DEG, BW, LR, SCH 80, A420 GR WPL6 WELD ELBOW 2" XH (.218) LR 45 A420-WPL6 APPROVED',               5::numeric, 'Each',   3.51::numeric,   17.55::numeric),
  ( 4, '10"',  'ELBOW, 45 DEG, BW, LR, SCH STD, A420 GR WPL6 WELD ELBOW 10" STD (.365) LR 45 A420-WPL6',                     2::numeric, 'Each', 206.67::numeric,  413.34::numeric),
  ( 5, '3"',   'ELBOW, 45 DEG, BW, LR, SCH STD, A420 GR WPL6 WELD ELBOW 3" STD (.216) LR 45 A420-WPL6 APPROVED',             1::numeric, 'Each',   6.67::numeric,    6.67::numeric),
  ( 6, '4"',   'ELBOW, 45 DEG, BW, LR, SCH STD, A420 GR WPL6 WELD ELBOW 4" STD (.237) LR 45 A420-WPL6 APPROVED',             5::numeric, 'Each',  11.05::numeric,   55.25::numeric),
  ( 7, '6"',   'ELBOW, 45 DEG, BW, LR, SCH STD, A420 GR WPL6 WELD ELBOW 6" STD (.280) LR 45 A420-WPL6 APPROVED',             4::numeric, 'Each',  46.67::numeric,  186.68::numeric),
  ( 8, '2"',   'ELBOW, 90 DEG, BW, LR, SCH 80, A420 GR WPL6 WELD ELBOW 2" XH (.218) LR 90 A420-WPL6 APPROVED',             138::numeric, 'Each',   5.69::numeric,  785.22::numeric),
  ( 9, '4"',   'ELBOW, 90 DEG, BW, LR, SCH 80, A420 GR WPL6 WELD ELBOW 4" XH (.337) LR 90 A420-WPL6 APPROVED',               5::numeric, 'Each',  28.15::numeric,  140.75::numeric),
  (10, '10"',  'ELBOW, 90 DEG, BW, LR, SCH STD, A420 GR WPL6 WELD ELBOW 10" STD (.365) LR 90 A420-WPL6 APPROVED',            6::numeric, 'Each', 196.00::numeric, 1176.00::numeric),
  (11, '3"',   'ELBOW, 90 DEG, BW, LR, SCH STD, A420 GR WPL6 WELD ELBOW 3" STD (.216) LR 90 A420-WPL6 APPROVED',            38::numeric, 'Each',  14.67::numeric,  557.46::numeric),
  (12, '4"',   'ELBOW, 90 DEG, BW, LR, SCH STD, A420 GR WPL6 WELD ELBOW 4" STD (.237) LR 90 A420-WPL6 APPROVED',            72::numeric, 'Each',  19.43::numeric, 1398.96::numeric),
  (13, '6"',   'ELBOW, 90 DEG, BW, LR, SCH STD, A420 GR WPL6 WELD ELBOW 6" STD (.280) LR 90 A420-WPL6 APPROVED',             8::numeric, 'Each',  50.33::numeric,  402.64::numeric),
  (14, '10"',  'FLANGE, RF, BLIND, CL150 ASME, A350 GR LF2 CL1 FLANGE RF BLIND 10" 150 A350-LF2',                            1::numeric, 'Each', 146.67::numeric,  146.67::numeric),
  (15, '2"',   'FLANGE, RF, BLIND, CL150 ASME, A350 GR LF2 CL1 FLANGE RF BLIND 2" 150 A350-LF2 APPROVED',                   17::numeric, 'Each',  12.01::numeric,  204.17::numeric),
  (16, '3"',   'FLANGE, RF, BLIND, CL150 ASME, A350 GR LF2 CL1 FLANGE RF BLIND 3" 150 A350-LF2 APPROVED',                    2::numeric, 'Each',  19.59::numeric,   39.18::numeric),
  (17, '4"',   'FLANGE, RF, BLIND, CL150 ASME, A350 GR LF2 CL1 FLANGE RF BLIND 4" 150 A350-LF2 APPROVED',                   11::numeric, 'Each',  35.33::numeric,  388.63::numeric),
  (18, '6"',   'FLANGE, RF, BLIND, CL150 ASME, A350 GR LF2 CL1 FLANGE RF BLIND 6" 150 A350-LF2 APPROVED',                    1::numeric, 'Each',  55.33::numeric,   55.33::numeric),
  (19, '2"',   'FLANGE, RF, BLIND, CL150 ASME, A350 GR LF2 CL1, 27mm THRD HOLE (for NPS 3/4" NIPPLE) FLANGE RF BLIND 2" 150 A350-LF2 3/4" NPT TAP', 1::numeric, 'Each', 53.33::numeric, 53.33::numeric),
  (20, '4"',   'FLANGE, RF, BLIND, CL600 ASME, A350 GR LF2 CL1 FLANGE RF BLIND 4" 600 A350-LF2 APPROVED',                    1::numeric, 'Each',  78.35::numeric,   78.35::numeric),
  (21, '2"',   'FLANGE, RFWN, CL150 ASME, SCH 80 BORE, A350 GR LF2 CL1 FLANGE RFWN 2" 150 XH A350-LF2 APPROVED',           141::numeric, 'Each',  14.83::numeric, 2091.03::numeric),
  (22, '10"',  'FLANGE, RFWN, CL150 ASME, SCH STD BORE, A350 GR LF2 CL1 FLANGE RFWN 10" 150 STD A350-LF2 APPROVED',         10::numeric, 'Each', 140.00::numeric, 1400.00::numeric),
  (23, '3"',   'FLANGE, RFWN, CL150 ASME, SCH STD BORE, A350 GR LF2 CL1 FLANGE RFWN 3" 150 STD A350-LF2 APPROVED',          45::numeric, 'Each',  22.09::numeric,  994.05::numeric),
  (24, '4"',   'FLANGE, RFWN, CL150 ASME, SCH STD BORE, A350 GR LF2 CL1 FLANGE RFWN 4" 150 STD A350-LF2 APPROVED',          81::numeric, 'Each',  30.08::numeric, 2436.48::numeric),
  (25, '6"',   'FLANGE, RFWN, CL150 ASME, SCH STD BORE, A350 GR LF2 CL1 FLANGE RFWN 6" 150 STD A350-LF2 APPROVED',          11::numeric, 'Each',  62.00::numeric,  682.00::numeric),
  (26, '2"',   'FLANGE, RFWN, CL600 ASME, SCH 80 BORE, A350 GR LF2 CL1 FLANGE RFWN 2" 600 XH A350-LF2 APPROVED',             8::numeric, 'Each',  24.09::numeric,  192.72::numeric),
  (27, '4"',   'FLANGE, RFWN, CL600 ASME, SCH 80 BORE, A350 GR LF2 CL1 FLANGE RFWN 4" 600 XH A350-LF2 APPROVED',             7::numeric, 'Each',  85.44::numeric,  598.08::numeric),
  (28, '6"',   'FLANGE, RFWN, CL600 ASME, SCH 80 BORE, A350 GR LF2 CL1 FLANGE RFWN 6" 600 XH A350-LF2 APPROVED',             1::numeric, 'Each', 206.67::numeric,  206.67::numeric),
  (29, '10"',  'GASKET, 3.2mm, CGI, CL150, ASME B16.20, SS 304/GRAPHITE, CS/SS 304 INNER · SW CGI 10" 150# 316L/316L/FG/CS IRID 10.56"',   7::numeric, 'Each', 13.73::numeric,  96.11::numeric),
  (30, '2"',   'GASKET, 3.2mm, CGI, CL150, ASME B16.20, SS 304/GRAPHITE, CS/SS 304 INNER · SW CGI 2" 150# 316L/316L/FG/CS IRID 2.187"',  167::numeric, 'Each',  2.91::numeric, 485.97::numeric),
  (31, '3"',   'GASKET, 3.2mm, CGI, CL150, ASME B16.20, SS 304/GRAPHITE, CS/SS 304 INNER · SW CGI 3" 150# 316L/316L/FG/CS IRID 3.187"',   52::numeric, 'Each',  5.23::numeric, 271.96::numeric),
  (32, '4"',   'GASKET, 3.2mm, CGI, CL150, ASME B16.20, SS 304/GRAPHITE, CS/SS 304 INNER · SW CGI 4" 150# 316L/316L/FG/CS IRID 4.187"',  158::numeric, 'Each',  6.35::numeric,1003.30::numeric),
  (33, '6"',   'GASKET, 3.2mm, CGI, CL150, ASME B16.20, SS 304/GRAPHITE, CS/SS 304 INNER · SW CGI 6" 150# 316L/316L/FG/CS IRID 6.187"',   24::numeric, 'Each',  8.57::numeric, 205.68::numeric),
  (34, '8"',   'GASKET, 3.2mm, CGI, CL150, ASME B16.20, SS 304/GRAPHITE, CS/SS 304 INNER · SW CGI 8" 150# 316L/316L/FG/CS IRID 8.50"',    10::numeric, 'Each', 10.17::numeric, 101.70::numeric),
  (35, '2"',   'GASKET, 3.2mm, CGI, CL600, ASME B16.20, SS 304/GRAPHITE, CS/SS 304 INNER · SW CGI 2" 3/4/600# 316L/316L/FG/CS IRID 2.187"', 6::numeric,'Each',  3.39::numeric,  20.34::numeric),
  (36, '4"',   'GASKET, 3.2mm, CGI, CL600, ASME B16.20, SS 304/GRAPHITE, CS/SS 304 INNER · SW CGI 4" 600# 316L/316L/FG/CS IRID 4.04"',     7::numeric,'Each',  7.57::numeric,  52.99::numeric),
  (37, '6"',   'GASKET, 3.2mm, CGI, CL600, ASME B16.20, SS 304/GRAPHITE, CS/SS 304 INNER · SW CGI 6" 600# 316L/316L/FG/CS IRID 6.10"',     1::numeric,'Each', 10.51::numeric,  10.51::numeric),
  (38, '2"',   'PIPE, SMLS, SCH 80, A333 GR 6 BBE PIPE 2" XH (.218) A106B/A333-6/GR359 CAT II NACE CSAZ245.1 SMLS DRL APPROVED',      1204.95::numeric,'Feet', 10.73::numeric,12929.09::numeric),
  (39, '3"',   'PIPE, SMLS, SCH STD, A333 GR 6 BBE PIPE 3" STD (.216) A106B/A333-6/GR359 CAT II NACE CSAZ245.1 SMLS DRL APPROVED',      187.92::numeric,'Feet', 12.80::numeric, 2405.33::numeric),
  (40, '4"',   'PIPE, SMLS, SCH STD, A333 GR 6 BBE',                                                                                    580.57::numeric,'Feet', 19.46::numeric,11297.85::numeric),
  (41, '4"',   'PIPE, SMLS, SCH 80, A333 GR 6 BBE PIPE 4" XH (.337) A106B/A333-6/GR359 CAT II NACE CSAZ245.1 SMLS APPROVED',              4.15::numeric,'Feet', 27.63::numeric,  114.67::numeric),
  (42, '6"',   'PIPE, SMLS, SCH STD, A333 GR 6 BBE PIPE 6" STD (.280) A106B/A333-6/GR359 CAT II NACE CSAZ245.1 SMLS DRL APPROVED',       64.85::numeric,'Feet', 40.24::numeric, 2609.66::numeric),
  (43, '10"',  'PIPE, SMLS, SCH STD, A333 GR 6 BBE PIPE 10" STD (.365) A106B/A333-6/GR359 CAT II NACE CSAZ245.1 SMLS DRL APPROVED',     208.74::numeric,'Feet', 91.46::numeric,19091.37::numeric),
  (44, '6"x4"',    'REDUCER, CONC, BW, SCH 80 LE x SCH 80 SE, A420 GR WPL6 WELD CONC REDUCER 6" X 4" XH (.432/.337) A420-WPL6 APPROVED',   1::numeric,'Each', 53.33::numeric,  53.33::numeric),
  (45, '3"x2"',    'REDUCER, CONC, BW, SCH STD LE x SCH 80 SE, A420 GR WPL6 WELD CONC REDUCER 3" X 2" STD/XH (.216/.218) A420-WPL6 APPROVED', 3::numeric,'Each',  5.92::numeric, 17.76::numeric),
  (46, '4"x2"',    'REDUCER, CONC, BW, SCH STD LE x SCH 80 SE, A420 GR WPL6 WELD CONC REDUCER 4" X 2" STD/XH (.237/.218) A420-WPL6',       1::numeric,'Each', 30.67::numeric,  30.67::numeric),
  (47, '4"x3"',    'REDUCER, CONC, BW, SCH STD LE x SCH STD SE, A420 GR WPL6 WELD CONC REDUCER 4" X 3" STD (.237/.216) A420-WPL6 APPROVED',1::numeric,'Each',  9.13::numeric,   9.13::numeric),
  (48, '6"x4"',    'REDUCER, CONC, BW, SCH STD LE x SCH STD SE, A420 GR WPL6 WELD CONC REDUCER 6" X 4" STD (.280/.237) A420-WPL6 APPROVED',1::numeric,'Each', 34.00::numeric,  34.00::numeric),
  (49, '3"x2"',    'REDUCER, ECC, BW, SCH STD LE x SCH 80 SE, A420 GR WPL6 WELD ECC REDUCER 3" X 2" STD/XH A420-WPL6',                     3::numeric,'Each', 28.00::numeric,  84.00::numeric),
  (50, '4"x2"',    'REDUCER, ECC, BW, SCH STD LE x SCH 80 SE, A420 GR WPL6 WELD ECC REDUCER 4" X 2" STD/XH A420-WPL6',                     5::numeric,'Each', 26.67::numeric, 133.35::numeric),
  (51, '2"',   'SPECTACLE BLIND, RF, CL150 ASME, A516 GR 70N (IMPACT TESTED) FLANGE RF BLIND SPECTACLE 2" 150 A516-70N 1/4" THICK',        9::numeric,'Each', 41.56::numeric, 374.04::numeric),
  (52, '3"',   'SPECTACLE BLIND, RF, CL150 ASME, A516 GR 70N (IMPACT TESTED) FLANGE RF BLIND SPECTACLE 3" 150 A516-70N 1/4" THICK',        5::numeric,'Each', 49.06::numeric, 245.30::numeric),
  (53, '4"',   'SPECTACLE BLIND, RF, CL150 ASME, A516 GR 70N (IMPACT TESTED) FLANGE RF BLIND SPECTACLE 4" 150 A516-70N 3/8" THICK',       23::numeric,'Each', 70.00::numeric,1610.00::numeric),
  (54, '6"',   'SPECTACLE BLIND, RF, CL150 ASME, A516 GR 70N (IMPACT TESTED) FLANGE RF BLIND SPECTACLE 6" 150 A516-70N 1/2" THICK',        5::numeric,'Each',116.56::numeric, 582.80::numeric),
  (55, '4"x2"',    'TEE, RED, BW, SCH STD LE x SCH 80 SE, A420 GR WPL6 WELD REDUCING TEE 4" X 4" X 2" STD/XH (.237/.218) A420-WPL6 APPROVED', 3::numeric,'Each', 27.05::numeric,81.15::numeric),
  (56, '10"x6"',   'TEE, RED, BW, SCH STD LE x SCH STD SE, A420 GR WPL6 WELD REDUCING TEE 10" X 10" X 6" STD (.365/.280) A420-WPL6',       1::numeric,'Each',233.33::numeric, 233.33::numeric),
  (57, '2"',   'TEE, STR, BW, SCH 80, A420 GR WPL6 WELD TEE 2" XH (.218) A420-WPL6 APPROVED',                                             11::numeric,'Each', 11.79::numeric, 129.69::numeric),
  (58, '3"',   'TEE, STR, BW, SCH STD, A420 GR WPL6 WELD TEE 3" STD (.216) A420-WPL6 APPROVED',                                            4::numeric,'Each', 21.13::numeric,  84.52::numeric),
  (59, '4"',   'TEE, STR, BW, SCH STD, A420 GR WPL6 WELD TEE 4" STD (.237) A420-WPL6 APPROVED',                                            1::numeric,'Each', 29.68::numeric,  29.68::numeric),
  (60, '10"x2"',   'WELDOLET, SCH 80, A350 GR LF2 CL1 WELDOLET FS 2" ON 8" - 36" XH A350-LF2',                                             4::numeric,'Each', 22.53::numeric,  90.12::numeric),
  (61, '6"x2"',    'WELDOLET, SCH 80, A350 GR LF2 CL1 WELDOLET FS 2" ON 4" - 6" XH A350-LF2',                                              2::numeric,'Each', 23.60::numeric,  47.20::numeric),
  (62, '10"x3"',   'WELDOLET, SCH STD, A350 GR LF2 CL1 WELDOLET FS 3" ON 8" - 12" STD A350-LF2',                                           2::numeric,'Each', 56.09::numeric, 112.18::numeric),
  (63, '1"',   '(12) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM 177.8 STUD B7M 1" X 7"',                                                 12::numeric,'Each',  3.89::numeric,  46.68::numeric),
  (64, '1/2"', '(4) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM 69.9 STUD B7M 1/2" X 2-3/4"',                                              8::numeric,'Each',  0.59::numeric,   4.72::numeric),
  (65, '3/4"', '(8) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM 101.6 STUD B7M 3/4" X 4"',                                               104::numeric,'Each',  1.52::numeric, 158.08::numeric),
  (66, '3/4"', '(8) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM 114.3 STUD B7M 3/4" X 4-1/2"',                                            80::numeric,'Each',  1.68::numeric, 134.40::numeric),
  (67, '3/4"', '(8) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM 120.65 STUD B7M 3/4" X 4-3/4"',                                           40::numeric,'Each',  1.68::numeric,  67.20::numeric),
  (68, '5/8"', '(4) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM 82.6 STUD B7M 5/8" X 3-1/4"',                                            584::numeric,'Each',  0.92::numeric, 537.28::numeric),
  (69, '5/8"', '(4) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM 88.9 STUD B7M 5/8" X 3-1/2"',                                              4::numeric,'Each',  1.00::numeric,   4.00::numeric),
  (70, '5/8"', '(4) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM 95.25 STUD B7M 5/8" X 3-3/4"',                                            32::numeric,'Each',  1.02::numeric,  32.64::numeric),
  (71, '5/8"', '(4) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM 95.3 STUD B7M 5/8" X 3-3/4"',                                            168::numeric,'Each',  1.02::numeric, 171.36::numeric),
  (72, '5/8"', '(4) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM 101.6 STUD B7M 5/8" X 4"',                                                20::numeric,'Each',  1.02::numeric,  20.40::numeric),
  (73, '5/8"', '(8) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM 95.3 STUD B7M 5/8" X 3-3/4"',                                            880::numeric,'Each',  1.02::numeric, 897.60::numeric),
  (74, '5/8"', '(8) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM 107.95 STUD B7M 5/8" X 4-1/4"',                                          184::numeric,'Each',  1.08::numeric, 198.72::numeric),
  (75, '5/8"', '(8) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM 114.3 STUD B7M 5/8" X 4-1/2"',                                            32::numeric,'Each',  1.06::numeric,  33.92::numeric),
  (76, '5/8"', '(8) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM 120.65 STUD B7M 5/8" X 4-3/4"',                                            8::numeric,'Each',  1.10::numeric,   8.80::numeric),
  (77, '7/8"', '(12) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM 120.7 STUD B7M 7/8" X 4-3/4"',                                           72::numeric,'Each',  2.39::numeric, 172.08::numeric),
  (78, '7/8"', '(8) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM 152.4 STUD B7M 7/8" X 6"',                                                56::numeric,'Each',  2.84::numeric, 159.04::numeric)
) as v(line_number, size, description, quantity, uom, unit_cost, amount);

-- -----------------------------------------------------------------------------
-- PUR-6540-2001333 · 75 lines · $158,498.77
-- -----------------------------------------------------------------------------
insert into public.apex_line_items (apex_po_id, line_number, size, description, quantity, uom, unit_cost, amount, lead_time)
select (select id from public.apex_pos where po_number = 'PUR-6540-2001333'),
       v.line_number, v.size, v.description, v.quantity, v.uom, v.unit_cost, v.amount, '3 WEEKS ARO'
from (values
  ( 1, '10"',      'SPECTACLE BLIND, RF, CL150 ASME, A516 GR 70N (IMPACT TESTED)',                                    1::numeric,'Each',  354.38::numeric,   354.38::numeric),
  ( 2, '12"',      'SPECTACLE BLIND, RF, CL150 ASME, A516 GR 70N (IMPACT TESTED)',                                    3::numeric,'Each',  451.25::numeric,  1353.75::numeric),
  ( 3, '2"',       'SPECTACLE BLIND, RF, CL150 ASME, A516 GR 70N (IMPACT TESTED)',                                   10::numeric,'Each',   41.56::numeric,   415.60::numeric),
  ( 4, '3"',       'SPECTACLE BLIND, RF, CL150 ASME, A516 GR 70N (IMPACT TESTED)',                                   13::numeric,'Each',   49.06::numeric,   637.78::numeric),
  ( 5, '4"',       'SPECTACLE BLIND, RF, CL150 ASME, A516 GR 70N (IMPACT TESTED)',                                    1::numeric,'Each',   70.00::numeric,    70.00::numeric),
  ( 6, '2"',       'SPECTACLE BLIND, RF, CL300 ASME, A516 GR 70N (IMPACT TESTED)',                                    6::numeric,'Each',   50.63::numeric,   303.78::numeric),
  ( 7, '2"',       'SPECTACLE BLIND, RF, CL600 ASME, A516 GR 70N (IMPACT TESTED)',                                    2::numeric,'Each',   50.63::numeric,   101.26::numeric),
  ( 8, '2"',       'SPECTACLE BLIND, RF, CL900 ASME, A516 GR 70N (IMPACT TESTED)',                                    3::numeric,'Each',   74.38::numeric,   223.14::numeric),
  ( 9, '4"',       'SPECTACLE BLIND, RTJ, CL1500 ASME, A516 GR 70N (IMPACT TESTED)',                                  3::numeric,'Each',  668.75::numeric,  2006.25::numeric),
  (10, '24"x14"',  'TEE, RED, BW, SCH 100 LE x SCH 120 SE, A420 GR WPL6',                                             1::numeric,'Each',16000.00::numeric, 16000.00::numeric),
  (11, '24"x16"',  'TEE, RED, BW, SCH 100 LE x SCH 120 SE, A420 GR WPL6 (rev A)',                                     1::numeric,'Each',21236.00::numeric, 21236.00::numeric),
  (12, '24"x16"',  'TEE, RED, BW, SCH 80 LE x SCH 80 SE, A420 GR WPL6',                                               1::numeric,'Each', 7333.33::numeric,  7333.33::numeric),
  (13, '4"x2"',    'TEE, RED, BW, SCH STD LE x SCH 80 SE, A420 GR WPL6',                                              3::numeric,'Each',   27.05::numeric,    81.15::numeric),
  (14, '16"',      'TEE, STR, BW, SCH 120, A420 GR WPL6',                                                             1::numeric,'Each', 5600.00::numeric,  5600.00::numeric),
  (15, '16"',      'TEE, STR, BW, SCH 80, A420 GR WPL6',                                                              3::numeric,'Each', 1333.95::numeric,  4001.85::numeric),
  (16, '2"',       'TEE, STR, BW, SCH 80, A420 GR WPL6',                                                             33::numeric,'Each',   11.79::numeric,   389.07::numeric),
  (17, '20"',      'TEE, STR, BW, SCH 80, A420 GR WPL6',                                                              1::numeric,'Each', 4100.00::numeric,  4100.00::numeric),
  (18, '24"',      'TEE, STR, BW, SCH 80, A420 GR WPL6',                                                              4::numeric,'Each', 7317.07::numeric, 29268.28::numeric),
  (19, '24"x4"',   'WELDOLET, SCH 120, A350 GR LF2 CL1',                                                              1::numeric,'Each',  453.33::numeric,   453.33::numeric),
  (20, '10"x2"',   'WELDOLET, SCH 80, A350 GR LF2 CL1',                                                               4::numeric,'Each',   22.53::numeric,    90.12::numeric),
  (21, '14"x2"',   'WELDOLET, SCH 80, A350 GR LF2 CL1',                                                               3::numeric,'Each',   22.53::numeric,    67.59::numeric),
  (22, '16"x2"',   'WELDOLET, SCH 80, A350 GR LF2 CL1',                                                               2::numeric,'Each',   22.53::numeric,    45.06::numeric),
  (23, '18"x2"',   'WELDOLET, SCH 80, A350 GR LF2 CL1',                                                               4::numeric,'Each',   22.53::numeric,    90.12::numeric),
  (24, '24"x2"',   'WELDOLET, SCH 80, A350 GR LF2 CL1',                                                               5::numeric,'Each',   22.53::numeric,   112.65::numeric),
  (25, '24"x4"',   'WELDOLET, SCH 80, A350 GR LF2 CL1',                                                               1::numeric,'Each',  180.00::numeric,   180.00::numeric),
  (26, '1 7/8"',   '(12) *CL1500RTJ* STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM 349.25',                            36::numeric,'Each',   39.97::numeric,  1438.92::numeric),
  (27, '1 7/8"',   '(12) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM 349.25',                                       360::numeric,'Each',   39.01::numeric, 14043.60::numeric),
  (28, '1"',       '(12) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM 177.8',                                         48::numeric,'Each',    3.89::numeric,   186.72::numeric),
  (29, '7/8"',     '(12) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM 120.7',                                        144::numeric,'Each',    2.39::numeric,   344.16::numeric),
  (30, '7/8"',     '(12) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM 139.7',                                         12::numeric,'Each',    2.61::numeric,    31.32::numeric),
  (31, '7/8"',     '(12) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM 146.05',                                        36::numeric,'Each',    2.56::numeric,    92.16::numeric),
  (32, '1"',       '(16) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM 139.7',                                         16::numeric,'Each',    3.53::numeric,    56.48::numeric),
  (33, '2 1/4"',   '(16) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM 431.8',                                         48::numeric,'Each',   30.09::numeric,  1444.32::numeric),
  (34, '2"',       '(16) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM 393.7',                                         96::numeric,'Each',   39.20::numeric,  3763.20::numeric),
  (35, '1 5/8"',   '(20) *CL900* STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM 292.1',                                 20::numeric,'Each',   19.53::numeric,   390.60::numeric),
  (36, '1 1/2"',   '(20) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM 260.35',                                       200::numeric,'Each',   18.21::numeric,  3642.00::numeric),
  (37, '1 1/2"',   '(20) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM 275',                                           20::numeric,'Each',   13.53::numeric,   270.60::numeric),
  (38, '1 1/2"',   '(20) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM 279.4',                                        160::numeric,'Each',   13.53::numeric,  2164.80::numeric),
  (39, '1 1/2"',   '(20) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM 311.15',                                        20::numeric,'Each',   20.77::numeric,   415.40::numeric),
  (40, '1 3/8"',   '(20) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM 241.3',                                        240::numeric,'Each',   10.65::numeric,  2556.00::numeric),
  (41, '1 3/8"',   '(20) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM 260.35',                                       360::numeric,'Each',   10.98::numeric,  3952.80::numeric),
  (42, '1 5/8"',   '(20) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM 275',                                           40::numeric,'Each',   19.53::numeric,   781.20::numeric),
  (43, '1 5/8"',   '(20) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM 279.4',                                        300::numeric,'Each',   19.53::numeric,  5859.00::numeric),
  (44, '1 5/8"',   '(20) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM 285',                                           40::numeric,'Each',   15.86::numeric,   634.40::numeric),
  (45, '1 5/8"',   '(20) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM 292.1',                                        180::numeric,'Each',   19.74::numeric,  3553.20::numeric),
  (46, '1 5/8"',   '(24) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM 292.1',                                         48::numeric,'Each',   19.74::numeric,   947.52::numeric),
  (47, '1 7/8"',   '(24) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM 330',                                           48::numeric,'Each',   27.11::numeric,  1301.28::numeric),
  (48, '1 7/8"',   '(24) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM 330.2',                                        312::numeric,'Each',   27.11::numeric,  8458.32::numeric),
  (49, '1 7/8"',   '(24) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM 406.4',                                         96::numeric,'Each',   42.61::numeric,  4090.56::numeric),
  (50, '1/2"',     '(4) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM 69.9',                                           72::numeric,'Each',    0.59::numeric,    42.48::numeric),
  (51, '5/8"',     '(4) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM 82.6',                                          696::numeric,'Each',    0.92::numeric,   640.32::numeric),
  (52, '5/8"',     '(4) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM 95.25',                                          40::numeric,'Each',    1.02::numeric,    40.80::numeric),
  (53, '5/8"',     '(4) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM 95.3',                                          200::numeric,'Each',    1.02::numeric,   204.00::numeric),
  (54, '5/8"',     '(4) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM 101.6',                                          60::numeric,'Each',    1.02::numeric,    61.20::numeric),
  (55, '7/8"',     '(4) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM 139.7',                                           4::numeric,'Each',    2.61::numeric,    10.44::numeric),
  (56, '5/8"',     '(8) *CL600* STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM 108',                                    48::numeric,'Each',    1.08::numeric,    51.84::numeric),
  (57, '1 1/4"',   '(8) *CL1500RTJ* STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM 203.2',                              24::numeric,'Each',    7.35::numeric,   176.40::numeric),
  (58, '7/8"',     '(8) *CL900* STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM 152.4',                                  24::numeric,'Each',    2.84::numeric,    68.16::numeric),
  (59, '1 1/4"',   '(8) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM 203.2',                                          24::numeric,'Each',    7.35::numeric,   176.40::numeric),
  (60, '1 1/4"',   '(8) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM 247.65',                                         24::numeric,'Each',    8.72::numeric,   209.28::numeric),
  (61, '1 1/8"',   '(8) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM 177.8',                                          32::numeric,'Each',    5.07::numeric,   162.24::numeric),
  (62, '3/4"',     '(8) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM 101.6',                                         240::numeric,'Each',    1.52::numeric,   364.80::numeric),
  (63, '3/4"',     '(8) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM 114.3',                                          48::numeric,'Each',    1.68::numeric,    80.64::numeric),
  (64, '3/4"',     '(8) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM 133.35',                                         32::numeric,'Each',    1.76::numeric,    56.32::numeric),
  (65, '5/8"',     '(8) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM 90',                                              8::numeric,'Each',    1.00::numeric,     8.00::numeric),
  (66, '5/8"',     '(8) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM 95.25',                                         168::numeric,'Each',    1.02::numeric,   171.36::numeric),
  (67, '5/8"',     '(8) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM 95.3',                                          144::numeric,'Each',    1.02::numeric,   146.88::numeric),
  (68, '5/8"',     '(8) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM 107.95',                                         56::numeric,'Each',    1.08::numeric,    60.48::numeric),
  (69, '5/8"',     '(8) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM 110',                                             8::numeric,'Each',    1.06::numeric,     8.48::numeric),
  (70, '5/8"',     '(8) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM 114.3',                                         208::numeric,'Each',    1.06::numeric,   220.48::numeric),
  (71, '5/8"',     '(8) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM 120.65',                                         32::numeric,'Each',    1.10::numeric,    35.20::numeric),
  (72, '7/8"',     '(8) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM 145',                                             8::numeric,'Each',    2.56::numeric,    20.48::numeric),
  (73, '7/8"',     '(8) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM 152.4',                                         160::numeric,'Each',    2.84::numeric,   454.40::numeric),
  (74, '7/8"',     '(8) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM 158.75',                                          8::numeric,'Each',    2.95::numeric,    23.60::numeric),
  (75, '7/8"',     '(8) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM 165.1',                                          24::numeric,'Each',    2.96::numeric,    71.04::numeric)
) as v(line_number, size, description, quantity, uom, unit_cost, amount);

-- -----------------------------------------------------------------------------
-- PUR-6540-2001334 · 73 lines · $916,494.42
-- -----------------------------------------------------------------------------
insert into public.apex_line_items (apex_po_id, line_number, size, description, quantity, uom, unit_cost, amount, lead_time)
select (select id from public.apex_pos where po_number = 'PUR-6540-2001334'),
       v.line_number, v.size, v.description, v.quantity, v.uom, v.unit_cost, v.amount, '5 WEEKS ARO'
from (values
  ( 1, '10"', 'ELBOW, 45 DEG, BW, LR, SCH 120, A420 GR WPL6',                             3::numeric,'Each',   453.33::numeric,   1359.99::numeric),
  ( 2, '2"',  'ELBOW, 45 DEG, BW, LR, SCH 80, A234 GR WPB',                               1::numeric,'Each',     2.85::numeric,      2.85::numeric),
  ( 3, '16"', 'ELBOW, 45 DEG, BW, LR, SCH 80, A420 GR WPL6',                              2::numeric,'Each',  1433.33::numeric,   2866.66::numeric),
  ( 4, '2"',  'ELBOW, 45 DEG, BW, LR, SCH 80, A420 GR WPL6',                              5::numeric,'Each',     3.51::numeric,     17.55::numeric),
  ( 5, '24"', 'ELBOW, 45 DEG, BW, LR, SCH 80, A420 GR WPL6',                              2::numeric,'Each',  3533.33::numeric,   7066.66::numeric),
  ( 6, '3"',  'ELBOW, 45 DEG, BW, LR, SCH 80, A420 GR WPL6',                              1::numeric,'Each',     9.07::numeric,      9.07::numeric),
  ( 7, '4"',  'ELBOW, 45 DEG, BW, LR, SCH STD, A234 GR WPB',                              3::numeric,'Each',    11.05::numeric,     33.15::numeric),
  ( 8, '10"', 'ELBOW, 45 DEG, BW, LR, SCH STD, A420 GR WPL6',                             1::numeric,'Each',   206.67::numeric,    206.67::numeric),
  ( 9, '16"', 'ELBOW, 45 DEG, BW, LR, SCH STD, A420 GR WPL6',                             2::numeric,'Each',   400.00::numeric,    800.00::numeric),
  (10, '6"',  'ELBOW, 45 DEG, BW, LR, SCH STD, A420 GR WPL6',                            21::numeric,'Each',    46.67::numeric,    980.07::numeric),
  (11, '24"', 'ELBOW, 90 DEG, BW, LR, SCH 100, A420 GR WPL6',                             2::numeric,'Each', 16764.71::numeric,  33529.42::numeric),
  (12, '10"', 'ELBOW, 90 DEG, BW, LR, SCH 120, A420 GR WPL6',                            12::numeric,'Each',  1086.67::numeric,  13040.04::numeric),
  (13, '12"', 'ELBOW, 90 DEG, BW, LR, SCH 120, A420 GR WPL6',                            12::numeric,'Each',  1585.37::numeric,  19024.44::numeric),
  (14, '14"', 'ELBOW, 90 DEG, BW, LR, SCH 120, A420 GR WPL6 (rev A)',                     5::numeric,'Each',  1875.00::numeric,   9375.00::numeric),
  (15, '14"', 'ELBOW, 90 DEG, BW, LR, SCH 120, A420 GR WPL6 (rev B)',                     4::numeric,'Each',  4408.75::numeric,  17635.00::numeric),
  (16, '16"', 'ELBOW, 90 DEG, BW, LR, SCH 120, A420 GR WPL6',                            10::numeric,'Each',  2743.90::numeric,  27439.00::numeric),
  (17, '4"',  'ELBOW, 90 DEG, BW, LR, SCH 120, A420 GR WPL6',                             6::numeric,'Each',    80.00::numeric,    480.00::numeric),
  (18, '4"',  'ELBOW, 90 DEG, BW, LR, SCH 160, A420 GR WPL6',                            11::numeric,'Each',    92.00::numeric,   1012.00::numeric),
  (19, '2"',  'ELBOW, 90 DEG, BW, LR, SCH 80, A234 GR WPB',                              17::numeric,'Each',     5.69::numeric,     96.73::numeric),
  (20, '14"', 'ELBOW, 90 DEG, BW, LR, SCH 80, A420 GR WPL6',                             18::numeric,'Each',  1060.98::numeric,  19097.64::numeric),
  (21, '16"', 'ELBOW, 90 DEG, BW, LR, SCH 80, A420 GR WPL6',                              7::numeric,'Each',  1271.12::numeric,   8897.84::numeric),
  (22, '18"', 'ELBOW, 90 DEG, BW, LR, SCH 80, A420 GR WPL6',                             12::numeric,'Each',  1768.29::numeric,  21219.48::numeric),
  (23, '2"',  'ELBOW, 90 DEG, BW, LR, SCH 80, A420 GR WPL6',                            215::numeric,'Each',     5.69::numeric,   1223.35::numeric),
  (24, '24"', 'ELBOW, 90 DEG, BW, LR, SCH 80, A420 GR WPL6',                             12::numeric,'Each',  5853.66::numeric,  70243.92::numeric),
  (25, '3"',  'ELBOW, 90 DEG, BW, LR, SCH 80, A420 GR WPL6',                              6::numeric,'Each',    14.85::numeric,     89.10::numeric),
  (26, '6"',  'ELBOW, 90 DEG, BW, LR, SCH 80, A420 GR WPL6',                              5::numeric,'Each',    78.47::numeric,    392.35::numeric),
  (27, '4"',  'ELBOW, 90 DEG, BW, LR, SCH STD, A234 GR WPB',                              8::numeric,'Each',    16.55::numeric,    132.40::numeric),
  (28, '10"', 'ELBOW, 90 DEG, BW, LR, SCH STD, A420 GR WPL6',                             2::numeric,'Each',   196.00::numeric,    392.00::numeric),
  (29, '12"', 'ELBOW, 90 DEG, BW, LR, SCH STD, A420 GR WPL6',                            12::numeric,'Each',   270.89::numeric,   3250.68::numeric),
  (30, '16"', 'ELBOW, 90 DEG, BW, LR, SCH STD, A420 GR WPL6',                             1::numeric,'Each',   533.33::numeric,    533.33::numeric),
  (31, '3"',  'ELBOW, 90 DEG, BW, LR, SCH STD, A420 GR WPL6',                            50::numeric,'Each',    14.67::numeric,    733.50::numeric),
  (32, '4"',  'ELBOW, 90 DEG, BW, LR, SCH STD, A420 GR WPL6',                            19::numeric,'Each',    19.43::numeric,    369.17::numeric),
  (33, '6"',  'ELBOW, 90 DEG, BW, LR, SCH STD, A420 GR WPL6',                            15::numeric,'Each',    50.33::numeric,    754.95::numeric),
  (34, '10"', 'FLANGE, RF, BLIND, CL150 ASME, A350 GR LF2 CL1',                           1::numeric,'Each',   146.67::numeric,    146.67::numeric),
  (35, '2"',  'FLANGE, RF, BLIND, CL150 ASME, A350 GR LF2 CL1',                          18::numeric,'Each',    12.01::numeric,    216.18::numeric),
  (36, '4"',  'FLANGE, RF, BLIND, CL150 ASME, A350 GR LF2 CL1',                           4::numeric,'Each',    35.33::numeric,    141.32::numeric),
  (37, '16"', 'FLANGE, RF, BLIND, CL600 ASME, A350 GR LF2 CL1',                           3::numeric,'Each',  1466.67::numeric,   4400.01::numeric),
  (38, '20"', 'FLANGE, RF, BLIND, CL600 ASME, A350 GR LF2 CL1',                           1::numeric,'Each',  2513.33::numeric,   2513.33::numeric),
  (39, '24"', 'FLANGE, RF, BLIND, CL600 ASME, A350 GR LF2 CL1',                           3::numeric,'Each',  3200.00::numeric,   9600.00::numeric),
  (40, '4"',  'FLANGE, RF, BLIND, CL600 ASME, A350 GR LF2 CL1',                           1::numeric,'Each',    78.35::numeric,     78.35::numeric),
  (41, '16"', 'FLANGE, RF, BLIND, CL900 ASME, A350 GR LF2 CL1',                           1::numeric,'Each',  2733.33::numeric,   2733.33::numeric),
  (42, '24"', 'FLANGE, RF, BLIND, CL900 ASME, A350 GR LF2 CL1',                           2::numeric,'Each',  8133.33::numeric,  16266.66::numeric),
  (43, '4"',  'FLANGE, RF, BLIND, CL900 ASME, A350 GR LF2 CL1',                           1::numeric,'Each',   140.00::numeric,    140.00::numeric),
  (44, '2"',  'FLANGE, RFWN, CL150 ASME, SCH 80 BORE, A350 GR LF2 CL1',                 242::numeric,'Each',    14.83::numeric,   3588.86::numeric),
  (45, '4"',  'FLANGE, RFWN, CL150 ASME, SCH STD BORE, A105N',                            4::numeric,'Each',    29.59::numeric,    118.36::numeric),
  (46, '10"', 'FLANGE, RFWN, CL150 ASME, SCH STD BORE, A350 GR LF2 CL1',                  8::numeric,'Each',   140.00::numeric,   1120.00::numeric),
  (47, '12"', 'FLANGE, RFWN, CL150 ASME, SCH STD BORE, A350 GR LF2 CL1',                  8::numeric,'Each',   233.33::numeric,   1866.64::numeric),
  (48, '16"', 'FLANGE, RFWN, CL150 ASME, SCH STD BORE, A350 GR LF2 CL1',                  2::numeric,'Each',   480.00::numeric,    960.00::numeric),
  (49, '3"',  'FLANGE, RFWN, CL150 ASME, SCH STD BORE, A350 GR LF2 CL1',                 78::numeric,'Each',    22.09::numeric,   1723.02::numeric),
  (50, '4"',  'FLANGE, RFWN, CL150 ASME, SCH STD BORE, A350 GR LF2 CL1',                 25::numeric,'Each',    30.08::numeric,    752.00::numeric),
  (51, '6"',  'FLANGE, RFWN, CL150 ASME, SCH STD BORE, A350 GR LF2 CL1',                 42::numeric,'Each',    62.00::numeric,   2604.00::numeric),
  (52, '8"',  'FLANGE, RFWN, CL150 ASME, SCH STD BORE, A350 GR LF2 CL1',                  6::numeric,'Each',    92.00::numeric,    552.00::numeric),
  (53, '2"',  'FLANGE, RFWN, CL300 ASME, SCH 80 BORE, A105N',                            24::numeric,'Each',    16.11::numeric,    386.64::numeric),
  (54, '14"', 'FLANGE, RFWN, CL600 ASME, SCH 80 BORE, A350 GR LF2 CL1',                  12::numeric,'Each',   880.00::numeric,  10560.00::numeric),
  (55, '16"', 'FLANGE, RFWN, CL600 ASME, SCH 80 BORE, A350 GR LF2 CL1',                  16::numeric,'Each',  1980.00::numeric,  31680.00::numeric),
  (56, '18"', 'FLANGE, RFWN, CL600 ASME, SCH 80 BORE, A350 GR LF2 CL1 (rev A)',           4::numeric,'Each',  1666.67::numeric,   6666.68::numeric),
  (57, '18"', 'FLANGE, RFWN, CL600 ASME, SCH 80 BORE, A350 GR LF2 CL1 (rev B)',          20::numeric,'Each',  5666.67::numeric, 113333.40::numeric),
  (58, '2"',  'FLANGE, RFWN, CL600 ASME, SCH 80 BORE, A350 GR LF2 CL1',                  45::numeric,'Each',    24.09::numeric,   1084.05::numeric),
  (59, '20"', 'FLANGE, RFWN, CL600 ASME, SCH 80 BORE, A350 GR LF2 CL1',                   2::numeric,'Each',  1600.00::numeric,   3200.00::numeric),
  (60, '24"', 'FLANGE, RFWN, CL600 ASME, SCH 80 BORE, A350 GR LF2 CL1',                  23::numeric,'Each',  2588.24::numeric,  59529.52::numeric),
  (61, '3"',  'FLANGE, RFWN, CL600 ASME, SCH 80 BORE, A350 GR LF2 CL1',                   7::numeric,'Each',    40.03::numeric,    280.21::numeric),
  (62, '4"',  'FLANGE, RFWN, CL600 ASME, SCH 80 BORE, A350 GR LF2 CL1',                   2::numeric,'Each',    85.44::numeric,    170.88::numeric),
  (63, '6"',  'FLANGE, RFWN, CL600 ASME, SCH 80 BORE, A350 GR LF2 CL1',                   7::numeric,'Each',   206.67::numeric,   1446.69::numeric),
  (64, '24"', 'FLANGE, RFWN, CL900 ASME, SCH 100 BORE, A350 GR LF2 CL1',                 12::numeric,'Each',  8431.38::numeric, 101176.56::numeric),
  (65, '12"', 'FLANGE, RFWN, CL900 ASME, SCH 120 BORE, A350 GR LF2 CL1',                 30::numeric,'Each',  1600.00::numeric,  48000.00::numeric),
  (66, '14"', 'FLANGE, RFWN, CL900 ASME, SCH 120 BORE, A350 GR LF2 CL1',                  6::numeric,'Each',  2600.00::numeric,  15600.00::numeric),
  (67, '16"', 'FLANGE, RFWN, CL900 ASME, SCH 120 BORE, A350 GR LF2 CL1',                 18::numeric,'Each',  3505.88::numeric,  63105.84::numeric),
  (68, '4"',  'FLANGE, RFWN, CL900 ASME, SCH 120 BORE, A350 GR LF2 CL1',                  4::numeric,'Each',   260.00::numeric,   1040.00::numeric),
  (69, '16"', 'FLANGE, RFWN, CL900 ASME, SCH 80 BORE, A350 GR LF2 CL1',                   1::numeric,'Each',  2200.00::numeric,   2200.00::numeric),
  (70, '2"',  'FLANGE, RFWN, CL900 ASME, SCH 80 BORE, A350 GR LF2 CL1',                  30::numeric,'Each',    56.52::numeric,   1695.60::numeric),
  (71, '24"', 'FLANGE, RFWN, CL900 ASME, SCH 80 BORE, A350 GR LF2 CL1',                   1::numeric,'Each',  6866.67::numeric,   6866.67::numeric),
  (72, '10"', 'FLANGE, RTJWN, CL1500 ASME, SCH 120 BORE, A350 GR LF2 CL1',               42::numeric,'Each',  2805.88::numeric, 117846.96::numeric),
  (73, '12"', 'FLANGE, RTJWN, CL1500 ASME, SCH 120 BORE, A350 GR LF2 CL1',                6::numeric,'Each',  3133.33::numeric,  18799.98::numeric)
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
--   where p.po_number in ('PUR-6540-2001331','PUR-6540-2001332','PUR-6540-2001333','PUR-6540-2001334')
--   group by p.po_number, p.ewp, p.total_amount
--   order by p.po_number;
--
-- Expected:
--   2001331 · EWP #18 · 75 lines · $818,154.69 · diff 0.00
--   2001332 · EWP #13 · 78 lines · $ 72,073.59 · diff 0.00
--   2001333 · EWP #18 · 75 lines · $158,498.77 · diff 0.00
--   2001334 · EWP #18 · 73 lines · $916,494.42 · diff 0.00
--
-- Grand total across all 11 Apex POs now loaded:
--   $96,900.68 (original 7) + $1,965,221.47 (this addendum) = $2,062,122.15

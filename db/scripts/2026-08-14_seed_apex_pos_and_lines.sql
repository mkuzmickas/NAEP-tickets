-- =============================================================================
-- 2026-08-14 — Seed Apex Distribution POs and line items
-- =============================================================================
-- 7 POs · 295 line items · $96,900.68 total
--
-- Extracted directly from the Apex PO PDFs (PUR-6540-2001314, 315, 316, 318,
-- 319, 320, 322). Every PO's line-total sum has been reconciled to its
-- printed grand total.
--
-- Assumptions:
--   • order_date = 2026-07-22 (all 7 POs share this order date)
--   • requester  = 'Jade Rowe' (Enbridge PM on all 7)
--   • lead_time  = 'STOCK' by default; Mike updates per-line if Apex quotes
--     a lead time in the meeting
--   • ship_date  = NULL — set later via /pvf UI (multi-select + date picker)
--   • vendor     = NULL — populated later if needed
-- =============================================================================

begin;

-- 1) Insert the 7 POs.
insert into public.apex_pos (
  po_number, ewp, gle_package, description, requester, order_date, total_amount
) values
  ('PUR-6540-2001314', 'EWP #14', '24198-4001-03', 'Power Generation Area Off Skid Piping',            'Jade Rowe', '2026-07-22', 11063.45),
  ('PUR-6540-2001315', 'EWP #14', '24198-4001-02', 'Start Air Receiver Skid Area Off-Skid Piping',      'Jade Rowe', '2026-07-22',  5474.12),
  ('PUR-6540-2001316', 'EWP #56', '24198-4001-06', 'P1-P2 BTEX Tank Off Skid Piping',                   'Jade Rowe', '2026-07-22', 11026.84),
  ('PUR-6540-2001318', 'EWP #55', '24198-4001-05', 'Hot Oil Booster Skid Off Skid Piping',              'Jade Rowe', '2026-07-22',  2587.48),
  ('PUR-6540-2001319', 'EWP #55', '24198-4001-04', 'Fuel Gas Conditioning Building Off Skid Piping',    'Jade Rowe', '2026-07-22', 11782.86),
  ('PUR-6540-2001320', 'EWP #55', '24198-4001-04', 'Fuel Gas Conditioning Building Off Skid Piping',    'Jade Rowe', '2026-07-22', 13150.15),
  ('PUR-6540-2001322', 'EWP #12', '24198-4001-07', 'HP-LP FKOD Off Skid Piping',                        'Jade Rowe', '2026-07-22', 41815.78);

-- 2) Line items. One INSERT per PO — easier to isolate if any single PO fails.

-- ─── PUR-6540-2001314 · Power Generation · 62 lines · $11,063.45 ─────────────
insert into public.apex_line_items (apex_po_id, line_number, size, description, quantity, uom, unit_cost, amount, lead_time)
select (select id from public.apex_pos where po_number = 'PUR-6540-2001314'),
       v.line_number, v.size, v.description, v.quantity, v.uom, v.unit_cost, v.amount, 'STOCK'
from (values
  (1,  '2"',      'ELBOW, 45 DEG, BW, LR, SCH 80, A420 GR WPL6',                                        1::numeric,     'Each',  3.51::numeric,    3.51::numeric),
  (2,  '4"',      'ELBOW, 45 DEG, BW, LR, SCH STD, A420 GR WPL6',                                       2,              'Each',  11.05,           22.10),
  (3,  '2"',      'ELBOW, 90 DEG, BW, LR, SCH 80, A420 GR WPL6',                                        18,             'Each',  5.69,           102.42),
  (4,  '3"',      'ELBOW, 90 DEG, BW, LR, SCH STD, A420 GR WPL6',                                       6,              'Each',  14.60,           87.60),
  (5,  '4"',      'ELBOW, 90 DEG, BW, LR, SCH STD, A420 GR WPL6',                                       16,             'Each',  19.43,          310.88),
  (6,  '1"',      'ELBOW, 90 DEG, THRD, CL3000 FS, A350 GR LF2 CL1',                                    6,              'Each',  13.64,           81.84),
  (7,  '2"',      'FLANGE, RF, BLIND, CL150 ASME, A350 GR LF2 CL1',                                     5,              'Each',  12.01,           60.05),
  (8,  '3"',      'FLANGE, RF, BLIND, CL150 ASME, A350 GR LF2 CL1',                                     3,              'Each',  19.59,           58.77),
  (9,  '4"',      'FLANGE, RF, BLIND, CL150 ASME, A350 GR LF2 CL1',                                     5,              'Each',  32.87,          164.35),
  (10, '6"',      'FLANGE, RF, BLIND, CL150 ASME, A350 GR LF2 CL1',                                     2,              'Each',  56.67,          113.34),
  (11, '1"',      'FLANGE, RF, SW, CL150 ASME, A350 GR LF2 CL1',                                        1,              'Each',  7.52,             7.52),
  (12, '1"',      'FLANGE, RF, THRD, CL150 ASME, A350 GR LF2 CL1',                                      5,              'Each',  13.44,           67.20),
  (13, '2"',      'FLANGE, RFWN, CL150 ASME, SCH 80 BORE, A350 GR LF2 CL1',                             19,             'Each',  14.83,          281.77),
  (14, '3"',      'FLANGE, RFWN, CL150 ASME, SCH STD BORE, A350 GR LF2 CL1',                            9,              'Each',  22.09,          198.81),
  (15, '4"',      'FLANGE, RFWN, CL150 ASME, SCH STD BORE, A350 GR LF2 CL1',                            14,             'Each',  30.08,          421.12),
  (16, '6"',      'FLANGE, RFWN, CL150 ASME, SCH STD BORE, A350 GR LF2 CL1',                            5,              'Each',  61.33,          306.65),
  (17, '1"',      'GASKET, 3.2mm, CGI, CL150, ASME B16.20, SS 304/GRAPHITE, CS/SS 304 INNER',           5,              'Each',  1.24,             6.20),
  (18, '2"',      'GASKET, 3.2mm, CGI, CL150, ASME B16.20, SS 304/GRAPHITE, CS/SS 304 INNER',           29,             'Each',  3.11,            90.19),
  (19, '3"',      'GASKET, 3.2mm, CGI, CL150, ASME B16.20, SS 304/GRAPHITE, CS/SS 304 INNER',           18,             'Each',  5.60,           100.80),
  (20, '4"',      'GASKET, 3.2mm, CGI, CL150, ASME B16.20, SS 304/GRAPHITE, CS/SS 304 INNER',           12,             'Each',  6.80,            81.60),
  (21, '6"',      'GASKET, 3.2mm, CGI, CL150, ASME B16.20, SS 304/GRAPHITE, CS/SS 304 INNER',           7,              'Each',  9.19,            64.33),
  (22, '3"',      'GLE A-04 PIPE ANCHOR',                                                               1,              'Each',  35.15,           35.15),
  (23, '4"',      'GLE C-01 PIPE CLAMP',                                                                9,              'Each',  148.11,        1332.99),
  (24, '4"',      'GLE G-01 PIPE GUIDE',                                                                5,              'Each',  14.14,           70.70),
  (25, '3"',      'GLE G-03 PIPE GUIDE',                                                                1,              'Each',  17.85,           17.85),
  (26, '4"',      'GLE G-03 PIPE GUIDE',                                                                3,              'Each',  17.85,           53.55),
  (27, '1"',      'GLE G-06 PIPE GUIDE',                                                                3,              'Each',  0.68,             2.04),
  (28, '2"',      'GLE G-06 PIPE GUIDE',                                                                4,              'Each',  1.49,             5.96),
  (29, '3"',      'GLE G-06 PIPE GUIDE',                                                                1,              'Each',  3.61,             3.61),
  (30, '1"',      'NIPPLE, SMLS, SCH 80, A333 GR 6 TBE (100mm)',                                        4,              'Each',  6.61,            26.44),
  (31, '1/2"',    'NIPPLE, SMLS, SCH 80, A333 GR 6 TBE (100mm)',                                        1,              'Each',  3.94,             3.94),
  (32, '2"',      'PIPE, SMLS, SCH 80, A333 GR 6 BBE',                                                  57.09,          'Feet',  11.59,          661.71),
  (33, '1"',      'PIPE, SMLS, SCH 80, A333 GR 6 TBE',                                                  41.40,          'Feet',  5.59,           231.45),
  (34, '3"',      'PIPE, SMLS, SCH STD, A333 GR 6 BBE',                                                 20.47,          'Feet',  12.80,          262.05),
  (35, '4"',      'PIPE, SMLS, SCH STD, A333 GR 6 BBE',                                                 185.24,         'Feet',  19.46,         3604.70),
  (36, '3"',      'PIPE, SMLS, SCH STD, A333 GR 6 BOE-TOE',                                             1.84,           'Feet',  13.66,           25.10),
  (37, '1 1/2"',  'PLUG, THRD, HEX HEAD, CL6000 FS, A350 GR LF2 CL1',                                   2,              'Each',  6.03,            12.06),
  (38, '1"',      'PLUG, THRD, HEX HEAD, CL6000 FS, A350 GR LF2 CL1',                                   6,              'Each',  4.06,            24.36),
  (39, '3/4"',    'PLUG, THRD, HEX HEAD, CL6000 FS, A350 GR LF2 CL1',                                   2,              'Each',  2.69,             5.38),
  (40, '3"x2"',   'REDUCER, CONC, BW, SCH STD LE x SCH 80 SE, A420 GR WPL6',                            3,              'Each',  5.92,            17.76),
  (41, '6"x3"',   'REDUCER, CONC, BW, SCH STD LE x SCH STD SE, A420 GR WPL6',                          1,              'Each',  32.67,           32.67),
  (42, '6"x4"',   'REDUCER, CONC, BW, SCH STD LE x SCH STD SE, A420 GR WPL6',                          4,              'Each',  29.33,          117.32),
  (43, '2"',      'SPECTACLE BLIND, RF, CL150 ASME, A516 GR 70N (IMPACT TESTED)',                       5,              'Each',  40.55,          202.75),
  (44, '3"',      'SPECTACLE BLIND, RF, CL150 ASME, A516 GR 70N (IMPACT TESTED)',                       4,              'Each',  47.87,          191.48),
  (45, '2"x1"',   'SWAGE, CONC, SCH 80 LE x SCH 80 SE, A333 GR 6 BLE-PSE',                              3,              'Each',  63.14,          189.42),
  (46, '2"x1"',   'SWAGE, CONC, SCH 80 LE x SCH 80 SE, A333 GR 6 BLE-TSE',                              1,              'Each',  44.67,           44.67),
  (47, '4"x2"',   'TEE, RED, BW, SCH STD LE x SCH 80 SE, A420 GR WPL6',                                 3,              'Each',  27.05,           81.15),
  (48, '2"',      'TEE, STR, BW, SCH 80, A420 GR WPL6',                                                 3,              'Each',  11.79,           35.37),
  (49, '2"x1/2"', 'THREADOLET, CL3000 FS, A350 GR LF2 CL1',                                             1,              'Each',  14.63,           14.63),
  (50, '4"x1"',   'THREADOLET, CL3000 FS, A350 GR LF2 CL1',                                             1,              'Each',  9.09,             9.09),
  (51, '1"',      'UNION, THRD, CL3000 FS, A350 GR LF2 CL1',                                            2,              'Each',  14.39,           28.78),
  (52, '1"',      'VALVE, BALL, SWxTHRD, RP, CL600, A350 GR LF2 CL1, TAG #BAR0632C',                    2,              'Each',  157.08,         314.16),
  (53, '1"',      'VALVE, BALL, THRD, RP, CL600, A350 GR LF2 CL1, TAG BAR#0622C',                       3,              'Each',  108.53,         325.59),
  (54, '1/2"',    'VALVE, BALL, THRD, RP, CL600, A350 GR LF2 CL1, TAG BAR#0622C',                       1,              'Each',  79.96,           79.96),
  (55, '1/2"',    '(4) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM, 69.9mm',                            20,             'Each',  0.63,            12.60),
  (56, '5/8"',    '(4) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM, 82.6mm',                            76,             'Each',  0.99,            75.24),
  (57, '5/8"',    '(4) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM, 95.25mm',                           20,             'Each',  1.10,            22.00),
  (58, '5/8"',    '(4) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM, 95.3mm',                            40,             'Each',  1.10,            44.00),
  (59, '5/8"',    '(4) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM, 101.6mm',                           12,             'Each',  1.10,            13.20),
  (60, '5/8"',    '(4) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM, 107.95mm',                          4,              'Each',  1.16,             4.64),
  (61, '3/4"',    '(8) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM, 101.6mm',                           56,             'Each',  1.63,            91.28),
  (62, '5/8"',    '(8) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM, 95.3mm',                            96,             'Each',  1.10,           105.60)
) as v(line_number, size, description, quantity, uom, unit_cost, amount);

-- ─── PUR-6540-2001315 · Start Air Receiver · 32 lines · $5,474.12 ────────────
insert into public.apex_line_items (apex_po_id, line_number, size, description, quantity, uom, unit_cost, amount, lead_time)
select (select id from public.apex_pos where po_number = 'PUR-6540-2001315'),
       v.line_number, v.size, v.description, v.quantity, v.uom, v.unit_cost, v.amount, 'STOCK'
from (values
  (1,  '3"',      'ELBOW, 45 DEG, BW, LR, SCH STD, A420 GR WPL6',                                       2::numeric,     'Each',  6.67::numeric,   13.34::numeric),
  (2,  '4"',      'ELBOW, 45 DEG, BW, LR, SCH STD, A420 GR WPL6',                                       2,              'Each',  11.05,           22.10),
  (3,  '2"',      'ELBOW, 90 DEG, BW, LR, SCH 80, A420 GR WPL6',                                        10,             'Each',  5.69,            56.90),
  (4,  '3"',      'ELBOW, 90 DEG, BW, LR, SCH STD, A420 GR WPL6',                                       4,              'Each',  14.60,           58.40),
  (5,  '4"',      'ELBOW, 90 DEG, BW, LR, SCH STD, A420 GR WPL6',                                       4,              'Each',  19.43,           77.72),
  (6,  '2"',      'FLANGE, RF, BLIND, CL150 ASME, A350 GR LF2 CL1',                                     1,              'Each',  12.01,           12.01),
  (7,  '3"',      'FLANGE, RF, BLIND, CL150 ASME, A350 GR LF2 CL1',                                     3,              'Each',  19.59,           58.77),
  (8,  '4"',      'FLANGE, RF, BLIND, CL150 ASME, A350 GR LF2 CL1',                                     3,              'Each',  32.87,           98.61),
  (9,  '2"',      'FLANGE, RFWN, CL150 ASME, SCH 80 BORE, A350 GR LF2 CL1',                             11,             'Each',  14.83,          163.13),
  (10, '3"',      'FLANGE, RFWN, CL150 ASME, SCH STD BORE, A350 GR LF2 CL1',                            12,             'Each',  22.09,          265.08),
  (11, '4"',      'FLANGE, RFWN, CL150 ASME, SCH STD BORE, A350 GR LF2 CL1',                            14,             'Each',  30.08,          421.12),
  (12, '2"',      'GASKET, 3.2mm, CGI, CL150, ASME B16.20, SS 304/GRAPHITE, CS/SS 304 INNER',           8,              'Each',  3.11,            24.88),
  (13, '3"',      'GASKET, 3.2mm, CGI, CL150, ASME B16.20, SS 304/GRAPHITE, CS/SS 304 INNER',           11,             'Each',  5.60,            61.60),
  (14, '4"',      'GASKET, 3.2mm, CGI, CL150, ASME B16.20, SS 304/GRAPHITE, CS/SS 304 INNER',           11,             'Each',  6.80,            74.80),
  (15, '2"',      'GLE G-03 PIPE GUIDE',                                                                1,              'Each',  17.85,           17.85),
  (16, '3"',      'GLE G-03 PIPE GUIDE',                                                                3,              'Each',  17.85,           53.55),
  (17, '4"',      'GLE G-03 PIPE GUIDE',                                                                2,              'Each',  17.85,           35.70),
  (18, '2"',      'PIPE, SMLS, SCH 80, A333 GR 6 BBE',                                                  36.55,          'Feet',  11.59,          423.60),
  (19, '2"',      'NIPPLE PIPE, SMLS, SCH 80, A333 GR 6 BOE-TOE (100mm)',                               1,              'Each',  11.86,           11.86),
  (20, '3"',      'PIPE, SMLS, SCH STD, A333 GR 6 BBE',                                                 90.45,          'Feet',  12.80,         1157.80),
  (21, '4"',      'PIPE, SMLS, SCH STD, A333 GR 6 BBE',                                                 85.20,          'Feet',  19.46,         1658.06),
  (22, '3"',      'SPECTACLE BLIND, RF, CL150 ASME, A516 GR 70N (IMPACT TESTED)',                       1,              'Each',  47.87,           47.87),
  (23, '4"',      'SPECTACLE BLIND, RF, CL150 ASME, A516 GR 70N (IMPACT TESTED)',                       1,              'Each',  68.29,           68.29),
  (24, '3"x2"',   'TEE, RED, BW, SCH STD LE x SCH 80 SE, A420 GR WPL6',                                 2,              'Each',  16.40,           32.80),
  (25, '3"',      'TEE, STR, BW, SCH STD, A420 GR WPL6',                                                2,              'Each',  21.13,           42.26),
  (26, '4"',      'TEE, STR, BW, SCH STD, A420 GR WPL6',                                                2,              'Each',  29.68,           59.36),
  (27, '5/8"',    '(4) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM, 82.6mm',                            32,             'Each',  0.99,            31.68),
  (28, '5/8"',    '(4) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM, 95.3mm',                            36,             'Each',  1.10,            39.60),
  (29, '5/8"',    '(4) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM, 101.6mm',                           4,              'Each',  1.10,             4.40),
  (30, '5/8"',    '(8) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM, 95.3mm',                            72,             'Each',  1.10,            79.20),
  (31, '5/8"',    '(8) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM, 107.95mm',                          8,              'Each',  1.16,             9.28),
  (32, null,      'SS TAGS FOR VALVES',                                                                 39,             'Each',  7.50,           292.50)
) as v(line_number, size, description, quantity, uom, unit_cost, amount);

-- ─── PUR-6540-2001316 · P1-P2 BTEX Tank · 43 lines · $11,026.84 ─────────────
insert into public.apex_line_items (apex_po_id, line_number, size, description, quantity, uom, unit_cost, amount, lead_time)
select (select id from public.apex_pos where po_number = 'PUR-6540-2001316'),
       v.line_number, v.size, v.description, v.quantity, v.uom, v.unit_cost, v.amount, 'STOCK'
from (values
  (1,  '2"',      'ELBOW, 45 DEG, BW, LR, SCH 80, A420 GR WPL6',                                        2::numeric,     'Each',  3.51::numeric,    7.02::numeric),
  (2,  '6"',      'ELBOW, 45 DEG, BW, LR, SCH STD, A420 GR WPL6',                                       3,              'Each',  44.00,          132.00),
  (3,  '2"',      'ELBOW, 90 DEG, BW, LR, SCH 80, A420 GR WPL6',                                        33,             'Each',  5.69,           187.77),
  (4,  '3"',      'ELBOW, 90 DEG, BW, LR, SCH STD, A420 GR WPL6',                                       4,              'Each',  14.60,           58.40),
  (5,  '6"',      'ELBOW, 90 DEG, BW, LR, SCH STD, A420 GR WPL6',                                       8,              'Each',  50.33,          402.64),
  (6,  '1"',      'ELBOW, 90 DEG, THRD, CL3000 FS, A350 GR LF2 CL1',                                    4,              'Each',  13.64,           54.56),
  (7,  '2"',      'FLANGE, RF, BLIND, CL150 ASME, A350 GR LF2 CL1',                                     1,              'Each',  12.01,           12.01),
  (8,  '6"',      'FLANGE, RF, BLIND, CL150 ASME, A350 GR LF2 CL1',                                     1,              'Each',  56.67,           56.67),
  (9,  '1"',      'FLANGE, RF, THRD, CL150 ASME, A350 GR LF2 CL1',                                      2,              'Each',  13.44,           26.88),
  (10, '2"',      'FLANGE, RFWN, CL150 ASME, SCH 80 BORE, A350 GR LF2 CL1',                             21,             'Each',  14.83,          311.43),
  (11, '3"',      'FLANGE, RFWN, CL150 ASME, SCH STD BORE, A350 GR LF2 CL1',                            3,              'Each',  22.09,           66.27),
  (12, '6"',      'FLANGE, RFWN, CL150 ASME, SCH STD BORE, A350 GR LF2 CL1',                            16,             'Each',  61.33,          981.28),
  (13, '2"',      'FLANGE, RFWN, CL600 ASME, SCH 80 BORE, A350 GR LF2 CL1',                             3,              'Each',  24.09,           72.27),
  (14, '1"',      'GASKET, 3.2mm, CGI, CL150, ASME B16.20, SS 304/GRAPHITE, CS/SS 304 INNER',           1,              'Each',  1.24,             1.24),
  (15, '2"',      'GASKET, 3.2mm, CGI, CL150, ASME B16.20, SS 304/GRAPHITE, CS/SS 304 INNER',           14,             'Each',  3.11,            43.54),
  (16, '3"',      'GASKET, 3.2mm, CGI, CL150, ASME B16.20, SS 304/GRAPHITE, CS/SS 304 INNER',           3,              'Each',  5.60,            16.80),
  (17, '6"',      'GASKET, 3.2mm, CGI, CL150, ASME B16.20, SS 304/GRAPHITE, CS/SS 304 INNER',           16,             'Each',  9.19,           147.04),
  (18, '2"',      'GASKET, 3.2mm, CGI, CL600, ASME B16.20, SS 304/GRAPHITE, CS/SS 304 INNER',           3,              'Each',  3.63,            10.89),
  (19, '1"',      'NIPPLE, SMLS, SCH 80, A333 GR 6 BOE-TOE (100mm)',                                    1,              'Each',  6.29,             6.29),
  (20, '1"',      'NIPPLE, SMLS, SCH 80, A333 GR 6 TBE (100mm)',                                        8,              'Each',  6.61,            52.88),
  (21, '1"',      'PIPE, SMLS, SCH 80, A333 GR 6 TBE',                                                  21.72,          'Feet',  5.59,           121.41),
  (22, '2"',      'PIPE, SMLS, SCH 80, A333 GR 6 BBE',                                                  264.93,         'Feet',  11.59,         3070.51),
  (23, '3"',      'PIPE, SMLS, SCH STD, A333 GR 6 BBE',                                                 42.03,          'Feet',  12.80,          537.95),
  (24, '6"',      'PIPE, SMLS, SCH STD, A333 GR 6 BBE',                                                 101.25,         'Feet',  33.56,         3397.84),
  (25, '1/2"',    'PLUG, THRD, HEX HEAD, CL6000 FS, A350 GR LF2 CL1',                                   1,              'Each',  2.13,             2.13),
  (26, '6"',      'SPECTACLE BLIND, RF, CL150 ASME, A516 GR 70N (IMPACT TESTED)',                       1,              'Each',  113.72,         113.72),
  (27, '2"x1"',   'SWAGE, CONC, SCH 80 LE x SCH 80 SE, A333 GR 6 BLE-TSE',                              1,              'Each',  44.67,           44.67),
  (28, '1"x1/2"', 'SWAGE, CONC, SCH 80 LE x SCH 80 SE, A333 GR 6 TBE',                                  1,              'Each',  17.87,           17.87),
  (29, '6"x3"',   'TEE, RED, BW, SCH STD LE x SCH STD SE, A420 GR WPL6',                                1,              'Each',  80.00,           80.00),
  (30, '2"',      'TEE, STR, BW, SCH 80, A420 GR WPL6',                                                 3,              'Each',  11.79,           35.37),
  (31, '6"',      'TEE, STR, BW, SCH STD, A420 GR WPL6',                                                2,              'Each',  93.33,          186.66),
  (32, '1"',      'TEE, STR, THRD, CL3000 FS, A350 GR LF2 CL1',                                         3,              'Each',  17.44,           52.32),
  (33, '1"',      'UNION, THRD, CL3000 FS, A350 GR LF2 CL1',                                            4,              'Each',  14.39,           57.56),
  (34, '1"',      'VALVE, BALL, THRD, RP, CL600, A350 GR LF2 CL1, TAG BAR0622C',                        2,              'Each',  108.53,         217.06),
  (35, '1/2"',    'VALVE, BALL, THRD, RP, CL600, A350 GR LF2 CL1, TAG BAR0622C',                        1,              'Each',  79.96,           79.96),
  (36, '1"',      'VALVE, GLOBE, THRD, CL800 API, A350 GR LF2 CL1, TAG LAR0832C',                       1,              'Each',  77.09,           77.09),
  (37, '6"x1"',   'WELDOLET, SCH 80, A350 GR LF2 CL1',                                                  1,              'Each',  27.52,           27.52),
  (38, '1/2"',    '(4) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM, 69.9mm',                            4,              'Each',  0.63,             2.52),
  (39, '5/8"',    '(4) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM, 82.6mm',                            56,             'Each',  0.99,            55.44),
  (40, '5/8"',    '(4) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM, 95.3mm',                            12,             'Each',  1.10,            13.20),
  (41, '3/4"',    '(8) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM, 101.6mm',                           104,            'Each',  1.63,           169.52),
  (42, '5/8"',    '(8) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM, 114.3mm',                           8,              'Each',  1.14,             9.12),
  (43, '5/8"',    '(8) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM, 120.65mm',                          8,              'Each',  1.19,             9.52)
) as v(line_number, size, description, quantity, uom, unit_cost, amount);

-- ─── PUR-6540-2001318 · Hot Oil Booster · 18 lines · $2,587.48 ──────────────
insert into public.apex_line_items (apex_po_id, line_number, size, description, quantity, uom, unit_cost, amount, lead_time)
select (select id from public.apex_pos where po_number = 'PUR-6540-2001318'),
       v.line_number, v.size, v.description, v.quantity, v.uom, v.unit_cost, v.amount, 'STOCK'
from (values
  (1,  '2"',   'ELBOW, 90 DEG, BW, LR, SCH 80, A420 GR WPL6',                                           4::numeric,     'Each',  5.69::numeric,   22.76::numeric),
  (2,  '4"',   'ELBOW, 90 DEG, BW, LR, SCH STD, A234 GR WPB',                                           6,              'Each',  16.55,           99.30),
  (3,  '2"',   'FLANGE, RF, BLIND, CL150 ASME, A350 GR LF2 CL1',                                        2,              'Each',  12.01,           24.02),
  (4,  '2"',   'FLANGE, RFWN, CL150 ASME, SCH 80 BORE, A350 GR LF2 CL1',                                13,             'Each',  14.83,          192.79),
  (5,  '4"',   'FLANGE, RFWN, CL150 ASME, SCH STD BORE, A105N',                                         2,              'Each',  29.59,           59.18),
  (6,  '6"',   'FLANGE, RFWN, CL150 ASME, SCH STD BORE, A105N',                                         2,              'Each',  48.67,           97.34),
  (7,  '2"',   'GASKET, 3.2mm, CGI, CL150, ASME B16.20, SS 304/GRAPHITE, CS/SS 304 INNER',              7,              'Each',  3.11,            21.77),
  (8,  '4"',   'GASKET, 3.2mm, CGI, CL150, ASME B16.20, SS 304/GRAPHITE, CS/SS 304 INNER',              4,              'Each',  6.80,            27.20),
  (9,  '6"',   'GASKET, 3.2mm, CGI, CL150, ASME B16.20, SS 304/GRAPHITE, CS/SS 304 INNER',              2,              'Each',  9.19,            18.38),
  (10, '2"',   'PIPE, SMLS, SCH 80, A333 GR 6 BBE',                                                     65.32,          'Feet',  11.59,          757.08),
  (11, '2"',   'NIPPLE PIPE, SMLS, SCH 80, A333 GR 6 BOE-TOE',                                          1,              'Each',  11.86,           11.86),
  (12, '4"',   'PIPE, SMLS, SCH STD, A106 GR B BBE',                                                    50.39,          'Feet',  19.46,          980.66),
  (13, '6"x4"','REDUCER, CONC, BW, SCH STD LE x SCH STD SE, A234 GR WPB',                              2,              'Each',  18.77,           37.54),
  (14, '4"',   'SPECTACLE BLIND, RF, CL150 ASME, A516 GR 70N (IMPACT TESTED)',                          2,              'Each',  68.29,          136.58),
  (15, '2"',   'TEE, STR, BW, SCH 80, A420 GR WPL6',                                                    2,              'Each',  11.79,           23.58),
  (16, '5/8"', '(4) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM, 82.6mm',                               32,             'Each',  0.99,            31.68),
  (17, '3/4"', '(8) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM, 107.95mm',                             16,             'Each',  1.70,            27.20),
  (18, '5/8"', '(8) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM, 107.95mm',                             16,             'Each',  1.16,            18.56)
) as v(line_number, size, description, quantity, uom, unit_cost, amount);

-- ─── PUR-6540-2001319 · Fuel Gas Cond · 49 lines · $11,782.86 ───────────────
insert into public.apex_line_items (apex_po_id, line_number, size, description, quantity, uom, unit_cost, amount, lead_time)
select (select id from public.apex_pos where po_number = 'PUR-6540-2001319'),
       v.line_number, v.size, v.description, v.quantity, v.uom, v.unit_cost, v.amount, 'STOCK'
from (values
  (1,  '6"',      'PIPE, SMLS, SCH STD, A333 GR 6 BBE',                                                 37.93::numeric, 'Feet',  33.56::numeric, 1272.81::numeric),
  (2,  '12"',     'PIPE, SMLS, SCH STD, A333 GR 6 BBE',                                                 43.60,          'Feet',  88.73,         3868.84),
  (3,  '1"',      'PLUG, THRD, HEX HEAD, CL6000 FS, A105N',                                             2,              'Each',  2.49,             4.98),
  (4,  '1"',      'PLUG, THRD, HEX HEAD, CL6000 FS, A350 GR LF2 CL1',                                   6,              'Each',  4.06,            24.36),
  (5,  '1"',      'PLUG, THRD, HEX HEAD, CL6000 FS, A350 GR LF2 CL1',                                   2,              'Each',  4.06,             8.12),
  (6,  '1"',      'PLUG, THRD, HEX HEAD, CL6000 FS, A350 GR LF2 CL1',                                   6,              'Each',  4.06,            24.36),
  (7,  '4"x3"',   'REDUCER, ECC, BW, SCH STD LE x SCH STD SE, A234 GR WPB',                             2,              'Each',  12.67,           25.34),
  (8,  '3"x1"',   'SOCKOLET, CL3000 FS, A105N',                                                         2,              'Each',  6.09,            12.18),
  (9,  '12"x1"',  'SOCKOLET, CL3000 FS, A350 GR LF2 CL1',                                               1,              'Each',  9.10,             9.10),
  (10, '2"x1"',   'SOCKOLET, CL3000 FS, A350 GR LF2 CL1',                                               8,              'Each',  20.15,          161.20),
  (11, '3"x1"',   'SOCKOLET, CL3000 FS, A350 GR LF2 CL1',                                               2,              'Each',  9.10,            18.20),
  (12, '4"x1"',   'SOCKOLET, CL3000 FS, A350 GR LF2 CL1',                                               1,              'Each',  9.10,             9.10),
  (13, '6"x1"',   'SOCKOLET, CL3000 FS, A350 GR LF2 CL1',                                               3,              'Each',  9.10,            27.30),
  (14, '2"',      'SPECTACLE BLIND, RF, CL150 ASME, A516 GR 70N (IMPACT TESTED)',                       1,              'Each',  40.55,           40.55),
  (15, '4"',      'SPECTACLE BLIND, RF, CL150 ASME, A516 GR 70N (IMPACT TESTED)',                       1,              'Each',  68.29,           68.29),
  (16, '6"',      'SPECTACLE BLIND, RF, CL150 ASME, A516 GR 70N (IMPACT TESTED)',                       1,              'Each',  113.72,         113.72),
  (17, '12"',     'SPECTACLE BLIND, RF, CL150 ASME, A516 GR 70N (IMPACT TESTED)',                       1,              'Each',  440.24,         440.24),
  (18, '2"',      'SPECTACLE BLIND, RF, CL300 ASME, A516 GR 70N (IMPACT TESTED)',                       1,              'Each',  49.39,           49.39),
  (19, '3"',      'SPECTACLE BLIND, RF, CL300 ASME, A516 GR 70N (IMPACT TESTED)',                       2,              'Each',  57.62,          115.24),
  (20, '2"',      'SPECTACLE BLIND, RF, CL600 ASME, A516 GR 70N (IMPACT TESTED)',                       1,              'Each',  49.39,           49.39),
  (21, '3"',      'SPECTACLE BLIND, RF, CL600 ASME, A516 GR 70N (IMPACT TESTED)',                       1,              'Each',  68.29,           68.29),
  (22, '6"',      'SPECTACLE BLIND, RF, CL600 ASME, A516 GR 70N (IMPACT TESTED)',                       1,              'Each',  236.28,         236.28),
  (23, '2"',      'TEE, STR, BW, SCH 80, A420 GR WPL6',                                                 3,              'Each',  11.79,           35.37),
  (24, '3"',      'TEE, STR, BW, SCH STD, A234 GR WPB',                                                 2,              'Each',  15.44,           30.88),
  (25, '2"x1"',   'THREADOLET, CL3000 FS, A350 GR LF2 CL1',                                             1,              'Each',  16.80,           16.80),
  (26, '1"',      'VALVE, BALL, SWxTHRD, RP, CL1500, A350 GR LF2 CL1, TAG #BAR1532C',                   6,              'Each',  431.97,        2591.82),
  (27, '1"',      'VALVE, BALL, SWxTHRD, RP, CL600, A350 GR LF2 CL1, TAG #BAR0632C',                    9,              'Each',  157.08,        1413.72),
  (28, '1"',      'VALVE, BALL, THRD, RP, CL600, A350 GR LF2 CL1, TAG BAR0622C',                        1,              'Each',  108.53,         108.53),
  (29, '1"',      'VALVE, GATE, SWxTHRD, CL800 API, A105N, TAG #GAR0832B',                              2,              'Each',  74.97,          149.94),
  (30, '1"',      '(12) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM, 177.8mm',                          48,             'Each',  4.17,           200.16),
  (31, '7/8"',    '(12) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM, 120.7mm',                          48,             'Each',  2.61,           125.28),
  (32, '7/8"',    '(12) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM, 146.05mm',                         12,             'Each',  2.74,            32.88),
  (33, '5/8"',    '(4) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM, 82.6mm',                            28,             'Each',  0.99,            27.72),
  (34, '5/8"',    '(4) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM, 95.25mm',                           4,              'Each',  1.10,             4.40),
  (35, '5/8"',    '(8) *CL600* STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM, 108mm',                     8,              'Each',  1.16,             9.28),
  (36, '5/8"',    '(8) *CL300* STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM, 88.9mm',                    8,              'Each',  1.07,             8.56),
  (37, '3/4"',    '(8) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM, 101.6mm',                           32,             'Each',  1.63,            52.16),
  (38, '3/4"',    '(8) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM, 110mm',                             16,             'Each',  1.80,            28.80),
  (39, '3/4"',    '(8) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM, 114.3mm',                           48,             'Each',  1.80,            86.40),
  (40, '3/4"',    '(8) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM, 115mm',                             16,             'Each',  1.80,            28.80),
  (41, '3/4"',    '(8) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM, 127mm',                             8,              'Each',  1.83,            14.64),
  (42, '3/4"',    '(8) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM, 133.35mm',                          24,             'Each',  1.89,            45.36),
  (43, '3/4"',    '(8) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM, 146.05mm',                          8,              'Each',  2.03,            16.24),
  (44, '5/8"',    '(8) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM, 95.3mm',                            24,             'Each',  1.10,            26.40),
  (45, '5/8"',    '(8) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM, 107.95mm',                          8,              'Each',  1.16,             9.28),
  (46, '5/8"',    '(8) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM, 90mm',                              8,              'Each',  1.07,             8.56),
  (47, '5/8"',    '(8) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM, 95.25mm',                           24,             'Each',  1.10,            26.40),
  (48, '5/8"',    '(8) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM, 114.3mm',                           24,             'Each',  1.14,            27.36),
  (49, '5/8"',    '(8) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM, 125mm',                             8,              'Each',  1.23,             9.84)
) as v(line_number, size, description, quantity, uom, unit_cost, amount);

-- ─── PUR-6540-2001320 · Fuel Gas Cond · 48 lines · $13,150.15 ───────────────
insert into public.apex_line_items (apex_po_id, line_number, size, description, quantity, uom, unit_cost, amount, lead_time)
select (select id from public.apex_pos where po_number = 'PUR-6540-2001320'),
       v.line_number, v.size, v.description, v.quantity, v.uom, v.unit_cost, v.amount, 'STOCK'
from (values
  (1,  '2"',      'ELBOW, 45 DEG, BW, LR, SCH 80, A420 GR WPL6',                                        1::numeric,     'Each',  3.51::numeric,    3.51::numeric),
  (2,  '2"',      'ELBOW, 90 DEG, BW, LR, SCH 80, A420 GR WPL6',                                        7,              'Each',  5.69,            39.83),
  (3,  '3"',      'ELBOW, 90 DEG, BW, LR, SCH 80, A420 GR WPL6',                                        2,              'Each',  14.85,           29.70),
  (4,  '6"',      'ELBOW, 90 DEG, BW, LR, SCH 80, A420 GR WPL6',                                        2,              'Each',  78.47,          156.94),
  (5,  '4"',      'ELBOW, 90 DEG, BW, LR, SCH STD, A234 GR WPB',                                        4,              'Each',  16.55,           66.20),
  (6,  '4"',      'ELBOW, 90 DEG, BW, LR, SCH STD, A420 GR WPL6',                                       2,              'Each',  19.43,           38.86),
  (7,  '6"',      'ELBOW, 90 DEG, BW, LR, SCH STD, A420 GR WPL6',                                       2,              'Each',  50.33,          100.66),
  (8,  '12"',     'ELBOW, 90 DEG, BW, LR, SCH STD, A420 GR WPL6',                                       5,              'Each',  270.89,        1354.45),
  (9,  '3"',      'FLANGE, RF, BLIND, CL300 ASME, A105N',                                               2,              'Each',  28.08,           56.16),
  (10, '2"',      'FLANGE, RFWN, CL150 ASME, SCH 80 BORE, A350 GR LF2 CL1',                             11,             'Each',  14.83,          163.13),
  (11, '4"',      'FLANGE, RFWN, CL150 ASME, SCH STD BORE, A350 GR LF2 CL1',                            4,              'Each',  30.08,          120.32),
  (12, '6"',      'FLANGE, RFWN, CL150 ASME, SCH STD BORE, A350 GR LF2 CL1',                            4,              'Each',  61.33,          245.32),
  (13, '12"',     'FLANGE, RFWN, CL150 ASME, SCH STD BORE, A350 GR LF2 CL1',                            6,              'Each',  266.67,        1600.02),
  (14, '2"',      'FLANGE, RFWN, CL300 ASME, SCH 80 BORE, A350 GR LF2 CL1',                             4,              'Each',  18.13,           72.52),
  (15, '3"',      'FLANGE, RFWN, CL300 ASME, SCH STD BORE, A105N',                                      10,             'Each',  32.49,          324.90),
  (16, '4"',      'FLANGE, RFWN, CL300 ASME, SCH STD BORE, A105N',                                      2,              'Each',  45.51,           91.02),
  (17, '2"',      'FLANGE, RFWN, CL600 ASME, SCH 80 BORE, A350 GR LF2 CL1',                             4,              'Each',  24.09,           96.36),
  (18, '3"',      'FLANGE, RFWN, CL600 ASME, SCH 80 BORE, A350 GR LF2 CL1',                             4,              'Each',  40.03,          160.12),
  (19, '6"',      'FLANGE, RFWN, CL600 ASME, SCH 80 BORE, A350 GR LF2 CL1',                             6,              'Each',  193.33,        1159.98),
  (20, '2"',      'GASKET, 3.2mm, CGI, CL150, ASME B16.20, SS 304/GRAPHITE, CS/SS 304 INNER',           9,              'Each',  3.11,            27.99),
  (21, '4"',      'GASKET, 3.2mm, CGI, CL150, ASME B16.20, SS 304/GRAPHITE, CS/SS 304 INNER',           5,              'Each',  6.80,            34.00),
  (22, '6"',      'GASKET, 3.2mm, CGI, CL150, ASME B16.20, SS 304/GRAPHITE, CS/SS 304 INNER',           5,              'Each',  9.19,            45.95),
  (23, '12"',     'GASKET, 3.2mm, CGI, CL150, ASME B16.20, SS 304/GRAPHITE, CS/SS 304 INNER',           6,              'Each',  19.90,          119.40),
  (24, '2"',      'GASKET, 3.2mm, CGI, CL300, ASME B16.20, SS 304/GRAPHITE, CS/SS 304 INNER',           6,              'Each',  3.63,            21.78),
  (25, '3"',      'GASKET, 3.2mm, CGI, CL300, ASME B16.20, SS 304/GRAPHITE, CS/SS 304 INNER',           11,             'Each',  5.46,            60.06),
  (26, '4"',      'GASKET, 3.2mm, CGI, CL300, ASME B16.20, SS 304/GRAPHITE, CS/SS 304 INNER',           2,              'Each',  8.10,            16.20),
  (27, '2"',      'GASKET, 3.2mm, CGI, CL600, ASME B16.20, SS 304/GRAPHITE, CS/SS 304 INNER',           6,              'Each',  3.63,            21.78),
  (28, '3"',      'GASKET, 3.2mm, CGI, CL600, ASME B16.20, SS 304/GRAPHITE, CS/SS 304 INNER',           5,              'Each',  5.46,            27.30),
  (29, '6"',      'GASKET, 3.2mm, CGI, CL600, ASME B16.20, SS 304/GRAPHITE, CS/SS 304 INNER',           6,              'Each',  11.26,           67.56),
  (30, '2"',      'GLE C-01 PIPE CLAMP',                                                                4,              'Each',  173.50,         694.00),
  (31, '3"',      'GLE C-01 PIPE CLAMP',                                                                1,              'Each',  185.46,         185.46),
  (32, '4"',      'GLE C-01 PIPE CLAMP',                                                                3,              'Each',  148.11,         444.33),
  (33, '6"',      'GLE C-01 PIPE CLAMP',                                                                2,              'Each',  166.46,         332.92),
  (34, '4"',      'GLE G-01 PIPE GUIDE',                                                                3,              'Each',  14.14,           42.42),
  (35, '3"',      'GLE G-03 PIPE GUIDE',                                                                1,              'Each',  17.85,           17.85),
  (36, '6"',      'GLE G-04 PIPE GUIDE',                                                                1,              'Each',  24.89,           24.89),
  (37, '12"',     'GLE G-05 PIPE GUIDE',                                                                1,              'Each',  43.49,           43.49),
  (38, '1"',      'NIPPLE, SMLS, SCH 80, A106 GR B PBE (100mm)',                                        2,              'Each',  7.51,            15.02),
  (39, '1"',      'NIPPLE, SMLS, SCH 80, A333 GR 6 PBE (100mm)',                                        13,             'Each',  7.51,            97.63),
  (40, '1"',      'NIPPLE, SMLS, SCH 80, A333 GR 6 TBE (100mm)',                                        1,              'Each',  6.61,             6.61),
  (41, '1 1/2"',  'PIPE, SMLS, SCH 160, A333 GR 6 PBE',                                                 2.07,           'Feet',  12.80,           26.46),
  (42, '2"',      'PIPE, SMLS, SCH 80, A333 GR 6 BBE',                                                  86.78,          'Feet',  11.59,         1005.76),
  (43, '3"',      'PIPE, SMLS, SCH 80, A333 GR 6 BBE',                                                  32.41,          'Feet',  18.48,          599.02),
  (44, '6"',      'PIPE, SMLS, SCH 80, A333 GR 6 BBE',                                                  34.15,          'Feet',  51.13,         1746.27),
  (45, '3"',      'PIPE, SMLS, SCH STD, A106 GR B BBE',                                                 6.07,           'Feet',  13.66,           82.91),
  (46, '4"',      'PIPE, SMLS, SCH STD, A106 GR B BBE',                                                 38.75,          'Feet',  19.46,          754.01),
  (47, '3"',      'PIPE, SMLS, SCH STD, A333 GR 6 BBE',                                                 2.62,           'Feet',  12.80,           33.60),
  (48, '4"',      'PIPE, SMLS, SCH STD, A333 GR 6 BBE',                                                 34.71,          'Feet',  19.46,          675.48)
) as v(line_number, size, description, quantity, uom, unit_cost, amount);

-- ─── PUR-6540-2001322 · HP-LP FKOD · 43 lines · $41,815.78 ──────────────────
insert into public.apex_line_items (apex_po_id, line_number, size, description, quantity, uom, unit_cost, amount, lead_time)
select (select id from public.apex_pos where po_number = 'PUR-6540-2001322'),
       v.line_number, v.size, v.description, v.quantity, v.uom, v.unit_cost, v.amount, 'STOCK'
from (values
  (1,  '6"',      'ELBOW, 45 DEG, BW, LR, SCH STD, A420 GR WPL6',                                       1::numeric,     'Each',  44.00::numeric,  44.00::numeric),
  (2,  '24"',     'ELBOW, 45 DEG, BW, LR, SCH STD, A420 GR WPL6',                                       1,              'Each',  1066.67,       1066.67),
  (3,  '2"',      'ELBOW, 90 DEG, BW, LR, SCH 80, A420 GR WPL6',                                        27,             'Each',  5.69,           153.63),
  (4,  '3"',      'ELBOW, 90 DEG, BW, LR, SCH STD, A420 GR WPL6',                                       6,              'Each',  14.60,           87.60),
  (5,  '6"',      'ELBOW, 90 DEG, BW, LR, SCH STD, A420 GR WPL6',                                       5,              'Each',  50.33,          251.65),
  (6,  '24"',     'ELBOW, 90 DEG, BW, LR, SCH STD, A420 GR WPL6',                                       2,              'Each',  1600.00,       3200.00),
  (7,  '1"',      'ELBOW, 90 DEG, THRD, CL3000 FS, A350 GR LF2 CL1',                                    10,             'Each',  13.64,          136.40),
  (8,  '2"',      'FLANGE, RFWN, CL150 ASME, SCH 80 BORE, A350 GR LF2 CL1',                             10,             'Each',  14.83,          148.30),
  (9,  '3"',      'FLANGE, RFWN, CL150 ASME, SCH STD BORE, A350 GR LF2 CL1',                            8,              'Each',  22.09,          176.72),
  (10, '6"',      'FLANGE, RFWN, CL150 ASME, SCH STD BORE, A350 GR LF2 CL1',                            10,             'Each',  61.33,          613.30),
  (11, '24"',     'FLANGE, RFWN, CL150 ASME, SCH STD BORE, A350 GR LF2 CL1',                            10,             'Each',  1000.00,      10000.00),
  (12, '2"',      'GASKET, 3.2mm, CGI, CL150, ASME B16.20, SS 304/GRAPHITE, CS/SS 304 INNER',           12,             'Each',  3.11,            37.32),
  (13, '3"',      'GASKET, 3.2mm, CGI, CL150, ASME B16.20, SS 304/GRAPHITE, CS/SS 304 INNER',           4,              'Each',  5.60,            22.40),
  (14, '6"',      'GASKET, 3.2mm, CGI, CL150, ASME B16.20, SS 304/GRAPHITE, CS/SS 304 INNER',           8,              'Each',  9.19,            73.52),
  (15, '24"',     'GASKET, 3.2mm, CGI, CL150, ASME B16.20, SS 304/GRAPHITE, CS/SS 304 INNER',           10,             'Each',  49.50,          495.00),
  (16, '1 1/2"',  'GLE C-01 PIPE CLAMP',                                                                2,              'Each',  56.41,          112.82),
  (17, '2"',      'GLE C-01 PIPE CLAMP',                                                                1,              'Each',  173.50,         173.50),
  (18, '1 1/2"',  'GLE G-01 PIPE GUIDE',                                                                1,              'Each',  14.14,           14.14),
  (19, '1 1/2"',  'GLE G-06 PIPE GUIDE',                                                                2,              'Each',  1.46,             2.92),
  (20, '1"',      'NIPPLE, SMLS, SCH 80, A333 GR 6 POE-TOE (100mm)',                                    1,              'Each',  6.29,             6.29),
  (21, '1"',      'NIPPLE, SMLS, SCH 80, A333 GR 6 TBE (100mm)',                                        11,             'Each',  6.61,            72.71),
  (22, '1"',      'PIPE, SMLS, SCH 160, A333 GR 6 TBE',                                                 10.83,          'Feet',  6.60,            71.46),
  (23, '1"',      'PIPE, SMLS, SCH 80, A333 GR 6 TBE',                                                  80.77,          'Feet',  5.59,           451.53),
  (24, '1 1/2"',  'PIPE, SMLS, SCH 80, A333 GR 6 BBE',                                                  18.04,          'Feet',  7.18,           129.56),
  (25, '2"',      'PIPE, SMLS, SCH 80, A333 GR 6 BBE',                                                  157.97,         'Feet',  11.59,         1830.90),
  (26, '3"',      'PIPE, SMLS, SCH STD, A333 GR 6 BBE',                                                 58.66,          'Feet',  12.80,          750.87),
  (27, '6"',      'PIPE, SMLS, SCH STD, A333 GR 6 BBE',                                                 54.72,          'Feet',  33.56,         1836.55),
  (28, '24"',     'PIPE, SMLS, SCH STD, A333 GR 6 BBE',                                                 38.09,          'Feet',  292.68,       11148.34),
  (29, '1"',      'PLUG, THRD, HEX HEAD, CL6000 FS, A350 GR LF2 CL1',                                   2,              'Each',  4.06,             8.12),
  (30, '24"',     'SPACER PADDLE W/ BLIND PADDLE, RF, CL150 ASME, A516 GR 70N (IMPACT TESTED)',         2,              'Each',  2274.39,       4548.78),
  (31, '2"x1"',   'SWAGE, CONC, SCH 80 LE x SCH 80 SE, A333 GR 6 BLE-TSE',                              2,              'Each',  44.67,           89.34),
  (32, '1"x1/2"', 'SWAGE, CONC, SCH 80 LE x SCH 80 SE, A333 GR 6 TBE',                                  1,              'Each',  17.87,           17.87),
  (33, '1"',      'TEE, STR, THRD, CL3000 FS, A350 GR LF2 CL1',                                         2,              'Each',  17.44,           34.88),
  (34, '1"',      'UNION, THRD, CL3000 FS, A350 GR LF2 CL1',                                            1,              'Each',  14.39,           14.39),
  (35, '1"',      'UNION, THRD, CL6000 FS, A350 GR LF2 CL1',                                            4,              'Each',  31.89,          127.56),
  (36, '1"',      'VALVE, BALL, THRD, FP, CL1500, A350 GR LF2 CL1, TAG #BAF1532C',                      4,              'Each',  389.84,        1559.36),
  (37, '1"',      'VALVE, BALL, THRD, RP, CL600, A350 GR LF2 CL1, TAG #BAR0622C',                       6,              'Each',  108.53,         651.18),
  (38, '1/2"',    'VALVE, BALL, THRD, RP, CL600, A350 GR LF2 CL1, TAG #BAR0622C',                       1,              'Each',  79.96,           79.96),
  (39, '1 1/4"',  '(20) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM, 177.8mm',                          120,            'Each',  9.10,          1092.00),
  (40, '1 1/4"',  '(20) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM, 203.2mm',                          40,             'Each',  7.87,           314.80),
  (41, '5/8"',    '(4) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM, 82.6mm',                            48,             'Each',  0.99,            47.52),
  (42, '5/8"',    '(4) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM, 95.3mm',                            16,             'Each',  1.10,            17.60),
  (43, '3/4"',    '(8) STUD BOLTS W/ NUTS, A193 GR B7M/A194 GR 2HM, 101.6mm',                           64,             'Each',  1.63,           104.32)
) as v(line_number, size, description, quantity, uom, unit_cost, amount);

commit;

-- =============================================================================
-- Verification — run after commit.
-- =============================================================================
--   select p.po_number,
--          p.ewp,
--          count(l.*)                              as lines,
--          sum(l.amount)::numeric(14,2)            as sum_of_lines,
--          p.total_amount                          as po_total,
--          sum(l.amount)::numeric(14,2) - p.total_amount as diff
--     from public.apex_pos p
--     left join public.apex_line_items l on l.apex_po_id = p.id
--    group by p.po_number, p.ewp, p.total_amount
--    order by p.po_number;
--
-- Expected: 7 rows, diff = 0.00 for every row.
-- Grand total across all 7 POs: 295 lines · $96,900.68

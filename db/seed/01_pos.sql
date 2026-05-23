-- ============================================================
-- Seed: Service POs (33 total — 7 active + 26 reference)
-- Active = has at least one ticket (added in 02_*).
-- ============================================================

begin;

insert into public.service_pos
  (po_number, vendor_legal_name, vendor_display_name, task_wbs, scope, committed_amount, ap_invoiced_amount)
values
  -- ---------- Active POs (7) ----------
  ('PUR-6540-2001219', 'GOLDEN BASE CONTRACTING LTD',         'Golden Base',
   'NAEP - Grading EWP',
   'ACGS Facility Civil Grading — mob/demob, survey, topsoil, clay, gravel',
   1357626.69, 0),
  ('PUR-6540-2000868', 'SUREPOINT TECHNOLOGIES GROUP LTD',    'Surepoint',
   '04.P1.W.DEM.197',
   'NAEP Demolition Electrical — Removal of 9 Junction Boxes & EHT',
   103250.00, 49348.86),
  ('PUR-6540-2001181', 'SUREPOINT TECHNOLOGIES GROUP LTD',    'Surepoint',
   '04.P1.W.WMI.299',
   'EWP-06 Tie Breaker Installation — Labour, equipment, materials',
   79595.00, 0),
  ('PUR-6540-2001227', 'ENERGETIC SERVICES INC',              'Energetic Svcs',
   '04.P1.W.CST.133',
   'Hydrovac services — piling & sight holes at ACGS',
   1800000.00, 0),
  ('PUR-6540-2001226', 'ALBRIGHT FLUSH SYSTEMS LTD',          'Albright Flush',
   '04.P1.W.CST.122',
   'Waste fluid processing & disposal — vac truck loads from ACGS hydrovac',
   950000.00, 0),
  ('PUR-6540-2000898', 'VECTOR GEOMATICS LAND SURVEYING LTD', 'Vector Geomatics',
   '04.P1.W.WMI.244',
   'Land surveying — lease area, reflag, control network at 44-L/94-A-13',
   715730.00, 0),
  ('PUR-6540-2000896', 'VECTOR GEOMATICS LAND SURVEYING LTD', 'Vector Geomatics',
   '05.CO.W.WMI.244',
   'Land surveying — Aitken Creek c-A20-D / 94-H-4 surface locations',
   90830.00, 0),

  -- ---------- Reference POs (26) ----------
  ('PUR-6540-2001084', 'GAS LIQUIDS ENGINEERING LTD',          'Gas Liquids Eng',    null, null, 5000000.00, 0),
  ('PUR-6540-2001041', 'ALCO ENERGY SOLUTIONS LTD',            'Alco Energy',        null, null, 4255599.00, 0),
  ('PUR-6540-2001217', 'GREAT NORTHERN BRIDGEWORKS LTD',       'Great Northern',     null, null, 2581442.36, 0),
  ('PUR-6540-2000883', 'XCEL AUTOMATION LTD',                  'Xcel Automation',    null, null, 2430807.00, 0),
  ('PUR-6540-2001171', 'SURELINE PROJECTS INC',                'Sureline',           null, null,  888404.10, 0),
  ('PUR-6540-2001224', 'MEDALLION ENERGY SERVICES INC',        'Medallion Energy',   null, null,  856100.10, 0),
  ('PUR-6540-2001134', 'XCEL AUTOMATION LTD',                  'Xcel Automation',    null, null,  749840.00, 0),
  ('PUR-6540-2000884', 'SURELINE PROJECTS INC',                'Sureline',           null, null,  679490.00, 0),
  ('PUR-6540-2001029', 'CCI INC',                              'CCI',                null, null,  522825.00, 0),
  ('PUR-6540-2000899', 'CCI INC',                              'CCI',                null, null,  373955.00, 0),
  ('PUR-6540-2001098', 'ACUREN GROUP INC',                     'Acuren',             null, null,  331402.00, 0),
  ('PUR-6540-2000943', 'SURELINE PROJECTS INC',                'Sureline',           null, null,  257147.13, 0),
  ('PUR-6540-2000893', 'ENERGETIC SERVICES INC',               'Energetic Svcs',     null, null,  237060.00, 0),
  ('PUR-6540-2001190', 'XCEL AUTOMATION LTD',                  'Xcel Automation',    null, null,  225328.98, 0),
  ('PUR-6540-2000820', 'LANDSONG HERITAGE CONSULTING LTD',     'Landsong Heritage',  null, null,  180000.00, 0),
  ('PUR-6540-2000889', 'TRISTAR RESOURCE MANAGEMENT LTD',      'Tristar',            null, null,  171364.33, 0),
  ('PUR-6540-2000841', 'STANTEC CONSULTING LTD',               'Stantec',            null, null,  140621.84, 0),
  ('PUR-6540-2000897', 'VECTOR GEOMATICS LAND SURVEYING LTD',  'Vector Geomatics',   null, null,  124545.00, 0),
  ('PUR-6540-2001167', 'LAPRAIRIE CRANE',                      'LaPrairie Crane',    null, null,  111030.00, 0),
  ('PUR-6540-2000876', 'SLR CONSULTING CANADA LTD',            'SLR Consulting',     null, null,  109500.00, 0),
  ('PUR-6540-2000894', 'ALBRIGHT FLUSH SYSTEMS LTD',           'Albright Flush',     null, null,   93000.00, 0),
  ('PUR-6540-2001164', 'MAXWELL MEDIATION AND CONSULTING INC', 'Maxwell Mediation',  null, null,   60480.00, 0),
  ('PUR-6540-2000931', 'PROSPECT LAND SERVICES BC LTD',        'Prospect Land',      null, null,   29398.79, 0),
  ('PUR-6540-2000851', 'WSP CANADA INC',                       'WSP',                null, null,   15555.00, 0),
  ('PUR-6540-2001046', 'OPENCYCLE TECHNOLOGIES INC',           'Opencycle',          null, null,   12000.00, 0),
  ('PUR-6540-2001067', 'ALTEC INSPECTION LTD',                 'Altec Inspection',   null, null,    8500.00, 0);

commit;

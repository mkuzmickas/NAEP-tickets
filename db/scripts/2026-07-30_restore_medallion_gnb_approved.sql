-- =============================================================================
-- 2026-07-30 — Restore Medallion Energy + Great Northern Bridgeworks tickets
-- to approved state
-- =============================================================================
-- Both vendors' Vendor Detail cards flipped to red after an earlier tightening
-- of the chip-colour rule; this script re-marks the tickets Mike + the vendor
-- had previously reconciled as approved.
--
-- Sources:
--   Medallion — Jul 28, 2026 Vendor Snapshot PDF (all 23 tickets approved).
--   GNB       — GNB screenshot showing 43 tickets as approved (BASELINE
--               plus 26-2-1584-7 through 26-2-1584-48); the 10 tickets from
--               -49 through -58 are already correctly green in the portal
--               and are NOT touched by this script.
--
-- Sets BOTH:
--   status          = 'invoiced'          -- drives Vendor Detail chips
--   approval_status = 'Approved by Client/PM'  -- drives the strict Ticket
--                                                 Map rule per spec §3.2
-- Idempotent — re-running is a no-op for rows already in this state.
-- =============================================================================

-- Medallion Energy — 23 tickets across 4 POs (2001304 has 0 tickets).
update public.tickets
set status = 'invoiced',
    approval_status = 'Approved by Client/PM'
where ticket_number in (
  -- PUR-6540-2001224 · Buried Utilities (EWP-11)  (19 tickets)
  '84764','85205','86000','86034','86067','86175','86176','86138',
  '86438','86547','86567','86566','86570','86576','87370','87363',
  '87387','87371','87393',
  -- PUR-6540-2001282 · Pre-Work Engineering       (3 tickets)
  '85023','85204','86267',
  -- PUR-6540-2001303 · Start Air Skid (EWP-04)    (1 ticket)
  '87708-EC'
);
-- Expected: 23 rows updated.

-- Great Northern Bridgeworks — 43 tickets on PUR-6540-2001217, matching
-- the previously-agreed Vendor Detail state (BASELINE + 26-2-1584-7..48).
update public.tickets
set status = 'invoiced',
    approval_status = 'Approved by Client/PM'
where ticket_number in (
  '26-2-1584-BASELINE',
  '26-2-1584-7',  '26-2-1584-8',  '26-2-1584-9',  '26-2-1584-10',
  '26-2-1584-11', '26-2-1584-12', '26-2-1584-13', '26-2-1584-14', '26-2-1584-15',
  '26-2-1584-16', '26-2-1584-17', '26-2-1584-18', '26-2-1584-19', '26-2-1584-20',
  '26-2-1584-21', '26-2-1584-22', '26-2-1584-23', '26-2-1584-24', '26-2-1584-25',
  '26-2-1584-26', '26-2-1584-27', '26-2-1584-28', '26-2-1584-29', '26-2-1584-30',
  '26-2-1584-31', '26-2-1584-32', '26-2-1584-33', '26-2-1584-34', '26-2-1584-35',
  '26-2-1584-36', '26-2-1584-37', '26-2-1584-38', '26-2-1584-39', '26-2-1584-40',
  '26-2-1584-41', '26-2-1584-42', '26-2-1584-43', '26-2-1584-44', '26-2-1584-45',
  '26-2-1584-46', '26-2-1584-47', '26-2-1584-48'
);
-- Expected: 43 rows updated.

-- Verification query — run afterwards to eyeball counts on the two vendors.
--   select
--     p.vendor_display_name,
--     p.po_number,
--     count(*) filter (where t.status = 'invoiced') as approved,
--     count(*) filter (where t.status = 'pending')  as pending
--   from public.service_pos p
--   join public.tickets t on t.po_id = p.id
--   where p.vendor_display_name in ('Medallion Energy','Great Northern')
--   group by p.vendor_display_name, p.po_number
--   order by p.vendor_display_name, p.po_number;

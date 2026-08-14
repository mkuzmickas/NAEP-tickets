-- =============================================================================
-- 2026-08-04 — Medallion CO 1180-C-ENB-TM-EI-CO-02 Rev 0 · +$5,700.00
-- =============================================================================
-- PO PUR-6540-2001303 (Medallion Energy — Start Air Skid, EWP-04).
--
--   Change type     : T&M
--   Root cause      : Other
--   Topic           : Welding and Materials
--   Schedule impact : Yes (0 days impacted)
--   Labour & Equip  : $2,474.00
--   Materials       : $3,226.00
--   Total           : $5,700.00
--   Originator      : Kyle Reid
--   Attention to PM : Jade Rowe
--   Issued          : 2026-08-04
--   Approved        : 2026-08-14 (Jade Rowe)
--
-- Idempotent: the WHERE clause excludes the PO if this CO number is already
-- in the notes column, so a re-paste is a no-op (UPDATE 0).
-- =============================================================================

update public.service_pos
set committed_amount = committed_amount + 5700.00,
    notes = coalesce(notes || E'\n', '') ||
            '2026-08-04: CO 1180-C-ENB-TM-EI-CO-02 Rev 0 · +$5,700.00 (L&E $2,474.00 + Materials $3,226.00) · Welding and Materials · Other root cause · Originator Kyle Reid · PM Jade Rowe · Schedule impact 0 days · Approved 2026-08-14'
where po_number = 'PUR-6540-2001303'
  and (notes is null or notes not like '%1180-C-ENB-TM-EI-CO-02%');
-- Expected: UPDATE 1 (or UPDATE 0 on a re-run).

-- Verify:
--   select po_number, vendor_display_name, committed_amount, notes
--     from public.service_pos
--    where po_number = 'PUR-6540-2001303';
--   Expected committed_amount: $25,713.44 + $5,700.00 = $31,413.44

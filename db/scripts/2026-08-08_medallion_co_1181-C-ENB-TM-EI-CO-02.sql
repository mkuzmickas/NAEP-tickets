-- =============================================================================
-- 2026-08-08 — Medallion CO 1181-C-ENB-TM-EI-CO-02 Rev 0 · +$67,385.00
-- =============================================================================
-- PO PUR-6540-2001304 (Medallion Energy — North South Rack, EWP-08).
--
--   Change type     : T&M
--   Root cause      : Engineering
--   Topic           : Scope Advancement
--   Schedule impact : No (0 days)
--   Labour & Equip  : $33,179.00
--   Materials       : $34,206.00
--   Total           : $67,385.00
--   Attention to PM : Jade Rowe
--   Issued          : 2026-08-08
--
-- Idempotent: the WHERE clause excludes the PO if the CO number is already
-- in the notes column, so a re-paste is a no-op (UPDATE 0).
-- =============================================================================

update public.service_pos
set committed_amount = committed_amount + 67385.00,
    notes = coalesce(notes || E'\n', '') ||
            '2026-08-08: CO 1181-C-ENB-TM-EI-CO-02 Rev 0 · +$67,385.00 (L&E $33,179.00 + Materials $34,206.00) · Scope Advancement · Engineering root cause · PM Jade Rowe · No schedule impact'
where po_number = 'PUR-6540-2001304'
  and (notes is null or notes not like '%1181-C-ENB-TM-EI-CO-02%');
-- Expected: UPDATE 1 (or UPDATE 0 on a re-run).

-- Verify:
--   select po_number, vendor_display_name, committed_amount, notes
--     from public.service_pos
--    where po_number = 'PUR-6540-2001304';
--   Expected committed_amount: $35,246.83 + $67,385.00 = $102,631.83

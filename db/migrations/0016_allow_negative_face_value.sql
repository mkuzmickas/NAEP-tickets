-- =============================================================================
-- 0016: Allow negative face_value on tickets (credit tickets from Sureline)
-- =============================================================================
-- Sureline's authoritative ticket feed includes a small number of credit
-- tickets — e.g. SL26-047-TS-35 (-$4,900.00) and SL26-101-000-096
-- (-$12,818.16) — that are legitimate refunds against a prior overcharge.
-- The original 0001 migration inlined `check (face_value >= 0)` on the
-- tickets table; drop it so those rows can land. Dashboard sums handle
-- negatives naturally.
--
-- computed_total has no equivalent check; nothing else to touch.
-- =============================================================================

alter table public.tickets drop constraint if exists tickets_face_value_check;

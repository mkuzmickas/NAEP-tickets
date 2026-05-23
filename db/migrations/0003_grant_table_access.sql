-- ============================================================
-- Fix: GRANT direct table access to the authenticated role.
-- ============================================================
-- Migrations 0001/0002 enabled RLS on the public tables but did NOT
-- explicitly grant table-level CRUD privileges to the authenticated role.
-- Views (v_active_po_summary, v_po_reference) work because they run with
-- the view-owner's privileges and were explicitly granted in 0002.
-- Direct table queries (supabase.from('tickets').select(...)) need both
-- the GRANT and the RLS policy. Adding the missing GRANTs here.
-- ============================================================

grant usage on schema public to authenticated;

grant select, insert, update, delete on public.service_pos  to authenticated;
grant select, insert, update, delete on public.tickets      to authenticated;
grant select, insert, update, delete on public.line_items   to authenticated;
grant select, insert, update, delete on public.bol_registry to authenticated;

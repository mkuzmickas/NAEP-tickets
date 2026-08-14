-- =============================================================================
-- 2026-08-14 — Fix "permission denied for table apex_pos" on /pvf
-- =============================================================================
-- Migration 0017 created the tables and RLS policies, but the PostgREST-facing
-- roles (anon, authenticated) never received table-level SELECT/INSERT/UPDATE/
-- DELETE grants. Supabase usually auto-grants those but not in this project's
-- case — so /pvf 500'd with "permission denied for table apex_pos" even though
-- the tables exist and RLS policies allow read.
--
-- Idempotent — GRANT is a no-op if the privileges are already there.
-- =============================================================================

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete
  on public.apex_pos, public.apex_line_items
  to anon, authenticated;

-- Verify:
--   select grantee, privilege_type
--   from information_schema.role_table_grants
--   where table_schema = 'public'
--     and table_name in ('apex_pos', 'apex_line_items')
--     and grantee in ('anon', 'authenticated')
--   order by table_name, grantee, privilege_type;

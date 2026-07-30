-- =============================================================================
-- 0015: sync_job_tickets — atomic per-job DELETE-then-INSERT for CSV imports
-- =============================================================================
-- The Aimsio "Office Approval Status" CSV import used to loop row-by-row and
-- upsert by exact ticket_number, so a job's rows in the tracker never dropped
-- back to the CSV's row count when Sureline revised an export downward.
-- Ticket counts ballooned (stale rows from earlier exports survived) and
-- stalled (a new upload's per-row upsert never touched rows sitting on the
-- wrong PO).
--
-- This function makes the whole import atomic per job. Inside one transaction:
--   1. DELETE every ticket_number in the tickets table that belongs to this
--      job — matches both the normalized `SL26-101-000-001` form AND any
--      date-prefixed variant like `06-03-SL26-101-000-001`.
--   2. INSERT the JSONB array of ticket rows the app passes in — already
--      normalized (date prefix stripped), deduped by collision, Void-filtered,
--      and status-translated by the app.
--
-- Returns the two counts so the API can echo them back in the import summary
-- and the /upload UI can render before/after numbers.
--
-- SECURITY DEFINER so the whole atomic replace runs with owner privileges;
-- the RPC does its own SL26-NNN prefix validation up front so a bad p_job_prefix
-- can never wipe the tickets table.
-- =============================================================================

create or replace function public.sync_job_tickets(
  p_job_prefix text,
  p_po_id uuid,
  p_tickets jsonb,
  p_created_by uuid
) returns table(deleted_count int, inserted_count int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted int;
  v_inserted int;
begin
  -- Belt-and-braces: only allow the exact SL26-NNN shape. A bug in the app
  -- can never wipe the entire tickets table with '%' or '_' LIKE wildcards.
  if p_job_prefix is null or p_job_prefix !~ '^SL26-\d{3}$' then
    raise exception 'sync_job_tickets: prefix must match SL26-NNN, got %', p_job_prefix;
  end if;
  if p_po_id is null then
    raise exception 'sync_job_tickets: p_po_id is required';
  end if;

  -- Step 1: DELETE every ticket_number that carries this job prefix, whether
  -- it was stored normalized (SL26-101-000-001) or with an Aimsio date prefix
  -- (06-03-SL26-101-000-001). Line items and bol_registry cascade. Runs
  -- regardless of which po_id the ticket currently sits on — that's the
  -- whole point: strays on the wrong PO get cleared too.
  delete from public.tickets
  where ticket_number like '%' || p_job_prefix || '-%';
  get diagnostics v_deleted = row_count;

  -- Step 2: INSERT the array. Fields the caller populates on each element:
  --   ticket_number      normalized SL26-NNN-NNN-NNN form
  --   ticket_date        ISO YYYY-MM-DD
  --   face_value         numeric (rounded, non-negative)
  --   status             'pending' | 'invoiced'
  --   approval_status    Aimsio 'Office Approval Status' verbatim, or ''
  --   ewp_no             int as string, or '' for unassigned
  insert into public.tickets (
    po_id, ticket_number, ticket_date, source_type, is_master,
    face_value, computed_total, reconciled, status,
    approval_status, ewp_no, created_by
  )
  select
    p_po_id,
    (r->>'ticket_number'),
    (r->>'ticket_date')::date,
    'aimsio_status',
    false,
    (r->>'face_value')::numeric,
    (r->>'face_value')::numeric,
    true,
    (r->>'status'),
    nullif(r->>'approval_status', ''),
    nullif(r->>'ewp_no', '')::int,
    p_created_by
  from jsonb_array_elements(p_tickets) r;
  get diagnostics v_inserted = row_count;

  return query select v_deleted, v_inserted;
end;
$$;

grant execute on function public.sync_job_tickets(text, uuid, jsonb, uuid) to authenticated;

-- =============================================================================
-- 0013: Ticket approval status + EWP roll-up, plus a new 'aimsio_status' source
-- =============================================================================
-- Adds the two columns the SureLine-style Ticket Map + Aimsio CSV import need,
-- and relaxes two ticket constraints so a ticket imported from the Aimsio
-- "Office Approval Status" export (which has no line items, just a total) can
-- live in the tickets table alongside PDF-parsed field tickets.
--
-- Distinct concepts:
--   tickets.status           - internal invoicing state (pending/invoiced/rejected)
--   tickets.approval_status  - client-side approval string from Aimsio, verbatim
--                              (drives green/red on the Ticket Map)
-- =============================================================================

-- Client-side approval (Aimsio 'Office Approval Status' column, verbatim).
alter table public.tickets add column if not exists approval_status text;

-- EWP this ticket rolls up to. Used to break PO 2001285 into sub-buckets on
-- the Ticket Map. Null = uncoded (renders in the 'Unassigned to EWP' box).
alter table public.tickets add column if not exists ewp_no int;

-- 'aimsio_status' = a status-only ticket imported from the CSV. No line items,
-- face_value trusted directly from the Aimsio total, marked reconciled so it
-- clears the "must reconcile unless rejected" rule.
alter table public.tickets drop constraint if exists tickets_master_consistency;
alter table public.tickets drop constraint if exists tickets_must_reconcile_unless_rejected;

alter table public.tickets
  drop constraint if exists tickets_source_type_check,
  add constraint tickets_source_type_check
    check (source_type in ('field_ticket','bol','invoice','master_ticket','aimsio_status'));

alter table public.tickets add constraint tickets_master_consistency check (
  (is_master = true and source_type = 'master_ticket')
  or (is_master = false and source_type in ('field_ticket','bol','invoice','aimsio_status'))
);

alter table public.tickets add constraint tickets_must_reconcile_unless_rejected check (
  reconciled = true or status = 'rejected' or source_type = 'aimsio_status'
);

-- Helpful lookup index for the "colour by approval" + EWP grouping queries.
create index if not exists tickets_approval_status_idx on public.tickets (approval_status);
create index if not exists tickets_ewp_no_idx on public.tickets (ewp_no) where ewp_no is not null;

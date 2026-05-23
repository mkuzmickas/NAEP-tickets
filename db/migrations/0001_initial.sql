-- ============================================================
-- NAEP Field Cost Tracker — Initial Schema
-- Aitken Creek Expansion (Project 30006386)
-- Service POs only. All amounts pre-tax (GST excluded).
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- service_pos
-- ------------------------------------------------------------
create table public.service_pos (
  id                   uuid primary key default gen_random_uuid(),
  po_number            text not null unique,
  vendor_legal_name    text not null,
  vendor_display_name  text not null,
  task_wbs             text,
  scope                text,
  committed_amount     numeric(14,2) not null check (committed_amount >= 0),
  ap_invoiced_amount   numeric(14,2) not null default 0 check (ap_invoiced_amount >= 0),
  notes                text,
  created_at           timestamptz not null default now()
);

create index service_pos_vendor_display_idx on public.service_pos(vendor_display_name);

-- ------------------------------------------------------------
-- tickets
-- ------------------------------------------------------------
create table public.tickets (
  id                  uuid primary key default gen_random_uuid(),
  po_id               uuid not null references public.service_pos(id) on delete restrict,
  ticket_number       text not null unique,
  ticket_date         date not null,
  source_type         text not null check (source_type in ('field_ticket','bol','invoice','master_ticket')),
  is_master           boolean not null default false,
  face_value          numeric(14,2) not null check (face_value >= 0),
  computed_total      numeric(14,2) not null default 0,
  reconciled          boolean not null default false,
  status              text not null default 'pending' check (status in ('pending','invoiced','rejected')),
  pdf_storage_path    text,
  markup_notes        text,
  created_at          timestamptz not null default now(),
  created_by          uuid references auth.users(id),
  constraint tickets_master_consistency check (
    (is_master = true and source_type = 'master_ticket')
    or (is_master = false and source_type in ('field_ticket','bol','invoice'))
  ),
  constraint tickets_must_reconcile_unless_rejected check (
    reconciled = true or status = 'rejected'
  )
);

create index tickets_po_idx on public.tickets(po_id);
create index tickets_date_idx on public.tickets(ticket_date desc);
create index tickets_status_idx on public.tickets(status);

-- ------------------------------------------------------------
-- line_items
-- ------------------------------------------------------------
create table public.line_items (
  id              uuid primary key default gen_random_uuid(),
  ticket_id       uuid not null references public.tickets(id) on delete cascade,
  category        text not null check (category in ('labour','equipment','materials','loa_other')),
  description     text not null,
  quantity        numeric(10,2),
  unit            text,
  rate            numeric(12,4),
  source_amount   numeric(14,2) not null check (source_amount >= 0),
  markup_percent  numeric(5,2) not null default 0 check (markup_percent >= 0),
  final_amount    numeric(14,2) not null check (final_amount >= 0),
  sort_order      int not null default 0,
  created_at      timestamptz not null default now()
);

create index line_items_ticket_idx on public.line_items(ticket_id);

-- ------------------------------------------------------------
-- Trigger: compute final_amount from source * (1 + markup%/100)
-- when final_amount left at 0 by caller.
-- ------------------------------------------------------------
create or replace function public.compute_final_amount()
returns trigger
language plpgsql
as $$
begin
  if new.final_amount = 0 and new.source_amount > 0 then
    new.final_amount := round(new.source_amount * (1 + new.markup_percent / 100.0), 2);
  end if;
  return new;
end;
$$;

create trigger line_items_compute_final
before insert or update on public.line_items
for each row
execute function public.compute_final_amount();

-- ------------------------------------------------------------
-- Trigger: recompute ticket totals after line_items change
-- ------------------------------------------------------------
create or replace function public.recompute_ticket_totals()
returns trigger
language plpgsql
as $$
declare
  v_ticket_id uuid;
  v_total numeric(14,2);
  v_face  numeric(14,2);
begin
  v_ticket_id := coalesce(new.ticket_id, old.ticket_id);

  select coalesce(sum(final_amount), 0) into v_total
  from public.line_items where ticket_id = v_ticket_id;

  select face_value into v_face
  from public.tickets where id = v_ticket_id;

  if v_face is null then
    return null;
  end if;

  update public.tickets
  set computed_total = v_total,
      reconciled = (abs(v_face - v_total) < 0.005)
  where id = v_ticket_id;

  return null;
end;
$$;

create trigger line_items_recompute_after_change
after insert or update or delete on public.line_items
for each row
execute function public.recompute_ticket_totals();

-- ------------------------------------------------------------
-- Trigger: refresh reconciled when ticket.face_value is edited
-- ------------------------------------------------------------
create or replace function public.recompute_on_face_change()
returns trigger
language plpgsql
as $$
declare
  v_total numeric(14,2);
begin
  if old.face_value is distinct from new.face_value then
    select coalesce(sum(final_amount), 0) into v_total
    from public.line_items where ticket_id = new.id;
    new.computed_total := v_total;
    new.reconciled := (abs(new.face_value - v_total) < 0.005);
  end if;
  return new;
end;
$$;

create trigger tickets_recompute_on_face_change
before update on public.tickets
for each row
execute function public.recompute_on_face_change();

-- ------------------------------------------------------------
-- bol_registry
-- ------------------------------------------------------------
create table public.bol_registry (
  id                uuid primary key default gen_random_uuid(),
  master_ticket_id  uuid not null references public.tickets(id) on delete cascade,
  bol_number        text not null unique,
  created_at        timestamptz not null default now()
);

create index bol_registry_master_idx on public.bol_registry(master_ticket_id);

-- ------------------------------------------------------------
-- Trigger: bol_registry parent must be a master ticket
-- ------------------------------------------------------------
create or replace function public.bol_registry_parent_must_be_master()
returns trigger
language plpgsql
as $$
declare
  v_is_master boolean;
begin
  select is_master into v_is_master
  from public.tickets where id = new.master_ticket_id;
  if v_is_master is not true then
    raise exception 'bol_registry.master_ticket_id must reference a ticket where is_master = true';
  end if;
  return new;
end;
$$;

create trigger bol_registry_check_parent_is_master
before insert or update on public.bol_registry
for each row
execute function public.bol_registry_parent_must_be_master();

-- ------------------------------------------------------------
-- Cross-table dedupe: ticket_number <-> bol_number
-- ------------------------------------------------------------
create or replace function public.bol_number_not_in_tickets()
returns trigger
language plpgsql
as $$
begin
  if exists (select 1 from public.tickets where ticket_number = new.bol_number) then
    raise exception 'BOL number % already exists as a ticket number', new.bol_number;
  end if;
  return new;
end;
$$;

create trigger bol_registry_check_no_ticket_collision
before insert or update on public.bol_registry
for each row
execute function public.bol_number_not_in_tickets();

create or replace function public.ticket_number_not_in_bols()
returns trigger
language plpgsql
as $$
begin
  if exists (select 1 from public.bol_registry where bol_number = new.ticket_number) then
    raise exception 'Ticket number % already exists as a registered BOL', new.ticket_number;
  end if;
  return new;
end;
$$;

create trigger tickets_check_no_bol_collision
before insert or update on public.tickets
for each row
execute function public.ticket_number_not_in_bols();

-- ------------------------------------------------------------
-- View: v_active_po_summary
--   One row per PO that has at least one non-rejected ticket.
--   invoiced    = ap_invoiced_amount + sum(face_value where status='invoiced')
--   lem_to_date = sum(face_value where status='pending')
--   total_spent = invoiced + lem_to_date  (no overlap by construction)
-- ------------------------------------------------------------
create or replace view public.v_active_po_summary as
select
  p.id,
  p.po_number,
  p.vendor_display_name,
  p.scope,
  p.task_wbs,
  p.committed_amount as committed,
  p.ap_invoiced_amount
    + coalesce(sum(case when t.status = 'invoiced' then t.face_value else 0 end), 0) as invoiced,
  coalesce(sum(case when t.status = 'pending' then t.face_value else 0 end), 0) as lem_to_date,
  p.ap_invoiced_amount
    + coalesce(sum(case when t.status in ('invoiced','pending') then t.face_value else 0 end), 0) as total_spent,
  p.committed_amount
    - (p.ap_invoiced_amount
       + coalesce(sum(case when t.status in ('invoiced','pending') then t.face_value else 0 end), 0)) as remaining,
  case when p.committed_amount > 0 then
    round(
      (p.ap_invoiced_amount
        + coalesce(sum(case when t.status in ('invoiced','pending') then t.face_value else 0 end), 0))
      / p.committed_amount * 100, 2)
  else 0 end as pct_used,
  count(t.id) filter (where t.status in ('pending','invoiced')) as ticket_count
from public.service_pos p
join public.tickets t on t.po_id = p.id and t.status in ('pending','invoiced')
group by p.id;

-- ------------------------------------------------------------
-- View: v_po_reference — all POs, with is_active flag
-- ------------------------------------------------------------
create or replace view public.v_po_reference as
select
  p.id,
  p.po_number,
  p.vendor_display_name,
  p.vendor_legal_name,
  p.scope,
  p.task_wbs,
  p.committed_amount,
  p.ap_invoiced_amount,
  exists (
    select 1 from public.tickets t
    where t.po_id = p.id and t.status in ('pending','invoiced')
  ) as is_active
from public.service_pos p;

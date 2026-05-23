-- ============================================================
-- Row Level Security policies + Storage bucket
-- All policies: authenticated users only (single 'pm' role).
-- ============================================================

alter table public.service_pos  enable row level security;
alter table public.tickets      enable row level security;
alter table public.line_items   enable row level security;
alter table public.bol_registry enable row level security;

-- service_pos
drop policy if exists "auth_read_service_pos"  on public.service_pos;
drop policy if exists "auth_write_service_pos" on public.service_pos;
create policy "auth_read_service_pos"
  on public.service_pos for select to authenticated using (true);
create policy "auth_write_service_pos"
  on public.service_pos for all to authenticated using (true) with check (true);

-- tickets
drop policy if exists "auth_read_tickets"  on public.tickets;
drop policy if exists "auth_write_tickets" on public.tickets;
create policy "auth_read_tickets"
  on public.tickets for select to authenticated using (true);
create policy "auth_write_tickets"
  on public.tickets for all to authenticated using (true) with check (true);

-- line_items
drop policy if exists "auth_read_line_items"  on public.line_items;
drop policy if exists "auth_write_line_items" on public.line_items;
create policy "auth_read_line_items"
  on public.line_items for select to authenticated using (true);
create policy "auth_write_line_items"
  on public.line_items for all to authenticated using (true) with check (true);

-- bol_registry
drop policy if exists "auth_read_bol_registry"  on public.bol_registry;
drop policy if exists "auth_write_bol_registry" on public.bol_registry;
create policy "auth_read_bol_registry"
  on public.bol_registry for select to authenticated using (true);
create policy "auth_write_bol_registry"
  on public.bol_registry for all to authenticated using (true) with check (true);

-- Views: grant SELECT
grant select on public.v_active_po_summary to authenticated;
grant select on public.v_po_reference      to authenticated;

-- ------------------------------------------------------------
-- Storage bucket for ticket PDFs (private)
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('ticket-pdfs', 'ticket-pdfs', false)
on conflict (id) do nothing;

drop policy if exists "auth_read_ticket_pdfs"   on storage.objects;
drop policy if exists "auth_write_ticket_pdfs"  on storage.objects;
drop policy if exists "auth_update_ticket_pdfs" on storage.objects;
drop policy if exists "auth_delete_ticket_pdfs" on storage.objects;

create policy "auth_read_ticket_pdfs"
  on storage.objects for select to authenticated
  using (bucket_id = 'ticket-pdfs');

create policy "auth_write_ticket_pdfs"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'ticket-pdfs');

create policy "auth_update_ticket_pdfs"
  on storage.objects for update to authenticated
  using (bucket_id = 'ticket-pdfs');

create policy "auth_delete_ticket_pdfs"
  on storage.objects for delete to authenticated
  using (bucket_id = 'ticket-pdfs');

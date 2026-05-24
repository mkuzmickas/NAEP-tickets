-- ============================================================
-- Dedupe check: what identifiers are already on file?
-- Run each query separately in the Supabase SQL editor
-- (the editor only shows the LAST statement's results when
-- multiple are run together).
-- ============================================================


-- ------------------------------------------------------------
-- 1) Every identifier currently in use (tickets + BOLs).
--    If a number you're about to upload appears here, the
--    portal will reject it as a duplicate.
-- ------------------------------------------------------------
select
  t.ticket_number                                                       as identifier,
  case when t.is_master then 'ticket (master)' else 'ticket' end        as kind,
  concat_ws(' · ',
    p.po_number,
    p.vendor_display_name,
    to_char(t.ticket_date, 'YYYY-MM-DD'),
    to_char(t.face_value, 'FM$999,999,990.00'),
    case when t.status <> 'pending' then upper(t.status) end
  )                                                                     as context
from public.tickets t
join public.service_pos p on p.id = t.po_id

union all

select
  b.bol_number                                                          as identifier,
  'bol'                                                                 as kind,
  concat_ws(' · ',
    'consolidated in master ' || mt.ticket_number,
    p.po_number,
    p.vendor_display_name,
    to_char(mt.ticket_date, 'YYYY-MM-DD')
  )                                                                     as context
from public.bol_registry b
join public.tickets    mt on mt.id = b.master_ticket_id
join public.service_pos p on p.id  = mt.po_id

order by identifier;


-- ------------------------------------------------------------
-- 2) Master tickets and the BOLs they consolidate.
--    Useful for confirming that a BOL you're about to upload
--    isn't already bundled inside a master ticket.
-- ------------------------------------------------------------
select
  t.ticket_number                                            as master,
  to_char(t.ticket_date, 'YYYY-MM-DD')                       as date,
  p.vendor_display_name                                      as vendor,
  to_char(t.face_value, 'FM$999,999,990.00')                 as face_value,
  count(b.id)                                                as bol_count,
  string_agg(b.bol_number, ', ' order by b.bol_number)       as bols
from public.tickets t
join public.service_pos p on p.id = t.po_id
left join public.bol_registry b on b.master_ticket_id = t.id
where t.is_master = true
group by t.id, t.ticket_number, t.ticket_date, p.vendor_display_name, t.face_value
order by t.ticket_date;


-- ------------------------------------------------------------
-- 3) Quick lookup: is one specific number taken?
--    Replace 'YOUR_NUMBER' with the identifier you're checking.
-- ------------------------------------------------------------
-- select 'ticket' as kind, ticket_number as identifier
--   from public.tickets where ticket_number = 'YOUR_NUMBER'
-- union all
-- select 'bol'    as kind, bol_number     as identifier
--   from public.bol_registry where bol_number = 'YOUR_NUMBER';

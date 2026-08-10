-- =============================================================================
-- Medallion Energy — LEM vs Invoice double-dip audit
-- =============================================================================
-- Run each numbered section separately in the Supabase SQL editor (Supabase
-- only returns the LAST statement's results when several are pasted together).
-- Findings are commented above each query so the whole file is self-documenting.
--
-- The suspected pattern:
--   Medallion sends both (a) individual field-ticket LEMs (short numeric IDs
--   like 84764, 85205, 87708-EC) and (b) periodic invoices/master tickets
--   that CONSOLIDATE those same LEMs. If both got uploaded, the LEMs are
--   counted twice: once as their own rows, once inside the invoice total.
-- =============================================================================


-- 1) Roll-up by PO + source_type. First place to look for double-dip:
--    if you see BOTH a row with source_type='field_ticket' AND a row with
--    source_type in ('invoice','master_ticket') on the same PO, that's the
--    smoking gun. Also compares sum(face_value) to committed_amount so an
--    obvious over-run jumps out.
select
  p.po_number,
  p.vendor_display_name,
  t.source_type,
  t.is_master,
  count(*)                                         as tickets,
  min(t.ticket_date)                               as first_date,
  max(t.ticket_date)                               as last_date,
  sum(t.face_value)::numeric(14,2)                 as lem_sum,
  p.committed_amount                               as committed,
  round(
    100.0 * sum(t.face_value) / nullif(p.committed_amount, 0),
    1
  )                                                as pct_of_committed
from public.service_pos p
join public.tickets t on t.po_id = p.id
where p.vendor_display_name = 'Medallion Energy'
group by p.po_number, p.vendor_display_name, p.committed_amount,
         t.source_type, t.is_master
order by p.po_number, t.source_type;


-- 2) Full ticket dump for Medallion — every row with everything you need to
--    eyeball a match. Sort by PO then by amount descending so identical
--    face_values cluster next to each other on-screen.
select
  p.po_number,
  t.ticket_number,
  t.ticket_date,
  t.source_type,
  t.is_master,
  t.status,
  t.approval_status,
  t.face_value,
  t.computed_total,
  t.reconciled,
  t.markup_notes,
  t.pdf_storage_path,
  t.created_at::date                               as uploaded_on
from public.service_pos p
join public.tickets t on t.po_id = p.id
where p.vendor_display_name = 'Medallion Energy'
order by p.po_number, t.face_value desc, t.ticket_date;


-- 3) Master tickets on Medallion + the BOLs they consolidate. If ANY of the
--    listed BOL numbers ALSO appear in query #2 as their own ticket_number,
--    that's a confirmed double-dip: the BOL is inside the master AND is a
--    standalone row.
select
  p.po_number,
  mt.ticket_number                                 as master,
  mt.ticket_date                                   as master_date,
  mt.face_value                                    as master_total,
  count(b.id)                                      as bol_count,
  string_agg(b.bol_number, ', ' order by b.bol_number) as bols
from public.service_pos p
join public.tickets mt on mt.po_id = p.id
left join public.bol_registry b on b.master_ticket_id = mt.id
where p.vendor_display_name = 'Medallion Energy'
  and mt.is_master = true
group by p.po_number, mt.id, mt.ticket_number, mt.ticket_date, mt.face_value
order by p.po_number, mt.ticket_date;


-- 4) The direct double-dip test: for every Medallion master, list every
--    standalone ticket_number that ALSO appears in that master's bol_registry.
--    Empty result = no BOL-level double-dip. Any row here = a confirmed hit
--    (the BOL is inside the master AND is a standalone ticket row).
select
  p.po_number,
  mt.ticket_number                                 as master,
  mt.face_value                                    as master_total,
  t.ticket_number                                  as duplicate_lem,
  t.ticket_date                                    as lem_date,
  t.face_value                                     as lem_amount,
  t.source_type                                    as lem_source
from public.service_pos p
join public.tickets mt on mt.po_id = p.id and mt.is_master = true
join public.bol_registry b on b.master_ticket_id = mt.id
join public.tickets t on t.ticket_number = b.bol_number and t.id <> mt.id
where p.vendor_display_name = 'Medallion Energy';


-- 5) Face-value collisions — two Medallion tickets on the same PO with the
--    same amount. The LEM inside an invoice usually keeps its exact dollar
--    figure when the invoice is a straight pass-through, so equal amounts on
--    the same PO within a short date window are worth eyeballing.
with med as (
  select t.*, p.po_number
  from public.tickets t
  join public.service_pos p on p.id = t.po_id
  where p.vendor_display_name = 'Medallion Energy'
)
select
  a.po_number,
  a.face_value,
  a.ticket_number                                  as ticket_a,
  a.ticket_date                                    as date_a,
  a.source_type                                    as source_a,
  b.ticket_number                                  as ticket_b,
  b.ticket_date                                    as date_b,
  b.source_type                                    as source_b,
  abs(a.ticket_date - b.ticket_date)               as days_apart
from med a
join med b
  on a.po_number = b.po_number
 and a.face_value = b.face_value
 and a.face_value > 0
 and a.id < b.id
order by a.po_number, a.face_value desc;


-- 6) Grand-total sanity check per PO — cross-checks the tracker's LEM total
--    against the committed amount, split by "counts as invoice" vs "counts
--    as raw LEM". Any PO where (invoice_sum + lem_sum) exceeds committed by
--    ~2× is the strongest overall signal of double-counting.
select
  p.po_number,
  p.committed_amount,
  sum(t.face_value) filter (where t.source_type in ('invoice','master_ticket')
                                or t.is_master = true)::numeric(14,2) as invoice_sum,
  sum(t.face_value) filter (where t.source_type in ('field_ticket','aimsio_status')
                                and t.is_master = false)::numeric(14,2) as lem_sum,
  sum(t.face_value)::numeric(14,2)                                     as combined,
  round(
    100.0 * sum(t.face_value) / nullif(p.committed_amount, 0), 1
  )                                                                    as pct_of_committed
from public.service_pos p
left join public.tickets t on t.po_id = p.id
where p.vendor_display_name = 'Medallion Energy'
group by p.po_number, p.committed_amount
order by p.po_number;

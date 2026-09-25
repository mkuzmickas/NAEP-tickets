-- =============================================================================
-- Sureline — carry only PUR-6540-2001285 going forward
-- =============================================================================
-- Mike is drop-shipping the Sureline dashboard down to one PO. Every other
-- Sureline PO gets deleted along with its tickets, line items, and BOL
-- registry rows (cascades handle line_items + bol_registry automatically).
-- =============================================================================


-- --------- PREVIEW ---------
-- Confirm you're about to remove the right set. Should list Sureline POs
-- currently on file EXCEPT PUR-6540-2001285.
select
  po_number,
  scope,
  committed_amount,
  (select count(*) from public.tickets t where t.po_id = p.id) as tickets,
  (select sum(t.face_value)::numeric(14,2) from public.tickets t where t.po_id = p.id) as lem_sum
from public.service_pos p
where vendor_display_name = 'Sureline'
  and po_number <> 'PUR-6540-2001285'
order by po_number;


-- --------- DELETE ---------
-- Wrapped in a transaction. Removes every Sureline PO except 2001285. Tickets
-- delete first (bol_registry cascades from tickets, line_items cascade too);
-- then the parent PO rows.
begin;

delete from public.tickets
 using public.service_pos p
 where p.id = public.tickets.po_id
   and p.vendor_display_name = 'Sureline'
   and p.po_number <> 'PUR-6540-2001285';

delete from public.service_pos
 where vendor_display_name = 'Sureline'
   and po_number <> 'PUR-6540-2001285';

commit;


-- --------- POST-CHECK ---------
-- Should return exactly one row: PUR-6540-2001285.
select po_number, scope, committed_amount, ap_invoiced_amount,
       (select count(*) from public.tickets t where t.po_id = p.id) as tickets,
       (select sum(t.face_value)::numeric(14,2) from public.tickets t where t.po_id = p.id) as lem_sum
  from public.service_pos p
 where vendor_display_name = 'Sureline';

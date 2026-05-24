import { createClient } from '@/lib/supabase/server';
import type {
  DuplicateInfo,
  ExistingTicketSnapshot,
  ParsedLineItem,
  ParsedTicket,
} from './types';

export async function checkDuplicates(parsed: ParsedTicket): Promise<DuplicateInfo> {
  const supabase = createClient();
  const result: DuplicateInfo = { bol_collisions: [] };

  // 1. ticket_number against tickets table — pull the full snapshot so the
  //    client can diff parsed-vs-existing and decide between "true duplicate"
  //    (Reject only) and "revision" (Replace option).
  const { data: existingTicket } = await supabase
    .from('tickets')
    .select(
      `
      id, ticket_number, ticket_date, face_value, is_master,
      service_pos(po_number),
      line_items(category, description, quantity, unit, rate,
                 source_amount, markup_percent, final_amount, sort_order),
      bol_registry(bol_number)
    `
    )
    .eq('ticket_number', parsed.ticket_number)
    .maybeSingle();

  if (existingTicket) {
    const e = existingTicket as unknown as {
      id: string;
      ticket_number: string;
      ticket_date: string;
      face_value: string | number;
      is_master: boolean;
      service_pos: { po_number: string } | null;
      line_items: Array<{
        category: ParsedLineItem['category'];
        description: string;
        quantity: string | number | null;
        unit: string | null;
        rate: string | number | null;
        source_amount: string | number;
        markup_percent: string | number;
        final_amount: string | number;
        sort_order: number;
      }>;
      bol_registry: Array<{ bol_number: string }>;
    };

    result.ticket_number_collides_with = 'ticket';
    result.ticket_existing = {
      ticket_number: e.ticket_number,
      ticket_date: e.ticket_date,
      po_number: e.service_pos?.po_number ?? 'unknown',
    };

    const lineItems: ParsedLineItem[] = (e.line_items ?? [])
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((li) => ({
        category: li.category,
        description: li.description,
        quantity: li.quantity == null ? null : Number(li.quantity),
        unit: li.unit,
        rate: li.rate == null ? null : Number(li.rate),
        source_amount: Number(li.source_amount),
        markup_percent: Number(li.markup_percent),
        final_amount: Number(li.final_amount),
      }));
    const bols = (e.bol_registry ?? []).map((b) => b.bol_number);

    const snapshot: ExistingTicketSnapshot = {
      ticket_id: e.id,
      ticket_number: e.ticket_number,
      ticket_date: e.ticket_date,
      po_number: e.service_pos?.po_number ?? 'unknown',
      face_value: Number(e.face_value),
      is_master: e.is_master,
      bol_numbers: bols,
      line_items: lineItems,
    };
    result.existing_ticket_snapshot = snapshot;
  } else {
    // 2. ticket_number against bol_registry
    const { data: bolRow } = await supabase
      .from('bol_registry')
      .select('bol_number, tickets(ticket_number)')
      .eq('bol_number', parsed.ticket_number)
      .maybeSingle();
    if (bolRow) {
      const t = (bolRow as unknown as { tickets: { ticket_number: string } | null }).tickets;
      result.ticket_number_collides_with = 'bol_registry';
      result.ticket_existing = {
        ticket_number: parsed.ticket_number,
        ticket_date: '',
        po_number: t?.ticket_number
          ? `Registered as BOL inside master ticket ${t.ticket_number}`
          : 'Registered as BOL',
      };
    }
  }

  // 3. Each declared BOL number (if master) against the rest of the DB.
  //    Note: collisions where master_ticket equals parsed.ticket_number are
  //    "self-collisions" — they'll be cleaned up when the existing ticket
  //    is deleted during a Replace, so the client filters them out for the
  //    Replace-enable check.
  if (parsed.is_master && parsed.bol_numbers.length > 0) {
    for (const bol of parsed.bol_numbers) {
      const { data: ticketHit } = await supabase
        .from('tickets')
        .select('ticket_number')
        .eq('ticket_number', bol)
        .maybeSingle();
      if (ticketHit) {
        result.bol_collisions.push({ bol_number: bol, found_in: 'ticket' });
        continue;
      }
      const { data: bolHit } = await supabase
        .from('bol_registry')
        .select('bol_number, tickets(ticket_number)')
        .eq('bol_number', bol)
        .maybeSingle();
      if (bolHit) {
        const t = (bolHit as unknown as { tickets: { ticket_number: string } | null }).tickets;
        result.bol_collisions.push({
          bol_number: bol,
          found_in: 'bol_registry',
          master_ticket: t?.ticket_number,
        });
      }
    }
  }

  return result;
}

import { createClient } from '@/lib/supabase/server';
import type { DuplicateInfo, ParsedTicket } from './types';

export async function checkDuplicates(parsed: ParsedTicket): Promise<DuplicateInfo> {
  const supabase = createClient();
  const result: DuplicateInfo = { bol_collisions: [] };

  // 1. ticket_number against tickets table
  const { data: existingTicket } = await supabase
    .from('tickets')
    .select('ticket_number, ticket_date, service_pos(po_number)')
    .eq('ticket_number', parsed.ticket_number)
    .maybeSingle();

  if (existingTicket) {
    result.ticket_number_collides_with = 'ticket';
    const sp = (existingTicket as unknown as { service_pos: { po_number: string } | null }).service_pos;
    result.ticket_existing = {
      ticket_number: existingTicket.ticket_number,
      ticket_date: existingTicket.ticket_date,
      po_number: sp?.po_number ?? 'unknown',
    };
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

  // 3. Each declared BOL number (if master)
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

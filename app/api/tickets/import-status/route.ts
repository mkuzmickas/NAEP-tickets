import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ewpForTicket } from '@/lib/ewp/ticket-ewp';
import { APPROVED_LABEL } from '@/lib/ticketMap.shared';

export const maxDuration = 30;
export const runtime = 'nodejs';

// -----------------------------------------------------------------------------
// Request / response shapes
// -----------------------------------------------------------------------------

type CsvFile = {
  filename: string;
  po_number: string;
  content: string;
};

type ImportBody = {
  files: CsvFile[];
};

type PerFileResult = {
  filename: string;
  po_number: string;
  imported: number;
  updated: number;
  skipped_void: number;
  errors: string[];
};

// -----------------------------------------------------------------------------
// Tiny RFC-4180 CSV reader (handles quoted fields, embedded commas, CRLF).
// The Aimsio exports are small (< a few hundred rows) so speed is a non-issue.
// -----------------------------------------------------------------------------

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\r') {
      // Swallow — the following \n will close the row.
    } else if (ch === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }

  // Flush the last field / row if the file didn't end with a newline.
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.some((c) => c.trim().length > 0));
}

function norm(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function findCol(headers: string[], ...candidates: string[]): number {
  const normed = headers.map(norm);
  for (const c of candidates) {
    const target = norm(c);
    const idx = normed.indexOf(target);
    if (idx >= 0) return idx;
  }
  return -1;
}

// -----------------------------------------------------------------------------
// Field parsers
// -----------------------------------------------------------------------------

function parseMoney(raw: string): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[$,\s]/g, '');
  if (cleaned === '' || cleaned === '-') return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

// Aimsio exports ticket_date in a few shapes. Return ISO YYYY-MM-DD or null.
function parseDate(raw: string): string | null {
  if (!raw) return null;
  const s = raw.trim();

  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const slash = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slash) {
    const mo = slash[1].padStart(2, '0');
    const d = slash[2].padStart(2, '0');
    return `${slash[3]}-${mo}-${d}`;
  }

  const parsed = Date.parse(s);
  if (Number.isFinite(parsed)) {
    const d = new Date(parsed);
    const y = d.getUTCFullYear();
    const mo = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${mo}-${day}`;
  }

  return null;
}

// -----------------------------------------------------------------------------
// POST handler
// -----------------------------------------------------------------------------

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as ImportBody | null;
  if (!body || !Array.isArray(body.files) || body.files.length === 0) {
    return NextResponse.json(
      { error: 'Expected { files: [{ filename, po_number, content }, ...] }' },
      { status: 400 }
    );
  }

  // Preload every PO once so the loop below stays chatter-free.
  const uniquePoNumbers = Array.from(new Set(body.files.map((f) => f.po_number)));
  const { data: poRows, error: poErr } = await supabase
    .from('service_pos')
    .select('id, po_number')
    .in('po_number', uniquePoNumbers);
  if (poErr) {
    return NextResponse.json(
      { error: `PO lookup failed: ${poErr.message}` },
      { status: 500 }
    );
  }
  const poIdByNumber = new Map(
    (poRows ?? []).map((r) => [r.po_number as string, r.id as string])
  );

  const perFile: PerFileResult[] = [];
  let totalImported = 0;
  let totalUpdated = 0;
  let totalSkippedVoid = 0;

  for (const file of body.files) {
    const result: PerFileResult = {
      filename: file.filename,
      po_number: file.po_number,
      imported: 0,
      updated: 0,
      skipped_void: 0,
      errors: [],
    };

    const poId = poIdByNumber.get(file.po_number);
    if (!poId) {
      result.errors.push(`PO ${file.po_number} not found in service_pos`);
      perFile.push(result);
      continue;
    }

    let rows: string[][];
    try {
      rows = parseCsv(file.content);
    } catch (e) {
      result.errors.push(
        `CSV parse failed: ${e instanceof Error ? e.message : String(e)}`
      );
      perFile.push(result);
      continue;
    }

    if (rows.length < 2) {
      result.errors.push('CSV had no data rows');
      perFile.push(result);
      continue;
    }

    const headers = rows[0];
    const iTicket = findCol(headers, 'Ticket #', 'Ticket Number', 'Ticket');
    const iDate = findCol(headers, 'Ticket Date', 'Date');
    const iBillable = findCol(
      headers,
      'Total Billable $',
      'Total Billable',
      'Billable Total',
      'Billable $'
    );
    const iOffice = findCol(
      headers,
      'Office Approval Status',
      'Office Approval',
      'Office Status'
    );
    const iCp = findCol(
      headers,
      'CP Approval Status',
      'CP Approval',
      'CP Status'
    );

    if (iTicket < 0 || iDate < 0 || iBillable < 0 || iOffice < 0) {
      result.errors.push(
        `Missing required column(s). Need Ticket #, Ticket Date, Total Billable $, Office Approval Status.`
      );
      perFile.push(result);
      continue;
    }

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];

      const cpRaw = iCp >= 0 ? (row[iCp] ?? '').trim() : '';
      if (cpRaw === 'Void') {
        result.skipped_void++;
        totalSkippedVoid++;
        continue;
      }

      const ticketNumber = (row[iTicket] ?? '').trim();
      if (!ticketNumber) continue;

      const ticketDate = parseDate(row[iDate] ?? '');
      if (!ticketDate) {
        result.errors.push(
          `Row ${r + 1} (${ticketNumber}): unparseable ticket date '${row[iDate]}'`
        );
        continue;
      }

      const faceValue = parseMoney(row[iBillable] ?? '');
      if (faceValue === null) {
        result.errors.push(
          `Row ${r + 1} (${ticketNumber}): unparseable billable '${row[iBillable]}'`
        );
        continue;
      }

      const approvalStatus = (row[iOffice] ?? '').trim() || null;
      const ewpNo = ewpForTicket(file.po_number, ticketNumber);
      // Translate Aimsio's Office Approval Status into our internal
      // invoicing state. Only "Approved by Client/PM" is invoiceable;
      // everything else — Sent to Client via Portal, Approved to Send,
      // See Notes, blank — is pending sign-off.
      const newStatus: 'invoiced' | 'pending' =
        approvalStatus === APPROVED_LABEL ? 'invoiced' : 'pending';

      // Ticket numbers are globally unique in this schema — look up without
      // a PO filter so a status-only row inserted for the wrong PO gets caught.
      const { data: existing, error: existErr } = await supabase
        .from('tickets')
        .select('id, po_id, source_type')
        .eq('ticket_number', ticketNumber)
        .maybeSingle();
      if (existErr) {
        result.errors.push(
          `Row ${r + 1} (${ticketNumber}): lookup failed — ${existErr.message}`
        );
        continue;
      }

      if (existing) {
        if (existing.po_id !== poId) {
          result.errors.push(
            `Row ${r + 1} (${ticketNumber}): already on a different PO in the tracker; leaving untouched.`
          );
          continue;
        }

        // Only refresh face_value + date on rows that we ourselves imported
        // from a status CSV. A real PDF's line-item total is authoritative.
        const patch: Record<string, unknown> = {
          approval_status: approvalStatus,
          ewp_no: ewpNo,
          status: newStatus,
        };
        if (existing.source_type === 'aimsio_status') {
          patch.face_value = faceValue;
          patch.computed_total = faceValue;
          patch.ticket_date = ticketDate;
        }

        const { error: upErr } = await supabase
          .from('tickets')
          .update(patch)
          .eq('id', existing.id);
        if (upErr) {
          result.errors.push(
            `Row ${r + 1} (${ticketNumber}): update failed — ${upErr.message}`
          );
          continue;
        }
        result.updated++;
        totalUpdated++;
      } else {
        const { error: insErr } = await supabase.from('tickets').insert({
          po_id: poId,
          ticket_number: ticketNumber,
          ticket_date: ticketDate,
          source_type: 'aimsio_status',
          is_master: false,
          face_value: faceValue,
          computed_total: faceValue,
          reconciled: true,
          status: newStatus,
          approval_status: approvalStatus,
          ewp_no: ewpNo,
          created_by: user.id,
        });
        if (insErr) {
          result.errors.push(
            `Row ${r + 1} (${ticketNumber}): insert failed — ${insErr.message}`
          );
          continue;
        }
        result.imported++;
        totalImported++;
      }
    }

    perFile.push(result);
  }

  return NextResponse.json({
    ok: true,
    summary: {
      total_imported: totalImported,
      total_updated: totalUpdated,
      total_skipped_void: totalSkippedVoid,
      per_file: perFile,
    },
  });
}

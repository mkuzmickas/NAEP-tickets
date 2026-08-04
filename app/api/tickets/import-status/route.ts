import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  ewpForTicket,
  stripDatePrefix,
  jobFromTicketNumber,
} from '@/lib/ewp/ticket-ewp';
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
  job_prefix: string | null;
  csv_row_count: number;
  void_skipped: number;
  collisions_dropped: number;
  parse_errors: number;
  deleted_from_db: number;
  inserted_to_db: number;
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
//
// Per Aimsio CSV: parse rows, normalize each ticket_number (strip any leading
// date prefix), skip Voids (Status = 'Void' OR CP Approval Status = 'Void'),
// dedupe collisions within the CSV (last occurrence wins, prior ones logged),
// then call `sync_job_tickets` RPC — one atomic DELETE-then-INSERT per job.
// The RPC clears every stale row that used to belong to this job (regardless of
// which PO it currently lives on) and inserts exactly what the CSV says. That
// is what fixes both failure modes: ballooning ticket counts (stale rows
// surviving) and stalling counts (new upload never touching legacy rows on the
// wrong PO).

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
  let totalDeleted = 0;
  let totalInserted = 0;
  let totalVoids = 0;
  let totalCollisions = 0;

  for (const file of body.files) {
    const result: PerFileResult = {
      filename: file.filename,
      po_number: file.po_number,
      job_prefix: null,
      csv_row_count: 0,
      void_skipped: 0,
      collisions_dropped: 0,
      parse_errors: 0,
      deleted_from_db: 0,
      inserted_to_db: 0,
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
    const iStatus = findCol(headers, 'Status', 'Ticket Status');

    if (iTicket < 0 || iDate < 0 || iBillable < 0 || iOffice < 0) {
      result.errors.push(
        `Missing required column(s). Need Ticket #, Ticket Date, Total Billable $, Office Approval Status.`
      );
      perFile.push(result);
      continue;
    }

    // Walk the rows once: filter Voids, then key by the raw ticket_number
    // exactly as Aimsio wrote it. Rows that share a base number but carry
    // an Aimsio date prefix (06-05-SL26-010-000-001 alongside plain
    // SL26-010-000-001) are DISTINCT tickets in Aimsio — each has its own
    // WMT GUID and its own workday — so we keep them all. Job detection +
    // EWP lookup still normalize via stripDatePrefix to reach the SL26-NNN
    // core. Collisions on the raw name (true duplicates within the CSV)
    // are rare but still last-write-wins with a logged warning.
    const byNumber = new Map<string, {
      ticket_number: string;
      ticket_date: string;
      face_value: number;
      status: 'invoiced' | 'pending';
      approval_status: string;
      ewp_no: number | null;
    }>();

    result.csv_row_count = rows.length - 1;

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];

      // Void filter — either column, either row-level state.
      const cpRaw = iCp >= 0 ? (row[iCp] ?? '').trim() : '';
      const statusRaw = iStatus >= 0 ? (row[iStatus] ?? '').trim() : '';
      if (cpRaw === 'Void' || statusRaw === 'Void') {
        result.void_skipped++;
        totalVoids++;
        continue;
      }

      const rawTicket = (row[iTicket] ?? '').trim();
      if (!rawTicket) continue;

      // Stored ticket_number is the raw CSV value. Only strip the date
      // prefix when we need to reach the SL26-NNN core for job/EWP lookup.
      const lookupTicket = stripDatePrefix(rawTicket);

      const ticketDate = parseDate(row[iDate] ?? '');
      if (!ticketDate) {
        result.parse_errors++;
        result.errors.push(
          `Row ${r + 1} (${rawTicket}): unparseable ticket date '${row[iDate]}'`
        );
        continue;
      }

      const faceValueParsed = parseMoney(row[iBillable] ?? '');
      if (faceValueParsed === null || faceValueParsed < 0) {
        result.parse_errors++;
        result.errors.push(
          `Row ${r + 1} (${rawTicket}): unparseable/negative billable '${row[iBillable]}'`
        );
        continue;
      }
      const faceValue = faceValueParsed;

      const approvalStatus = (row[iOffice] ?? '').trim();
      // Aimsio's "Approved by Client/PM" is the only invoiceable state.
      const newStatus: 'invoiced' | 'pending' =
        approvalStatus === APPROVED_LABEL ? 'invoiced' : 'pending';

      const ewpNo = ewpForTicket(file.po_number, lookupTicket);

      if (byNumber.has(rawTicket)) {
        const prior = byNumber.get(rawTicket)!;
        result.collisions_dropped++;
        totalCollisions++;
        result.errors.push(
          `Row ${r + 1}: '${rawTicket}' appears twice in the CSV ` +
            `(prior $${prior.face_value.toFixed(2)} on ${prior.ticket_date}, ` +
            `keeping this row $${faceValue.toFixed(2)} on ${ticketDate})`
        );
      }

      byNumber.set(rawTicket, {
        ticket_number: rawTicket,
        ticket_date: ticketDate,
        face_value: faceValue,
        status: newStatus,
        approval_status: approvalStatus,
        ewp_no: ewpNo,
      });
    }

    const tickets = Array.from(byNumber.values());
    if (tickets.length === 0) {
      result.errors.push(
        'No valid ticket rows survived Void filtering, dedup, or field parsing — skipping atomic replace to protect existing data.'
      );
      perFile.push(result);
      continue;
    }

    // Every surviving ticket must share the same job prefix — otherwise the
    // atomic replace would only clear one of them. If the CSV mixes SL26-101
    // and SL26-095 rows the operator uploaded the wrong file for the PO.
    const jobPrefixes = new Set(
      tickets
        .map((t) => jobFromTicketNumber(t.ticket_number))
        .filter((p): p is string => p !== null)
    );
    if (jobPrefixes.size === 0) {
      result.errors.push(
        'No SL26-NNN job prefix found on any ticket — CSV does not look like an Aimsio Office Approval export.'
      );
      perFile.push(result);
      continue;
    }
    if (jobPrefixes.size > 1) {
      result.errors.push(
        `CSV mixes multiple job prefixes (${Array.from(jobPrefixes).join(', ')}) — refusing atomic replace.`
      );
      perFile.push(result);
      continue;
    }
    const jobPrefix = Array.from(jobPrefixes)[0];
    result.job_prefix = jobPrefix;

    // Serialize each ticket's ewp_no as a string ('' when null) so the RPC's
    // `nullif` + cast pair reads it back cleanly. All other fields are strings.
    const payload = tickets.map((t) => ({
      ticket_number: t.ticket_number,
      ticket_date: t.ticket_date,
      face_value: String(t.face_value),
      status: t.status,
      approval_status: t.approval_status,
      ewp_no: t.ewp_no == null ? '' : String(t.ewp_no),
    }));

    const { data: rpcData, error: rpcErr } = await supabase.rpc(
      'sync_job_tickets',
      {
        p_job_prefix: jobPrefix,
        p_po_id: poId,
        p_tickets: payload,
        p_created_by: user.id,
      }
    );
    if (rpcErr) {
      result.errors.push(`Atomic replace failed: ${rpcErr.message}`);
      perFile.push(result);
      continue;
    }

    // The RPC returns TABLE(deleted_count int, inserted_count int) — the
    // Supabase client hands that back as an array with one row.
    const rpcRow = Array.isArray(rpcData) ? rpcData[0] : rpcData;
    result.deleted_from_db = Number(rpcRow?.deleted_count ?? 0);
    result.inserted_to_db = Number(rpcRow?.inserted_count ?? 0);
    totalDeleted += result.deleted_from_db;
    totalInserted += result.inserted_to_db;

    perFile.push(result);
  }

  return NextResponse.json({
    ok: true,
    summary: {
      total_deleted: totalDeleted,
      total_inserted: totalInserted,
      total_void_skipped: totalVoids,
      total_collisions_dropped: totalCollisions,
      per_file: perFile,
    },
  });
}

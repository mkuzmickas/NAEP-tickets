#!/usr/bin/env node
/*
 * gen-energetic-reconcile.js
 *
 * Reads Energetic Services' per-BOL detail CSV export for PO PUR-6540-2001227
 * and emits a full atomic reconcile SQL script to stdout.
 *
 * Usage:
 *   node db/scripts/gen-energetic-reconcile.js path/to/energetic.csv > reconcile.sql
 *
 * The CSV shape (per BOL block):
 *   Date,BOL #,Description,Qty,Rate,Sub Total
 *   5-7-2026,1246484,Hydro Vac,12,310,"$3,720.00"
 *   ,,Swamper,12,75,$900.00
 *   ,,Fuel Surcharge,3720,0.081,$301.32
 *   ,,,,,"$4,921.32"           ← the BOL subtotal row (all first 5 empty)
 *
 * The parser tracks the "current date" and "current BOL#" as they cascade
 * down empty cells, then emits one ticket per BOL keyed on the subtotal row.
 *
 * The generated SQL:
 *   1. Guards that PO PUR-6540-2001227 exists.
 *   2. DELETEs every existing ticket on that PO (cascades bol_registry).
 *   3. INSERTs one ticket per BOL:
 *        ticket_number  = the 7-digit BOL number verbatim
 *        ticket_date    = the CSV's date, parsed as MM-DD-YYYY
 *        face_value     = the BOL subtotal
 *        source_type    = 'bol'
 *        status         = 'invoiced' (Energetic bills what's on the export)
 *        approval_status= NULL (no Aimsio approval workflow; mark green later
 *                         via UI or SQL if desired)
 *   All in one transaction — either the whole thing lands or nothing does.
 */

'use strict';
const fs = require('fs');

const PO_NUMBER = 'PUR-6540-2001227';
const csvPath = process.argv[2];

if (!csvPath) {
  process.stderr.write(
    'usage: node gen-energetic-reconcile.js path/to/energetic.csv > reconcile.sql\n'
  );
  process.exit(1);
}

const text = fs.readFileSync(csvPath, 'utf8');

// RFC-4180 minimal CSV split — handles quoted fields with embedded commas.
function splitCsv(line) {
  const out = [];
  let field = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuote = !inQuote;
      continue;
    }
    if (ch === ',' && !inQuote) {
      out.push(field);
      field = '';
      continue;
    }
    field += ch;
  }
  out.push(field);
  return out;
}

let currentDate = null;
let currentBol = null;
const bols = []; // {date, bol, subtotal}

for (const rawLine of text.split(/\r?\n/)) {
  if (!rawLine.trim()) continue;
  if (rawLine.startsWith('Aitken')) continue;
  if (rawLine.startsWith('Date,BOL')) continue;

  const cols = splitCsv(rawLine);
  const date = (cols[0] || '').trim();
  const bol = (cols[1] || '').trim();
  const desc = (cols[2] || '').trim();
  const qty = (cols[3] || '').trim();
  const rate = (cols[4] || '').trim();
  const subtotal = (cols[5] || '').trim();

  if (date === 'Total') continue; // grand-total row

  if (date) currentDate = date;
  if (bol) currentBol = bol;

  // Subtotal row: date/bol/desc/qty/rate all empty, subtotal set.
  if (!date && !bol && !desc && !qty && !rate && subtotal) {
    if (!currentBol) continue;
    bols.push({ date: currentDate, bol: currentBol, subtotal });
    currentBol = null;
  }
}

function toIso(usDate) {
  const [m, d, y] = usDate.split('-');
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}
function toAmount(s) {
  return Number(s.replace(/[$,"\s]/g, ''));
}

// Warn on any obvious anomalies before emitting SQL.
const seen = new Set();
const duplicates = [];
for (const b of bols) {
  if (seen.has(b.bol)) duplicates.push(b.bol);
  seen.add(b.bol);
}
const totalSum = bols.reduce((s, b) => s + toAmount(b.subtotal), 0);

// Emit SQL to stdout.
const lines = [];
lines.push(`-- =============================================================================`);
lines.push(`-- Energetic Services · PO ${PO_NUMBER} · atomic BOL reconcile`);
lines.push(`-- =============================================================================`);
lines.push(`-- Generated from Energetic's per-BOL detail export.`);
lines.push(`-- ${bols.length} BOLs · $${totalSum.toFixed(2)} total`);
if (duplicates.length > 0) {
  lines.push(`--`);
  lines.push(`-- WARNING: ${duplicates.length} duplicate BOL number(s) in the CSV — last row wins:`);
  lines.push(`--   ${[...new Set(duplicates)].join(', ')}`);
}
lines.push(`-- =============================================================================`);
lines.push(``);
lines.push(`begin;`);
lines.push(``);
lines.push(`-- 1) Guard: PO must exist in service_pos.`);
lines.push(`do $$ declare cnt int; begin`);
lines.push(`  select count(*) into cnt from public.service_pos where po_number = '${PO_NUMBER}';`);
lines.push(`  if cnt <> 1 then`);
lines.push(`    raise exception 'Expected 1 service PO ${PO_NUMBER}, found %', cnt;`);
lines.push(`  end if;`);
lines.push(`end $$;`);
lines.push(``);
lines.push(`-- 2) DELETE every existing ticket on this PO. bol_registry entries`);
lines.push(`--    referencing those master tickets cascade automatically.`);
lines.push(`delete from public.tickets`);
lines.push(`where po_id = (select id from public.service_pos where po_number = '${PO_NUMBER}');`);
lines.push(``);
lines.push(`-- 3) INSERT one ticket per BOL. source_type = 'bol' means each row is a`);
lines.push(`--    standalone BOL (not a master-consolidated ticket).`);
lines.push(`with r(ticket_number, ticket_date, face_value) as (values`);

const rows = bols.map((b, i) => {
  const iso = toIso(b.date);
  const amt = toAmount(b.subtotal);
  const comma = i === bols.length - 1 ? '' : ',';
  return `  ('${b.bol}', '${iso}'::date, ${amt.toFixed(2)})${comma}`;
});
lines.push(...rows);

lines.push(`)`);
lines.push(`insert into public.tickets (`);
lines.push(`  po_id, ticket_number, ticket_date, source_type, is_master,`);
lines.push(`  face_value, computed_total, reconciled, status, approval_status`);
lines.push(`)`);
lines.push(`select`);
lines.push(`  (select id from public.service_pos where po_number = '${PO_NUMBER}'),`);
lines.push(`  r.ticket_number, r.ticket_date, 'bol', false,`);
lines.push(`  r.face_value, r.face_value, true, 'invoiced', null`);
lines.push(`from r;`);
lines.push(``);
lines.push(`commit;`);
lines.push(``);
lines.push(`-- =============================================================================`);
lines.push(`-- Verify — run after commit.`);
lines.push(`-- =============================================================================`);
lines.push(`--   select count(*) as tickets, sum(face_value)::numeric(14,2) as total`);
lines.push(`--   from public.tickets t`);
lines.push(`--   join public.service_pos p on p.id = t.po_id`);
lines.push(`--   where p.po_number = '${PO_NUMBER}';`);
lines.push(`--`);
lines.push(`-- Expected: ${bols.length} tickets · $${totalSum.toFixed(2)}`);

process.stdout.write(lines.join('\n') + '\n');

process.stderr.write(
  `\n-- Wrote SQL for ${bols.length} BOLs · $${totalSum.toFixed(2)} total\n`
);
if (duplicates.length > 0) {
  process.stderr.write(
    `-- WARNING: ${duplicates.length} duplicate BOL number(s) — last row wins\n`
  );
}

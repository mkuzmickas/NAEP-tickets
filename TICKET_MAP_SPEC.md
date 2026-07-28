# Spec — Aimsio CSV import + SureLine-style Ticket Map

**For:** Claude working in the `naep-tickets` repo.
**Goal:** two changes, so this tracker is fed the same way the SureLine portal is.

1. **Aimsio CSV import** — drop the client's "ticket status by PO" CSV exports and have the
   app upsert tickets + approval status, instead of only parsing PDFs.
2. **Ticket Map redesign** — re-skin the existing ticket map to match the SureLine portal's:
   coloured by **client approval status** (green = *Approved by Client/PM*), grouped by PO,
   with **PO 2001285 broken down by EWP**, and a print button for an unapproved-tickets report.

The SureLine portal is the visual reference. This spec reproduces its design fully — you do
not need access to that repo.

---

## Context: how the two apps differ today

- This tracker ingests **field-ticket PDFs** → Claude parses line items → commit. Rich per
  ticket, but manual and PDF-only.
- The SureLine portal ingests **Aimsio "ticket status by PO" CSVs** — one file per PO with
  columns: `Ticket #, Job No., Office Approval Status, CP Approval Status, Ticket Date,
  Total Billable $` (and others we ignore). Those CSVs carry **totals + approval status**,
  not line items.

Mike wants to feed *this* tracker the same CSVs. So the CSV import becomes the primary driver
of the Ticket Map (approval + EWP); PDF uploads stay for line-item detail on top.

---

## Part 1 — Schema changes

Add a migration `db/migrations/0013_ticket_approval_and_ewp.sql`:

```sql
-- Client approval status from the Aimsio "Office Approval Status" column. Distinct from
-- tickets.status (pending/invoiced/rejected), which is the internal invoicing state.
alter table public.tickets add column if not exists approval_status text;

-- EWP this ticket rolls up to, for the PO-2001285 breakdown. Null = not coded to an EWP.
alter table public.tickets add column if not exists ewp_no int;

-- A ticket imported from the status CSV has no line items but is trusted (Aimsio total).
-- 'aimsio_status' is a new source_type; relax the two ticket constraints to allow it.
alter table public.tickets drop constraint if exists tickets_master_consistency;
alter table public.tickets drop constraint if exists tickets_must_reconcile_unless_rejected;

alter table public.tickets
  drop constraint if exists tickets_source_type_check,
  add constraint tickets_source_type_check
    check (source_type in ('field_ticket','bol','invoice','master_ticket','aimsio_status'));

alter table public.tickets add constraint tickets_master_consistency check (
  (is_master = true and source_type = 'master_ticket')
  or (is_master = false and source_type in ('field_ticket','bol','invoice','aimsio_status'))
);
alter table public.tickets add constraint tickets_must_reconcile_unless_rejected check (
  reconciled = true or status = 'rejected' or source_type = 'aimsio_status'
);
```

Add `approval_status` / `ewp_no` to the `Ticket` type in `types/database.ts`.

---

## Part 2 — CSV import pipeline

### 2.1 Upload UI

On the **Upload & Reconcile** page add a second mode: **"Import Aimsio status CSVs."**
Accept one or more `.csv` files. Each file maps to one PO — infer the PO from the filename
(the client names them `1285.csv`, `1278.csv`, `1271.csv`, `1280.csv` → `PUR-6540-2001285`
etc.). If the filename has no PO number, show a per-file PO dropdown (from `service_pos`).

### 2.2 Parse + upsert (`app/api/tickets/import-status/route.ts`)

For each row:

- **Skip** rows whose `CP Approval Status` is exactly `Void`.
- `ticket_number` — the raw `Ticket #`. Keep a date-prefixed number distinct from its base
  (e.g. `06-05-SL26-010-000-001` and `06-03-SL26-010-000-001` are two tickets).
- `ticket_date` — `Ticket Date` (YYYY-MM-DD).
- `face_value` — `Total Billable $` (numeric).
- `approval_status` — the `Office Approval Status` string, verbatim.
- **`approved`** (drives green/red) — `approval_status === 'Approved by Client/PM'`. Everything
  else (Sent to Client via Portal, Approved to Send, See Notes, blank) is **not** approved.
- `ewp_no` — see §2.3.

**Upsert by `ticket_number`:**
- If a ticket exists (e.g. from a PDF): `UPDATE` only `approval_status`, `ewp_no` (and
  `face_value`, `ticket_date` **only if** that ticket is `source_type = 'aimsio_status'`, so a
  real PDF's line-item total is never overwritten).
- If new: `INSERT` a status-only ticket — `source_type = 'aimsio_status'`, `is_master = false`,
  `reconciled = true`, `computed_total = face_value`, `status = 'invoiced'`, no line items.

Return a summary: imported, updated, skipped-void, per-PO totals.

### 2.3 EWP assignment

The Aimsio CSV has **no EWP column** — EWP mapping comes from the WTP folders / client emails.
Apply, in order:

1. **Whole-PO rule:** every ticket on **PO 2001271** is **EWP 11** (its entire scope is EWP 11).
2. **Per-ticket map for PO 2001285:** use the table in Appendix A. Tickets not in it are left
   `ewp_no = null` → they show in the **"Unassigned to EWP"** bucket until coded.
3. All other POs: `ewp_no = null` (they are not broken down by EWP).

Store the 2001285 map as a small editable seed (`lib/ewp/ticket-ewp.ts`) so Mike can extend it
when the client sends new WTP codes — same pattern he uses on the SureLine side.

---

## Part 3 — Ticket Map redesign

Rebuild `app/(authed)/ticket-map/page.tsx` + `components/ticket-map/*` to match the SureLine
layout below. Everything reads from `tickets` (+ `service_pos`), coloured by `approved`
(= `approval_status === 'Approved by Client/PM'`).

### 3.1 Header

- Title **"Ticket Map"**.
- Subtitle: *"Every field ticket, coloured by client approval status (Approved by Client/PM =
  green)"*.
- Right-side actions: a link to the vendor/PO view, and a **"Print unapproved"** button (§3.6).

### 3.2 Summary tiles (4, across the top)

| Tile | Value | Sub | Tone |
|---|---|---|---|
| Tickets issued | count | `across N jobs` | neutral |
| Approved by Client/PM | approved count | `X% approved & billable` | **green** |
| Not yet approved | not-approved count | `sent, on hold, or no record` | **red**, emphasised |
| Value at risk | Σ billable of not-approved | `not yet billable` | **red** |

### 3.3 Legend + filter bar (one card)

- Legend: a green chip → **"Approved by Client/PM"**; a red chip → **"not yet approved — at
  risk"**.
- Filters (query-string driven, so each view is a shareable URL): **All tickets** /
  **Not approved only**; then **All jobs** / one chip per job number.

### 3.4 Per-PO cards

One card per PO, ordered with the EWP-tracked PO (2001285) first, then by ticket count.

- **Header:** PO number on top; `(job SL26-###)` in smaller muted text underneath; an amber
  **"tracked by EWP"** badge on 2001285 and 2001271; a neutral **"closed"** badge if closed.
- **Sub-line:** the PO scope/description.
- **Approved-ratio bar:** a thin full-width track; green fill = approved ÷ total. Caption
  `NN% approved · M tickets`. Also show `✓ {approved}` and `✗ {open}` counts (green/red).
- **Chips:** for non-EWP POs, a flex-wrap row of ticket chips (§3.5). For **PO 2001285**, the
  EWP sub-buckets (§3.5.1).

### 3.5 Ticket chips

Small rounded chips, one per ticket, label = ticket number with the `SL26-` prefix stripped:

- **Approved** → green: border `--under`, background `--under-bg`, text `--under`.
- **Not approved** → red: border `--over`, background `--over-bg`, text `--over`.
- `title` (hover) = `"{ticket_number} · {date} · {formatMoney(billable)} · {approval_status ??
  'no approval record'}"`.

### 3.5.1 EWP sub-buckets (PO 2001285 only)

Group the PO's tickets by `ewp_no` into bordered boxes, EWP number ascending, the **Unassigned**
box last:

- Box header: **"EWP #{n}"** bold + the EWP title (Appendix B) muted; right-aligned
  `{count} · {formatMoney(sum)}`. Amber left border (`--amber`).
- Unassigned box: header **"Unassigned to EWP"** in warn colour, warn left border, a small
  note **"⚠ No WTP number yet."**, then the chips.
- Chips inside each box exactly as §3.5.

### 3.6 Print-unapproved report

A **"Print unapproved"** button that `window.print()`s a **print-only** report (hidden on
screen; the interactive map is hidden when printing). Mirror the SureLine one:

- Title **"Unapproved Tickets — Value at Risk"**, project name + client, generated date,
  not-approved count, and total value at risk in the header.
- One section per PO (largest at-risk first): heading `PO — scope · job`, right-aligned
  `count · total`; then a table with columns **Ticket / Date / Approval status / Billable**.
- A bold **"Total value at risk"** line at the bottom. SureLine-style footer.
- Print CSS: pin light colours (a dark-mode screen must not print dark), `print-color-adjust:
  exact`, and **draw the bars/chips with SVG or borders, not CSS background-color** — browsers
  drop backgrounds from print. (SureLine learned this the hard way; the chips already use
  border + bg, so give them a visible border so they survive greyscale.)

### 3.7 Footer note

*"Green tickets are Approved by Client/PM and can be billed. Red tickets are not yet approved —
sent to the client, on hold, or with no row in the export — and represent {value at risk} that
cannot be invoiced until approval lands. Source: client Aimsio 'Office Approval Status' export."*

---

## Part 4 — Design tokens

The SureLine palette (map to your Tailwind theme or add as CSS variables):

| Role | Light hex | Background |
|---|---|---|
| Approved / under (green) | `#1f8a4c` | `#e8f5ed` |
| Not approved / over (red) | `#d8442f` | `#fdecea` |
| Warn / unassigned (amber-brown) | `#b8770a` | `#fdf3e0` |
| Brand amber (badges, bars) | `#f5b119` | — |
| Amber-700 (section headings) | `#a86f00` | — |

Chips and bars must read in **both light and dark mode** and survive **greyscale printing** —
never colour-only; the green/red is always backed by position (approved vs open bucket) and the
hover/label text.

---

## Acceptance criteria

1. Dropping the four Aimsio CSVs (`1285/1278/1271/1280`) imports/updates tickets; the Ticket Map
   and vendor view reflect them with no code edits.
2. Green = *Approved by Client/PM* exactly; everything else red. Voided tickets excluded.
3. PO 2001285 shows EWP sub-buckets (#4/#5/#8/#12/#13/#22 + Unassigned); PO 2001271's tickets
   all show under EWP 11.
4. "Value at risk" = Σ billable of not-approved tickets, matching the tiles and the print report.
5. "Print unapproved" produces a clean, light, greyscale-safe PDF grouped by PO.
6. A later PDF upload for a ticket that was CSV-imported replaces the status-only row and keeps
   its approval_status/ewp_no.

---

## Appendix A — PO 2001285 ticket → EWP (current)

Seed `lib/ewp/ticket-ewp.ts`. Extend when the client sends new WTP codes; unmapped 2001285
tickets stay Unassigned.

```ts
export const TICKET_EWP: Record<string, number> = {
  'SL26-101-000-001': 8,  'SL26-101-000-002': 8,  'SL26-101-000-003': 8,
  'SL26-101-000-004': 8,  'SL26-101-000-005': 8,  'SL26-101-000-006': 8,
  'SL26-101-000-007': 8,  'SL26-101-000-008': 8,  'SL26-101-000-009': 8,
  'SL26-101-000-010': 8,  'SL26-101-000-011': 8,  'SL26-101-000-012': 8,
  'SL26-101-000-013': 13, 'SL26-101-000-014': 8,  'SL26-101-000-015': 8,
  'SL26-101-000-016': 8,  'SL26-101-000-017': 8,  'SL26-101-000-018': 8,
  'SL26-101-000-019': 8,  'SL26-101-000-020': 8,  'SL26-101-000-021': 8,
  'SL26-101-000-022': 8,  'SL26-101-000-023': 8,  'SL26-101-000-024': 5,
  'SL26-101-000-025': 5,  'SL26-101-000-026': 5,  'SL26-101-000-027': 8,
  'SL26-101-000-028': 4,  'SL26-101-000-030': 8,  'SL26-101-000-031': 5,
  'SL26-101-000-032': 8,  'SL26-101-000-033': 8,  'SL26-101-000-034': 8,
  'SL26-101-000-035': 4,  'SL26-101-000-036': 22, 'SL26-101-000-037': 13,
  'SL26-101-000-038': 5,  'SL26-101-000-039': 8,  'SL26-101-000-040': 12,
  'SL26-101-000-041': 13,
}
// Whole-PO rule (applied in code, not in this map): every ticket on PO 2001271 -> EWP 11.
```

## Appendix B — EWP titles (for PO 2001285 bucket headers)

```ts
export const EWP_LABEL: Record<number, string> = {
  4: 'Start Air Receiver Skid',
  5: 'Concrete',
  8: 'North-South Rack',
  11: 'Buried Facilities',        // PO 2001271
  12: 'Flare & Rack',
  13: 'Tank Farm / Pump Bldg',
  22: 'Sales Custody Transfer',
}
```

## Appendix C — job → PO map (fallback if filename lacks a PO number)

```
SL26-101 -> PUR-6540-2001285
SL26-095 -> PUR-6540-2001278
SL26-085 -> PUR-6540-2001271   (whole PO = EWP 11)
SL26-010 -> PUR-6540-2001280   (also spans closed PO 2000943 — cannot split per ticket;
                                keep on 2001280 and do not overwrite 2000943)
SL26-047 -> PUR-6540-2001171
```

# NAEP Field Cost Tracker — Reconciliation status

_Last updated 2026-07-30 alongside migration 0015 (`sync_job_tickets`)._

## Aimsio CSV atomic-replace: expected before/after per job

The old importer looped row-by-row and upserted by exact `ticket_number`. It
never deleted, and it never saw rows that existed in the portal but had been
removed from a newer Aimsio export. Two failure modes surfaced across the four
jobs on Aitken Creek:

- **Balloon** — a job's ticket count in the portal sits _above_ the current
  CSV's row count because prior exports carried more numbers, and the removed
  rows were never cleared.
- **Stall** — a job's ticket count sits _below_ the current CSV because a new
  upload's per-row upsert never touched the legacy rows stranded on the wrong
  PO in the tracker.

Migration 0015 introduces `sync_job_tickets(p_job_prefix, p_po_id, p_tickets,
p_created_by)`. Inside one transaction it DELETEs every ticket whose number
carries the job prefix (both normalized `SL26-101-000-001` form _and_
Aimsio's date-prefixed `06-03-SL26-101-000-001` variant) and INSERTs the
CSV's contents deduped, Void-filtered, and status-translated. The route
(`app/api/tickets/import-status/route.ts`) calls it once per file.

## Targets to verify after the next full CSV import

Mike will re-upload `1285.csv`, `1278.csv`, `1271.csv`, and `1280.csv`; the
atomic replace should produce these counts. Cross-check on the Ticket Map
after the upload lands.

| Job | Portal PO | CSV rows (non-void) | Target unique tickets | Target LEM |
| --- | --- | --- | --- | --- |
| SL26-101 | PUR-6540-2001285 | 67 | 67 | (from CSV) |
| SL26-095 | PUR-6540-2001278 | 50 | 50 | $781,419.68 |
| SL26-085 | PUR-6540-2001271 | 43 | 43 | (from CSV) |
| SL26-010 | PUR-6540-2001280 | 51 (post prefix-collapse) | 51 | $359,937.79 |

Notes on each job:

- **SL26-101 (PO 2001285)** — before this change the portal held 69 tickets
  on 2001285 vs the CSV's 67; two ballooned rows (`SL26-101-000-068`,
  `SL26-101-000-069`) were carryover from an earlier export and cleared on
  the new atomic pass. The 3 strays on 2001285 (`SL26-096-000-001`,
  `SL26-096-000-002`, `SL26-010-000-030`) belong to _other_ jobs; the SL26-010
  CSV's atomic replace pulls its 030 back home to 2001280, and the 096
  tickets will clear when Mike uploads the corresponding SL26-096 CSV.
- **SL26-095 (PO 2001278)** — 50 rows in the current CSV, $781,419.68 total
  billable. This one was already correct pre-change; the atomic pass leaves
  the count identical.
- **SL26-085 (PO 2001271)** — 43 rows in the current CSV; the portal had
  stalled at 25 because the new upload's per-row upsert never touched the
  legacy pending rows on the wrong PO. Atomic replace clears the stale rows
  and inserts the 43 fresh ones. All 43 receive `ewp_no = 11` via the
  whole-PO rule.
- **SL26-010 (PO 2001280)** — the raw CSV includes date-prefixed variants
  like `06-03-SL26-010-000-001` and `06-05-SL26-010-000-001`, which the
  importer now collapses to the single normalized `SL26-010-000-001`. Post
  collapse the target is 51 unique tickets at $359,937.79.

## Non-goals of this change

- Line items and PDF markup are untouched. `sync_job_tickets` only writes
  `aimsio_status`-sourced rows and leaves any `field_ticket` /
  `master_ticket` sibling under a different `ticket_number` alone.
- Cross-job strays that don't have a matching CSV in the batch (e.g.
  SL26-096 rows on 2001285) stay put until their own SL26-096 CSV is
  uploaded. That's by design — the RPC only deletes tickets that belong to
  the job whose CSV is being imported.
- The Ticket Map colouring rule is unchanged. A ticket goes green only when
  Aimsio's `Office Approval Status = 'Approved by Client/PM'`, per Ticket
  Map spec §3.2.

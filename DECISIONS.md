# Decisions

## 2026-07-29 — Aimsio CSV import: atomic replace-per-job

**What the current import does wrong.** The Aimsio CSV import route
(`app/api/tickets/import-status/route.ts`) loops row-by-row over each
uploaded CSV, looks up every ticket by its exact `ticket_number`, and
either UPDATEs the row in place or INSERTs a fresh one. It never DELETEs,
and it never sees rows that used to exist in the portal but have been
removed from the vendor's newer export — orphan tickets from prior
imports simply survive forever. It also treats date-prefixed variants
(`06-03-SL26-010-000-001` vs `SL26-010-000-001`) as distinct ticket
numbers rather than as the same underlying ticket. Two failure modes fall
out: a job's ticket count *balloons* when Sureline revises an export
downward (SL26-101 sits at 69 in the portal but the current CSV has 67 —
rows `...068` and `...069` are stale carry-over from an earlier export
that included more numbers), and a job's ticket count *stalls* when a new
export completely fails to overwrite (SL26-085 sits at 25 while the
current CSV has 43 rows — the new upload's per-row upsert never touched
the 25 legacy pending rows on the wrong PO). Fix: make the whole import
atomic per job — inside a single DB transaction (a `SECURITY DEFINER`
Postgres function called via Supabase RPC), delete every ticket whose
number contains the job prefix (matching both normalized and
date-prefixed forms), then insert the current CSV's contents deduplicated
by normalized number with `Status = 'Void'` OR `CP Approval Status =
'Void'` rows excluded before either operation.

# Decisions

## 2026-08-04 — Date-prefixed Aimsio ticket numbers are distinct tickets

**Correction to the 2026-07-29 entry.** The earlier atomic-replace design
said date-prefixed variants like `06-05-SL26-010-000-001` were the "same
underlying ticket" as the plain `SL26-010-000-001` and should be collapsed
by normalizing away the date prefix. That was wrong. In the SL26-010 CSV
those three rows all carry their own distinct `WMT/Master WMT GUID`, their
own workday, and their own dollar total — Aimsio uses the date prefix to
distinguish separate tickets that reuse a base number, not to mark
duplicates. Collapsing them by normalized name was silently dropping ~$25k
of real approved work per import.

**Fix.** `ticket_number` is now stored verbatim from the CSV, including any
Aimsio date prefix. `stripDatePrefix` is still called at read time — but
only for job-prefix detection and EWP lookup, both of which need the
`SL26-NNN` core regardless of what comes before it. The atomic DELETE
still uses `LIKE '%SL26-NNN-%'`, so it clears both the plain and the
prefixed forms in one pass; the INSERT then writes each row back under its
own raw name. Collisions on the raw name (a genuine duplicate row within
one CSV) remain last-wins with a logged warning, but that path is now
rare.

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

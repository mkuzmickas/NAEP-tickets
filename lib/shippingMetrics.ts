// Pure client-safe math for the shipping tracker. Keeps the formula out of
// lib/shippingTracker.ts, which pulls in Supabase server code and can't be
// imported from a client component (any transitive next/headers import kills
// the build).

import type { TrackerPackage } from '@/lib/shippingTracker';

/**
 * Single source of truth for the tracker's cost metrics. Shared by the KPI
 * tiles on the tracker page and by the pill on the Est. Actual chart so
 * those two numbers can't drift.
 *
 * All numbers are honest — no budget floor. If invoices haven't landed
 * yet on a shipped package, that shows as "invoiced under" (not fake
 * savings, but also not a fake overrun). If invoices came in over
 * budget, that overshoot is a realized overrun and counts.
 *
 *   totalActual   = Σ actual across every package                  — matches vendor page's Incurred to Date
 *   invoicedCount = # packages where actual > 0                    — packages we've actually seen billing on
 *   overrun       = Σ max(0, actual − budget_total) across ALL     — sum of realized overshoots only
 *                    packages where actual > 0                       (never negative — invoice lag doesn't fake savings)
 *   shippedNotInvoicedCount / Budget = packages whose baseline
 *                    has passed and no invoices have landed yet
 *   fac           = totalBudget + overrun                          — assumes: past overruns stick, everything
 *                                                                    else (shipped-not-invoiced + future) holds budget
 */
export function computeShippingMetrics(packages: TrackerPackage[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString().slice(0, 10);

  let totalBudget = 0;
  let totalActual = 0;
  let shippedBudget = 0;
  let shippedActual = 0;
  let shippedPkgCount = 0;

  let invoicedCount = 0;
  let overCount = 0;
  let overSum = 0;
  let underCount = 0;
  let underSum = 0;
  let shippedNotInvoicedCount = 0;
  let shippedNotInvoicedBudget = 0;

  for (const p of packages) {
    totalBudget += p.budget_total;
    totalActual += p.actual;

    const baseline = p.baseline_ship_date ?? p.planned_ship_date;
    const dueByNow = !!baseline && baseline <= todayIso;
    const shipped = !!p.actual_ship_date;
    const isShipped = dueByNow || shipped;

    if (isShipped) {
      shippedBudget += p.budget_total;
      shippedActual += p.actual;
      shippedPkgCount += 1;
    }

    if (p.actual > 0) {
      invoicedCount += 1;
      const delta = p.actual - p.budget_total;
      if (delta > 0) {
        overCount += 1;
        overSum += delta;
      } else if (delta < 0) {
        underCount += 1;
        underSum += -delta;
      }
    } else if (isShipped) {
      shippedNotInvoicedCount += 1;
      shippedNotInvoicedBudget += p.budget_total;
    }
  }

  const overrun = overSum; // Σ realized overshoots only, always ≥ 0
  const fac = totalBudget + overrun; // total budget + locked-in overruns

  return {
    totalBudget,
    totalActual,
    shippedBudget,
    shippedActual,
    shippedPkgCount,
    invoicedCount,
    overCount,
    overSum,
    underCount,
    underSum,
    shippedNotInvoicedCount,
    shippedNotInvoicedBudget,
    overrun,
    fac,
  };
}

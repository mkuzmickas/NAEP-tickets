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
 *   isShipped(p)  = actual_ship_date is set OR baseline (or fallback
 *                    planned) date has already passed
 *   effective(p)  = max(actual, budget_total) — budget is treated as a
 *                    floor so packages waiting on LaPrairie invoices
 *                    don't fake as savings
 *   overrun       = Σ effective(p) − Σ budget_total(p)  for shipped
 *   fac           = Σ effective(p) for shipped
 *                    + Σ budget_total(p) for un-shipped
 *                    (i.e. past overruns stick, future packages assumed
 *                     to hold budget)
 */
export function computeShippingMetrics(packages: TrackerPackage[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString().slice(0, 10);

  let totalBudget = 0;
  let totalActual = 0;
  let shippedBudget = 0;
  let shippedActual = 0;
  let shippedEffective = 0;
  let shippedPkgCount = 0;
  let overCount = 0;
  let overSum = 0;
  let underOrPendingCount = 0;
  let fac = 0;

  for (const p of packages) {
    totalBudget += p.budget_total;
    totalActual += p.actual;

    const baseline = p.baseline_ship_date ?? p.planned_ship_date;
    const dueByNow = !!baseline && baseline <= todayIso;
    const shipped = !!p.actual_ship_date;
    const isShipped = dueByNow || shipped;
    const effective = Math.max(p.actual, p.budget_total);

    if (isShipped) {
      shippedBudget += p.budget_total;
      shippedActual += p.actual;
      shippedEffective += effective;
      shippedPkgCount += 1;
      if (p.actual > p.budget_total) {
        overCount += 1;
        overSum += p.actual - p.budget_total;
      } else {
        underOrPendingCount += 1;
      }
      fac += effective;
    } else {
      fac += p.budget_total;
    }
  }

  return {
    totalBudget,
    totalActual,
    shippedBudget,
    shippedActual,
    shippedPkgCount,
    overCount,
    overSum,
    underOrPendingCount,
    overrun: shippedEffective - shippedBudget,
    fac,
  };
}

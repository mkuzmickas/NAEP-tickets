// =============================================================================
// Per-vendor display flags
// =============================================================================
// Some vendors don't bill on field tickets at all — their LEM is driven by
// a weekly cost report (budget + actuals per EWP, written straight into
// `service_pos.ap_invoiced_amount`). Showing a "N tickets · N approved"
// column for them is actively misleading: it's always 0 or an unrelated
// legacy snapshot. Flag those vendors here so the vendor dashboard and
// the printed report can hide ticket chrome and switch to a portfolio
// summary layout.
//
// Add a slug here when you onboard another vendor whose workflow is
// cost-report-driven. Remove it if a vendor ever switches to tickets.
// Pure data — safe to import from server and client components.
// =============================================================================

export const COST_REPORT_VENDOR_SLUGS = new Set<string>([
  'medallion-energy',
]);

export function isCostReportVendor(slug: string): boolean {
  return COST_REPORT_VENDOR_SLUGS.has(slug);
}

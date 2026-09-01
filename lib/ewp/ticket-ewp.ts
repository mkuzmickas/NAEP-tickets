/**
 * EWP seed maps for the Ticket Map / Aimsio-CSV import pipeline.
 *
 * The Aimsio "Office Approval Status" CSV export has no EWP column — EWP
 * mapping is derived from the six-digit WBS activity code (Phase Code) on
 * each ticket's Labour lines in Aimsio's detailed export. First two digits
 * of the six-digit code = EWP. Four-digit codes (2002 First Nation, 5000/5002
 * 3rd Party, 1002 Non-Billable) are excluded as overhead.
 *
 * Regenerate from the Aimsio exports with scratchpad/aimsio-reload/parse.mjs
 * whenever Mike drops a new pair of exports.
 */

// Appendix A — PO 2001285 ticket → EWP (current). Keys are the base ticket
// number as written on the Aimsio CSV, with any leading date prefix stripped.
// Tickets with no Labour rows in the detailed export (Non-recurring Billables
// / Per Diem / Miscellaneous only, or voided drafts) stay absent and render in
// the 'Unassigned to EWP' bucket on the Ticket Map.
export const TICKET_EWP: Record<string, number> = {
  'SL26-101-000-001': 8,
  'SL26-101-000-002': 8,
  'SL26-101-000-003': 8,
  'SL26-101-000-004': 8,
  'SL26-101-000-005': 8,
  'SL26-101-000-006': 8,
  'SL26-101-000-007': 8,
  'SL26-101-000-008': 8,
  'SL26-101-000-009': 8,
  'SL26-101-000-010': 8,
  'SL26-101-000-011': 8,
  'SL26-101-000-012': 8,
  'SL26-101-000-013': 8,
  'SL26-101-000-014': 8,
  'SL26-101-000-015': 8,
  'SL26-101-000-016': 8,
  'SL26-101-000-017': 8,
  'SL26-101-000-018': 8,
  'SL26-101-000-019': 8,
  'SL26-101-000-020': 8,
  'SL26-101-000-021': 8,
  'SL26-101-000-022': 8,
  'SL26-101-000-023': 8,
  'SL26-101-000-024': 8,
  'SL26-101-000-025': 5,
  'SL26-101-000-026': 8,
  'SL26-101-000-027': 8,
  'SL26-101-000-028': 8,
  'SL26-101-000-030': 8,
  'SL26-101-000-031': 8,
  'SL26-101-000-032': 4,
  'SL26-101-000-033': 8,
  'SL26-101-000-034': 8,
  'SL26-101-000-035': 8,
  'SL26-101-000-036': 8,
  'SL26-101-000-037': 8,
  'SL26-101-000-038': 8,
  'SL26-101-000-039': 13,
  'SL26-101-000-041': 8,
  'SL26-101-000-042': 13,
  'SL26-101-000-043': 13,
  'SL26-101-000-044': 13,
  'SL26-101-000-046': 13,
  'SL26-101-000-047': 13,
  'SL26-101-000-048': 13,
  'SL26-101-000-049': 8,
  'SL26-101-000-050': 8,
  'SL26-101-000-051': 8,
  'SL26-101-000-052': 8,
  'SL26-101-000-053': 13,
  'SL26-101-000-054': 13,
  'SL26-101-000-055': 8,
  'SL26-101-000-056': 8,
  'SL26-101-000-057': 18,
  'SL26-101-000-058': 8,
  'SL26-101-000-059': 8,
  'SL26-101-000-060': 18,
  'SL26-101-000-061': 8,
  'SL26-101-000-063': 8,
  'SL26-101-000-064': 8,
  'SL26-101-000-065': 5,
  'SL26-101-000-066': 8,
  'SL26-101-000-067': 5,
  'SL26-101-000-068': 5,
  'SL26-101-000-069': 8,
  'SL26-101-000-070': 5,
  'SL26-101-000-071': 13,
  'SL26-101-000-072': 5,
  'SL26-101-000-073': 8,
  'SL26-101-000-074': 5,
  'SL26-101-000-075': 4,
  'SL26-101-000-077': 8,
  'SL26-101-000-078': 5,
  'SL26-101-000-079': 8,
  'SL26-101-000-081': 5,
  'SL26-101-000-082': 8,
  'SL26-101-000-083': 13,
  'SL26-101-000-084': 5,
  'SL26-101-000-086': 8,
  'SL26-101-000-087': 5,
  'SL26-101-000-088': 5,
  'SL26-101-000-089': 4,
  'SL26-101-000-090': 8,
  'SL26-101-000-093': 37,
  'SL26-101-000-094': 8,
  'SL26-101-000-095': 5,
  'SL26-101-000-097': 5,
  'SL26-101-000-098': 8,
  'SL26-101-000-099': 14,
  'SL26-101-000-100': 5,
  'SL26-101-000-101': 8,
  'SL26-101-000-102': 5,
  'SL26-101-000-103': 8,
  'SL26-101-000-104': 14,
  'SL26-101-000-105': 5,
  'SL26-101-000-106': 18,
  'SL26-101-000-107': 8,
  'SL26-101-000-108': 8,
  'SL26-101-000-109': 5,
  'SL26-101-000-111': 8,
  'SL26-101-000-112': 14,
  'SL26-101-000-113': 5,
  'SL26-101-000-114': 8,
  'SL26-101-000-115': 5,
  'SL26-101-000-116': 8,
  'SL26-101-000-117': 5,
  'SL26-101-000-118': 14,
  'SL26-101-000-119': 5,
  'SL26-101-000-120': 13,
  'SL26-101-000-121': 5,
  'SL26-101-000-122': 5,
  'SL26-101-000-123': 13,
  'SL26-101-000-124': 5,
  'SL26-101-000-125': 8,
  'SL26-101-000-126': 14,
  'SL26-101-000-127': 14,
  'SL26-101-000-128': 18,
  'SL26-101-000-129': 12,
  'SL26-101-000-130': 8,
  'SL26-101-000-131': 55,
  'SL26-101-000-132': 5,
  'SL26-101-000-134': 55,
  'SL26-101-000-135': 18,
  'SL26-101-000-136': 12,
  'SL26-101-000-137': 8,
  'SL26-101-000-138': 18,
  'SL26-101-000-139': 14,
  'SL26-101-000-140': 5,
  'SL26-101-000-141': 55,
  'SL26-101-000-142': 18,
  'SL26-101-000-143': 12,
  'SL26-101-000-144': 8,
  'SL26-101-000-146': 5,
  'SL26-101-000-147': 25,
  'SL26-101-000-148': 14,
  'SL26-101-000-149': 5,
  'SL26-101-000-150': 55,
  'SL26-101-000-151': 18,
  'SL26-101-000-152': 12,
  'SL26-101-000-153': 8,
  'SL26-101-000-154': 5,
  'SL26-101-000-155': 18,
  'SL26-101-000-156': 12,
  'SL26-101-000-157': 55,
  'SL26-101-000-158': 14,
  'SL26-101-000-159': 55,
  'SL26-101-000-160': 12,
  'SL26-101-000-161': 8,
  'SL26-101-000-163': 5,
  'SL26-101-000-164': 14,
  'SL26-101-000-165': 12,
  'SL26-101-000-166': 8,
  'SL26-101-000-167': 5,
  'SL26-101-000-168': 14,
  'SL26-101-000-169': 18,
  'SL26-101-000-170': 14,
  'SL26-101-000-171': 18,
  'SL26-101-000-172': 12,
  'SL26-101-000-173': 8,
  'SL26-101-000-174': 5,
  'SL26-101-000-177': 14,
  'SL26-101-000-178': 18,
  'SL26-101-000-179': 13,
  'SL26-101-000-180': 8,
  'SL26-101-000-181': 14,
  'SL26-101-000-182': 18,
  'SL26-101-000-183': 14,
  'SL26-101-000-184': 18,
  'SL26-101-000-185': 5,
  'SL26-101-000-186': 14,
  'SL26-101-000-187': 18,
  'SL26-101-000-188': 8,
  'SL26-101-000-189': 5,
  'SL26-101-000-190': 18,
  'SL26-101-000-191': 14,
  'SL26-101-000-192': 18,
  'SL26-101-000-193': 18,
  'SL26-101-000-194': 8,
  'SL26-101-000-195': 13,
  'SL26-101-000-196': 18,
  'SL26-101-000-197': 14,
  'SL26-101-000-198': 14,
  'SL26-101-000-199': 18,
  'SL26-101-000-200': 5,
  'SL26-101-000-201': 14,
  'SL26-101-000-202': 18,
  'SL26-101-000-203': 8,
  'SL26-101-000-204': 14,
  'SL26-101-000-205': 18,
  'SL26-101-000-206': 8,
  'SL26-101-000-207': 5,
  'SL26-101-000-210': 5,
  'SL26-101-000-211': 14,
  'SL26-101-000-212': 18,
  'SL26-101-000-213': 13,
  'SL26-101-000-214': 8,
  'SL26-101-000-215': 18,
  'SL26-101-000-216': 14,
  'SL26-101-000-217': 5,
  'SL26-101-000-218': 8,
  'SL26-101-000-219': 14,
  'SL26-101-000-220': 18,
  'SL26-101-000-222': 5,
  'SL26-101-000-223': 14,
  'SL26-101-000-224': 18,
  'SL26-101-000-225': 14,
  'SL26-101-000-226': 14,
  'SL26-101-000-227': 18,
  'SL26-101-000-228': 18,
  'SL26-101-000-229': 5,
  'SL26-101-000-230': 14,
  'SL26-101-000-231': 5,
  'SL26-101-000-232': 5,
  'SL26-101-000-233': 5,
  'SL26-101-000-234': 5,
  'SL26-101-000-235': 18,
  'SL26-101-000-236': 14,
  'SL26-101-000-237': 18,
  'SL26-101-000-238': 19,
  'SL26-101-000-239': 5,
  'SL26-101-000-243': 14,
  'SL26-101-000-244': 15,
  'SL26-101-000-245': 18,
  'SL26-101-000-246': 5,
};

// Tickets whose Labour rows span more than one EWP.
export const TICKET_EWP_MULTIPLE: Set<string> = new Set([
]);

// Appendix B — EWP titles, matched to the SureLine portal's own labels.
export const EWP_LABEL: Record<number, string> = {
  4: 'Start Air Receiver Skid',
  5: 'Concrete',
  8: 'North South Pipe Rack Mods',
  11: 'Buried Facilities', // whole-PO rule: PUR-6540-2001271
  12: 'Flare, LP/HP FKO, Rack, Surge Drum',
  13: 'Tank Farm, Pump Bldg, VRU, Surge Drum',
  14: 'Gens and Power Dist',
  15: 'EWP-15',
  18: 'KBZ 1&2, Rack, and Lube Oil Coolant Stn.',
  19: 'EWP-19',
  22: 'Sales Gas Skid & Building',
  25: 'EWP-25',
  37: 'EWP-37',
  55: 'EWP-55',
};

// Appendix C — Job → PO fallback, used only when the CSV filename doesn't
// carry a PO number.
export const JOB_TO_PO: Record<string, string> = {
  'SL26-101': 'PUR-6540-2001285',
  'SL26-095': 'PUR-6540-2001278',
  'SL26-085': 'PUR-6540-2001271',
  'SL26-010': 'PUR-6540-2001280',
  'SL26-047': 'PUR-6540-2001171',
};

// -----------------------------------------------------------------------------
// Helpers (unchanged from spec)
// -----------------------------------------------------------------------------

export function stripDatePrefix(ticketNumber: string): string {
  const i = ticketNumber.indexOf('SL26-');
  return i >= 0 ? ticketNumber.slice(i) : ticketNumber;
}

export function jobFromTicketNumber(ticketNumber: string): string | null {
  const base = stripDatePrefix(ticketNumber);
  const m = base.match(/^(SL26-\d{3})/);
  return m ? m[1] : null;
}

export function poFromCsvFilename(filename: string): string | null {
  const stem = filename.replace(/\.[^.]+$/, '');
  const m = stem.match(/(\d{3,})\s*$/);
  if (!m) return null;
  return `PUR-6540-200${m[1]}`;
}

export function ewpForTicket(
  poNumber: string,
  ticketNumber: string
): number | null {
  if (poNumber === 'PUR-6540-2001271') return 11;
  if (poNumber === 'PUR-6540-2001285') {
    return TICKET_EWP[stripDatePrefix(ticketNumber)] ?? null;
  }
  return null;
}

export function isMultipleEwpTicket(
  poNumber: string,
  ticketNumber: string
): boolean {
  if (poNumber !== 'PUR-6540-2001285') return false;
  return TICKET_EWP_MULTIPLE.has(stripDatePrefix(ticketNumber));
}

export const EWP_NUMBERS: number[] = Object.keys(EWP_LABEL)
  .map(Number)
  .sort((a, b) => a - b);
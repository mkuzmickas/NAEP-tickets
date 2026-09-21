/**
 * Shipping bucket rules — used by both the CSV export and the card view on
 * the Shipping Tracker page so a package rolls into the same bucket in both
 * places. New tags that don't match any rule stay as their own bucket, so
 * a new family shows up as its own card rather than silently disappearing.
 * Order matters: first match wins.
 */
export function bucketOf(tag: string): string {
  const t = tag.trim();

  if (/^\s*750\s*bbl\s*tank/i.test(t)) return '750 bbl Tanks';
  if (/BTEX/i.test(t)) return 'BTEX Tanks';

  // All MCC packages (KBZ MCC, Oil Battery MCC, Recycle Compressor MCC, etc.)
  // Runs before the KBZ N rule so "KBZ MCC" doesn't get swept into "KBZ 1"
  // via the digit that follows.
  if (/\bMCC\b/i.test(t)) return 'MCCs';

  // KBZ 1 / KBZ 2 / KBZ 3 → separate buckets per unit
  const kbz = t.match(/^KBZ\s*(\d+)/i);
  if (kbz) return `KBZ ${kbz[1]}`;

  if (/BelAir/i.test(t)) return 'BelAir Generators';

  // OPSCO Sales Skid family (all Loads collapse into one bucket).
  // Matches either "OPSCO ... Sales Skid" or "Sales Skid (OPSCO)".
  if (/Sales Skid.*OPSCO|OPSCO.*Sales Skid/i.test(t)) return 'OPSCO Sales Skid';

  // MOD-111xx family (all North South Rack modules) into a single bucket.
  // Runs before the general MOD-\d+ rule so MOD-11101/11102/…/11113 all
  // land here; MOD-30701/30702/… still bucket per module below.
  if (/^MOD-111\d*/i.test(t)) return 'MOD-111x';

  const mod = t.match(/^(MOD-\d+)/);
  if (mod) return mod[1];

  if (/Flare KO Drum/i.test(t)) return 'Flare KO Drums';
  if (/Flare Stack/i.test(t)) return 'Flare Stack';
  if (/Fuel Gas Conditioning/i.test(t)) return 'Fuel Gas Conditioning';
  if (/Coolant.*Lube Oil|Lube Oil/i.test(t)) return 'Coolant / Lube Oil';
  if (/Start Air Skid/i.test(t)) return 'Start Air Skid';
  if (/Skim.?Slop|Skip.?Slop/i.test(t)) return 'Skim Slop Pump';

  return t;
}

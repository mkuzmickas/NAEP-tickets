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

  // KBZ MCC must come before "KBZ N" so it isn't swept up by the digit rule.
  if (/^KBZ\s*MCC/i.test(t)) return 'KBZ MCC';
  const kbz = t.match(/^KBZ\s*(\d+)/i);
  if (kbz) return `KBZ ${kbz[1]}`;

  if (/BelAir/i.test(t)) return 'BelAir Generators';

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

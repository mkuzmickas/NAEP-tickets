import type { ParsedLineItem, ParsedTicket } from './types';

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function normalize(parsed: ParsedTicket): {
  ticket: ParsedTicket;
  warnings: string[];
} {
  const warnings: string[] = [];

  const items: ParsedLineItem[] = parsed.line_items.map((li) => {
    const source = round2(li.source_amount);
    const markup = li.markup_percent ?? 0;
    const expectedFinal = round2(source * (1 + markup / 100));
    let final = round2(li.final_amount);

    if (Math.abs(expectedFinal - final) >= 0.005) {
      warnings.push(
        `Line "${li.description || li.category}": model final_amount $${final.toFixed(2)} doesn't match source × markup ($${expectedFinal.toFixed(2)}). Recomputed.`
      );
      final = expectedFinal;
    }

    return {
      ...li,
      source_amount: source,
      markup_percent: markup,
      final_amount: final,
    };
  });

  switch (parsed.format_hint) {
    case 'energetic':
      validateEnergetic(items, warnings);
      break;
    case 'albright':
      validateAlbright(items, warnings);
      break;
    case 'surepoint':
      validateSurepoint(items, warnings);
      break;
  }

  return {
    ticket: { ...parsed, line_items: items, face_value: round2(parsed.face_value) },
    warnings,
  };
}

function validateEnergetic(items: ParsedLineItem[], warnings: string[]) {
  const equipment = items.filter((li) => li.category === 'equipment').length;
  const labour = items.filter((li) => li.category === 'labour').length;
  if (equipment !== 1) {
    warnings.push(
      `Energetic format expects exactly 1 equipment line (hydrovac hours incl. fuel surcharge); got ${equipment}.`
    );
  }
  if (labour > 1) {
    warnings.push(
      `Energetic format expects at most 1 labour line (swamper); got ${labour}.`
    );
  }
}

function validateAlbright(items: ParsedLineItem[], warnings: string[]) {
  const nonMaterials = items.filter((li) => li.category !== 'materials').length;
  if (nonMaterials > 0) {
    warnings.push(
      `Albright tickets normally have only Materials lines (vac truck loads); found ${nonMaterials} non-materials line(s).`
    );
  }
}

function validateSurepoint(items: ParsedLineItem[], warnings: string[]) {
  const counts: Record<string, number> = {
    labour: 0,
    equipment: 0,
    materials: 0,
    loa_other: 0,
  };
  for (const li of items) counts[li.category]++;
  for (const [cat, n] of Object.entries(counts)) {
    if (n > 1) {
      warnings.push(
        `Surepoint format expects one rolled-up ${cat} line per ticket; got ${n}. Consider merging.`
      );
    }
  }
}

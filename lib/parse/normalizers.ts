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

  // Defense in depth: Albright invoices have Energetic hydrovac BOLs attached
  // as backup on pages 2+ of the PDF. Those BOLs belong to Energetic's own
  // tickets (already on file), NOT to the Albright invoice. If the parser
  // still picked them up despite the prompt instructions, strip them here
  // before the dedupe check flags them as collisions.
  if (
    parsed.format_hint === 'albright' &&
    (parsed.is_master || parsed.bol_numbers.length > 0)
  ) {
    warnings.push(
      `Albright invoices do not consolidate BOLs — the ${parsed.bol_numbers.length} BOL number(s) visible on backup pages belong to Energetic's hydrovac tickets and were stripped from this Albright ticket.`
    );
    parsed = { ...parsed, is_master: false, bol_numbers: [] };
  }

  // Deduplicate bol_numbers — if the parser listed the same BOL twice within
  // one master ticket's own list, treat it as a parser error: silently keep
  // only the first occurrence and warn the user. Without this, the second
  // copy passes checkDuplicates (it's not in the DB), then trips the unique
  // constraint at commit and surfaces as a misleading "already on file" 409.
  let bol_numbers = parsed.bol_numbers;
  if (parsed.is_master && bol_numbers.length > 0) {
    const seen = new Set<string>();
    const unique: string[] = [];
    const duplicates: string[] = [];
    for (const b of bol_numbers) {
      if (seen.has(b)) {
        duplicates.push(b);
      } else {
        seen.add(b);
        unique.push(b);
      }
    }
    if (duplicates.length > 0) {
      warnings.push(
        `BOL number(s) appeared multiple times within this ticket's own list — auto-deduplicated: ${Array.from(new Set(duplicates)).join(', ')}. Likely a parser error; the cleaned list is below.`
      );
      bol_numbers = unique;
    }
  }

  return {
    ticket: {
      ...parsed,
      line_items: items,
      face_value: round2(parsed.face_value),
      bol_numbers,
    },
    warnings,
  };
}

function validateEnergetic(items: ParsedLineItem[], warnings: string[]) {
  // Energetic tickets — a single hydrovac BOL, a single water-haul BOL, or
  // an MT-prefixed master that consolidates 5-15 BOLs (sometimes hydrovac +
  // water haul mixed). Line-item shape is NOT rigid: one line per
  // (work-type, rate) group. What we DO catch is the fudge line the LLM
  // used to invent when the prompt forced sum(items) == face_value —
  // strip it out and re-surface the real mismatch so the UI shows it.
  const fudgePattern = /roundin|reconcil|adjustment|fudge|balancing|difference|discrepan|plug/i;
  const fudge = items.filter((li) => fudgePattern.test(li.description || ''));
  if (fudge.length > 0) {
    warnings.push(
      `Removed ${fudge.length} fabricated reconciliation line(s) from the parse — these are LLM fudges, not real charges on the PDF: ${fudge
        .map((f) => `"${f.description}" ($${f.source_amount.toFixed(2)})`)
        .join(', ')}. The visible face-value gap that surfaces after removal is the real parser gap; investigate rather than adding it back.`
    );
    // Remove in place — the caller passes items by reference from normalize().
    let write = 0;
    for (let read = 0; read < items.length; read++) {
      if (!fudgePattern.test(items[read].description || '')) {
        items[write++] = items[read];
      }
    }
    items.length = write;
  }

  const equipment = items.filter((li) => li.category === 'equipment').length;
  const labour = items.filter((li) => li.category === 'labour').length;
  if (equipment < 1) {
    warnings.push(
      `Energetic ticket has no Equipment line — every Energetic BOL bills at least one truck (Hydro Vac, Tank Truck, etc.).`
    );
  }
  if (labour < 1 && equipment >= 1) {
    // Water-haul-only BOLs sometimes ship without a swamper; only flag when
    // there's a hydrovac line present (which always pairs with a swamper).
    const hasHydrovac = items.some(
      (li) =>
        li.category === 'equipment' &&
        /hydro\s*vac|vacuum\s*truck/i.test(li.description || '')
    );
    if (hasHydrovac) {
      warnings.push(
        `Energetic hydrovac ticket has no Swamper labour line — every hydrovac BOL bills a swamper alongside the truck.`
      );
    }
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

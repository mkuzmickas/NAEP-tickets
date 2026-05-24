import Anthropic from '@anthropic-ai/sdk';
import type { ParsedTicket } from './types';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const EXTRACTION_PROMPT = `You are extracting structured cost data from a single Canadian field-services ticket, BOL, or invoice PDF for an Enbridge pipeline construction project (Aitken Creek Expansion).

Return ONLY a JSON object with this exact schema. No markdown, no commentary, no code fences:

{
  "ticket_number": string,
  "ticket_date": string,
  "po_number": string,
  "vendor_guess": string,
  "format_hint": "surepoint" | "goldenbase" | "vector" | "energetic" | "albright" | "generic",
  "face_value": number,
  "is_master": boolean,
  "bol_numbers": string[],
  "line_items": [
    {
      "category": "labour" | "equipment" | "materials" | "loa_other",
      "description": string,
      "quantity": number | null,
      "unit": string | null,
      "rate": number | null,
      "source_amount": number,
      "markup_percent": number,
      "final_amount": number
    }
  ],
  "markup_notes": string
}

Critical rules:
- All amounts must be PRE-TAX (exclude any GST/HST line). face_value is the pre-tax printed total.
- Date must be ISO format YYYY-MM-DD.
- po_number is in format PUR-6540-XXXXXXX. Find it exactly as printed; do not invent.
- ticket_number is the field-ticket #, BOL #, or invoice # as printed.
- final_amount must equal round(source_amount * (1 + markup_percent/100), 2). For lines with no markup, markup_percent=0 and final_amount=source_amount.
- The sum of all line_items[].final_amount MUST equal face_value to the penny.

Vendor format hints (use these to decide line-item granularity):
- surepoint: rolled-up buckets — one line per non-zero category (Labour, Equipment, Materials, LOA/Other). Do not split into per-resource lines.
- goldenbase: per-resource lines — one line per tradesman or equipment unit. Some materials/LOA charges carry +10% markup; split source vs final and set markup_percent=10.
- vector: per-resource lines for survey labour and equipment.
- energetic: hydrovac format — exactly one Equipment line for truck hours (Fuel Surcharge is rolled INTO the equipment total, not a separate line) and one Labour line for swamper hours.
- albright: usually a single Materials line per ticket (waste fluid disposal — vac truck load).
- generic: fall back to category buckets.

Master tickets:
- If the ticket_number starts with "MT" or the document explicitly consolidates multiple BOLs, set is_master=true and put the component BOL numbers in bol_numbers.
- For master tickets, line_items should be the AGGREGATED totals across all consolidated BOLs (not per-BOL detail).
- If not a master ticket, set is_master=false and bol_numbers=[].

LOA/Subsistence goes in category "loa_other".
markup_notes is optional free text — e.g. "third-party materials +10% per PO terms".

Reply with JSON only.`;

export async function extractFromPdf(
  pdfBase64: string,
  filename: string
): Promise<ParsedTicket> {
  const response = await client.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 4096,
    system: [
      {
        type: 'text',
        text: EXTRACTION_PROMPT,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: pdfBase64,
            },
          },
          {
            type: 'text',
            text: `Filename (hint only): ${filename}`,
          },
        ],
      },
    ],
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim();

  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  try {
    return JSON.parse(cleaned) as ParsedTicket;
  } catch {
    throw new Error(`Model returned non-JSON: ${text.slice(0, 300)}`);
  }
}

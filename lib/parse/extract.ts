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
  "markup_notes": string,
  "signature_stamp": {
    "detected": boolean,
    "supervisor": string | null,
    "manager": string | null,
    "stamp_date": string | null,
    "stamp_amount": number | null,
    "signed": boolean
  } | null
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
- albright: the Albright invoice is on PAGE 1 ONLY — usually a single Materials line per ticket (waste fluid disposal — vac truck load). Pages 2+ are Energetic hydrovac BOLs attached as backup proof of what was disposed. IGNORE every page after page 1 when extracting line_items and face_value. Albright invoices are NEVER master tickets and DO NOT consolidate BOLs — the BOL numbers visible on the backup pages belong to Energetic and are already tracked in their own ticket. Always return is_master=false and bol_numbers=[] for Albright, no matter what BOL numbers appear on the backup pages.
- generic: fall back to category buckets.

Master tickets:
- If the ticket_number starts with "MT" or the document explicitly consolidates multiple BOLs, set is_master=true and put the component BOL numbers in bol_numbers.
- For master tickets, line_items should be the AGGREGATED totals across all consolidated BOLs (not per-BOL detail).
- If not a master ticket, set is_master=false and bol_numbers=[].

LOA/Subsistence goes in category "loa_other".
markup_notes is optional free text — e.g. "third-party materials +10% per PO terms".

Signature stamp detection:
- Look for a rectangular box (usually with a red or black border) somewhere on the PDF — typically at the bottom of page 1, or on a separate signature page — titled "Aitken Creek Gas Storage LTD." or containing that phrase in a header.
- The stamp block contains these fields in some arrangement: PN/Unit #, AFE/CC #, PO #, Amount, GL #, Date, Location, Supervisor, Manager, Signature.
- If NO such stamp block is present anywhere on the PDF, set signature_stamp = null (whole object). Do NOT invent fields.
- If the stamp block IS present:
  - Set signature_stamp.detected = true.
  - supervisor: the name in the Supervisor field. Common values are Kip <lastname>, Desmond Meyer, Adrian <lastname>, Taylor <lastname>. If illegible, blank, or scribbled beyond recognition, use null.
  - manager: the name in the Manager field. Often Jade Rowe. Null if illegible.
  - stamp_date: the date printed in the stamp's Date field, ISO YYYY-MM-DD. Null if blank or illegible.
  - stamp_amount: the number in the stamp's Amount field (strip $, commas). Null if blank.
  - signed: true ONLY if there is a handwritten signature, initial, mark, or ink in the Signature field/line. If the Signature line is a bare pre-printed line with nothing on it, set signed = false. When in doubt, set false — a false negative here is safer than a false positive.
- Never guess. Every field on the stamp that you cannot read confidently should be null, not fabricated.

Reply with JSON only.`;

export async function extractFromPdf(
  pdfBase64: string,
  filename: string
): Promise<ParsedTicket> {
  // The @anthropic-ai/sdk 0.30 TypeScript types don't yet include `document`
  // content blocks or `cache_control` on system text. Both are supported by
  // the API at runtime, so we cast past the type check.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const params: any = {
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
  };

  const response = await client.messages.create(params);

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

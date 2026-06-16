import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const PO_EXTRACTION_PROMPT = `You are extracting structured purchase order information from a Canadian procurement PO PDF for an Enbridge pipeline construction project (Aitken Creek Expansion).

Return ONLY a JSON object with this exact schema. No markdown, no commentary, no code fences:

{
  "po_number": string,
  "vendor_legal_name": string,
  "vendor_display_name": string,
  "task_wbs": string,
  "scope": string,
  "committed_amount": number
}

Rules:
- All amounts MUST be PRE-TAX. Exclude any GST/HST line.
- po_number: match the printed value exactly; format is usually PUR-6540-XXXXXXX (PUR-6540 followed by a dash and 7 digits). Do not invent or correct format.
- vendor_legal_name: the formal registered company name (often in ALL CAPS, with suffixes like LTD, INC, LIMITED, ULC).
- vendor_display_name: a short, friendly version (1-3 words) for UI display. Drop suffixes like LTD/INC/LIMITED/SERVICES/SYSTEMS when they make the name awkward. Established conventions:
  - SUREPOINT TECHNOLOGIES GROUP LTD -> Surepoint
  - ENERGETIC SERVICES INC -> Energetic Svcs
  - GOLDEN BASE CONTRACTING LTD -> Golden Base
  - ALBRIGHT FLUSH SYSTEMS LTD -> Albright Flush
  - VECTOR GEOMATICS LAND SURVEYING LTD -> Vector Geomatics
  - LAPRAIRIE CRANE -> LaPrairie Crane
  Apply the same style to unfamiliar vendors.
- task_wbs: WBS/GL/task code, typically formatted like 04.P1.W.WMI.299 or similar. If multiple appear, choose the primary one. If absent, return "".
- scope: a 1-2 sentence description of what the PO covers. Synthesize from the scope/description/work narrative text on the PO.
- committed_amount: the total PO value as cut by procurement (the maximum dollar value committed). Look for "Total Order Value", "PO Total", "Committed Amount", "Total Authorized", or a single grand-total figure on the PO itself. Do NOT use field-order or field-ticket totals — those are individual draws against the PO, not the PO committed amount. If the document is a field ticket rather than a PO, return 0 for committed_amount and put a note in scope saying so.

If a field is genuinely missing from the document, return "" for strings or 0 for committed_amount.

Reply with JSON only.`;

export type ParsedPo = {
  po_number: string;
  vendor_legal_name: string;
  vendor_display_name: string;
  task_wbs: string;
  scope: string;
  committed_amount: number;
};

export async function extractPoFromPdf(
  pdfBase64: string,
  filename: string
): Promise<ParsedPo> {
  // @anthropic-ai/sdk 0.30 types don't include `document` content blocks
  // or `cache_control`. Both are supported by the API at runtime.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const params: any = {
    model: 'claude-opus-4-7',
    max_tokens: 1024,
    system: [
      {
        type: 'text',
        text: PO_EXTRACTION_PROMPT,
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
    return JSON.parse(cleaned) as ParsedPo;
  } catch {
    throw new Error(`Model returned non-JSON: ${text.slice(0, 300)}`);
  }
}

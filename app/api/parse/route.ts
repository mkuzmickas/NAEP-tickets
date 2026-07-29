import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractFromPdf } from '@/lib/parse/extract';
import { normalize } from '@/lib/parse/normalizers';
import { reconcile } from '@/lib/parse/reconcile';
import { checkDuplicates } from '@/lib/parse/dedupe';
import type { ParseResult, SignatureStamp } from '@/lib/parse/types';

/** Detects whether a signer name matches the electrical-work approvers
 *  (Adrian, Taylor) or the general field-work approvers (Kip, Desmond).
 *  Returns 'field', 'electrical', or 'unknown' — the last covers both
 *  illegible names and unrecognised signers who should be flagged for
 *  manual review. */
function classifySigner(
  supervisor: string | null
): 'field' | 'electrical' | 'unknown' {
  if (!supervisor) return 'unknown';
  const n = supervisor.toLowerCase();
  if (/\b(kip|desmond|des)\b/.test(n)) return 'field';
  if (/\b(adrian|taylor)\b/.test(n)) return 'electrical';
  return 'unknown';
}

/** Cross-check the stamp against the PO's vendor + the ticket's own
 *  face_value. Returns any warnings that should surface to the user. */
function checkStamp(
  stamp: SignatureStamp | null | undefined,
  vendorDisplayName: string | null,
  faceValue: number
): string[] {
  const notes: string[] = [];
  if (!stamp || !stamp.detected) return notes;

  // Amount mismatch — stamps sometimes carry the pre-tax amount, tickets
  // sometimes go over. A > $1 gap is worth flagging.
  if (
    stamp.stamp_amount != null &&
    Math.abs(stamp.stamp_amount - faceValue) >= 1.0
  ) {
    notes.push(
      `Stamp amount $${stamp.stamp_amount.toFixed(2)} doesn't match ticket total $${faceValue.toFixed(2)}. Verify the stamp is for the right ticket.`
    );
  }

  // Signer class vs vendor scope. Medallion = electrical; every other
  // vendor tracked = field work. Unknown vendors don't get a check.
  const signerClass = classifySigner(stamp.supervisor);
  const isMedallion =
    (vendorDisplayName ?? '').toLowerCase().includes('medallion');
  const expectedClass: 'field' | 'electrical' = isMedallion
    ? 'electrical'
    : 'field';

  if (signerClass === 'unknown' && stamp.supervisor) {
    notes.push(
      `Signer "${stamp.supervisor}" doesn't match any known approver (Kip, Desmond, Adrian, Taylor). Verify manually.`
    );
  } else if (signerClass !== 'unknown' && signerClass !== expectedClass) {
    notes.push(
      `Signer "${stamp.supervisor}" is an ${signerClass}-work approver but this PO is ${expectedClass} scope. Wrong stamp on the wrong ticket?`
    );
  }

  return notes;
}

export const maxDuration = 60;
export const runtime = 'nodejs';

export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const storagePath = body?.storage_path;
  const filename = typeof body?.filename === 'string' ? body.filename : 'unknown.pdf';

  if (typeof storagePath !== 'string' || !storagePath.startsWith('pending/')) {
    return NextResponse.json(
      { error: 'Missing or invalid storage_path' },
      { status: 400 }
    );
  }

  // Download PDF from storage
  const { data: blob, error: dlErr } = await supabase.storage
    .from('ticket-pdfs')
    .download(storagePath);
  if (dlErr || !blob) {
    console.error('Storage download failed:', dlErr);
    return NextResponse.json(
      { error: `Download failed: ${dlErr?.message ?? 'unknown'}` },
      { status: 500 }
    );
  }

  const arrayBuffer = await blob.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString('base64');

  // Extract via Anthropic
  let parsedRaw;
  try {
    parsedRaw = await extractFromPdf(base64, filename);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('Anthropic extraction failed:', e);
    return NextResponse.json(
      { error: `Extraction failed: ${msg}` },
      { status: 500 }
    );
  }

  // Normalize + reconcile
  const { ticket: normalized, warnings } = normalize(parsedRaw);
  const recon = reconcile(normalized);

  // PO existence + vendor lookup (vendor name feeds the stamp cross-check).
  const { data: poRow } = await supabase
    .from('service_pos')
    .select('po_number, vendor_display_name')
    .eq('po_number', normalized.po_number)
    .maybeSingle();
  const po_exists = !!poRow;
  const vendorDisplayName = poRow?.vendor_display_name ?? null;
  if (!po_exists) {
    warnings.push(`PO ${normalized.po_number} not found in service_pos.`);
  }

  // Stamp cross-check — signer class vs vendor scope + amount vs face_value.
  const stampWarnings = checkStamp(
    normalized.signature_stamp,
    vendorDisplayName,
    normalized.face_value
  );
  warnings.push(...stampWarnings);

  // Dedupe
  const duplicates = await checkDuplicates(normalized);

  const result: ParseResult = {
    storage_path: storagePath,
    parsed: normalized,
    computed_total: recon.computed_total,
    reconciled: recon.reconciled,
    reconcile_diff: recon.diff,
    po_exists,
    duplicates,
    warnings,
  };

  return NextResponse.json(result);
}

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractFromPdf } from '@/lib/parse/extract';
import { normalize } from '@/lib/parse/normalizers';
import { reconcile } from '@/lib/parse/reconcile';
import { checkDuplicates } from '@/lib/parse/dedupe';
import type { ParseResult } from '@/lib/parse/types';

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

  // PO existence
  const { data: poRow } = await supabase
    .from('service_pos')
    .select('po_number')
    .eq('po_number', normalized.po_number)
    .maybeSingle();
  const po_exists = !!poRow;
  if (!po_exists) {
    warnings.push(`PO ${normalized.po_number} not found in service_pos.`);
  }

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

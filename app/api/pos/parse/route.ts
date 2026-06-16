import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractPoFromPdf } from '@/lib/parse/extractPo';

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

  const formData = await req.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }
  const file = formData.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Missing file' }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString('base64');

  try {
    const parsed = await extractPoFromPdf(base64, file.name);
    return NextResponse.json({ ok: true, parsed });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('PO extraction failed:', e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

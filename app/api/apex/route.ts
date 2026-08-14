import { NextResponse } from 'next/server';
import { getApexData } from '@/lib/apex';

export const revalidate = 0;
export const runtime = 'nodejs';

export async function GET() {
  try {
    const data = await getApexData();
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

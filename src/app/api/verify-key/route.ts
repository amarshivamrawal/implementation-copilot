import { NextResponse } from 'next/server';
import { verifyApiKey } from '@/lib/rocketlane';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const apiKey: string = body?.apiKey ?? '';
    const result = await verifyApiKey(apiKey);
    return NextResponse.json(result, { status: result.valid ? 200 : 400 });
  } catch {
    return NextResponse.json({ valid: false, error: 'Invalid request body' }, { status: 400 });
  }
}

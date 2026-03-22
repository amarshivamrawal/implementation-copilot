import { NextResponse } from 'next/server';
import { buildDashboardData } from '@/lib/escalationEngine';

// Simple in-memory cache (server restarts clear it; daily cron revalidates)
let cache: { data: Awaited<ReturnType<typeof buildDashboardData>>; cachedAt: number } | null = null;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function GET(req: Request) {
  const url   = new URL(req.url);
  const force = url.searchParams.get('refresh') === '1';

  if (!force && cache && Date.now() - cache.cachedAt < CACHE_TTL_MS) {
    return NextResponse.json({ ...cache.data, fromCache: true });
  }

  try {
    const data = await buildDashboardData();
    cache      = { data, cachedAt: Date.now() };
    return NextResponse.json({ ...data, fromCache: false });
  } catch (err) {
    console.error('[dashboard] Error building data:', err);
    return NextResponse.json(
      { error: 'Failed to fetch escalation data', detail: String(err) },
      { status: 500 }
    );
  }
}

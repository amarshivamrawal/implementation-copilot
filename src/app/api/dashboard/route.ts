import { NextResponse } from 'next/server';
import { buildDashboardData } from '@/lib/escalationEngine';
import { MOCK_DATA } from '@/lib/mockData';

// Server-side in-memory cache (cleared on restart; refreshed daily)
let cache: { data: Awaited<ReturnType<typeof buildDashboardData>>; cachedAt: number } | null = null;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export async function GET(req: Request) {
  const url   = new URL(req.url);
  const force = url.searchParams.get('refresh') === '1';
  const demo  = url.searchParams.get('demo') === '1';

  // ── Explicit demo mode only ───────────────────────────────────────────────
  if (demo) {
    return NextResponse.json({
      ...MOCK_DATA,
      lastRefreshedAt: new Date().toISOString(),
      fromCache: false,
      demo: true,
    });
  }

  // ── Cache hit ─────────────────────────────────────────────────────────────
  if (!force && cache && Date.now() - cache.cachedAt < CACHE_TTL_MS) {
    return NextResponse.json({ ...cache.data, fromCache: true, demo: false });
  }

  // ── Missing credentials: fail clearly; never substitute sample data ─────
  if (!process.env.ROCKETLANE_API_KEY) {
    cache = null;
    return NextResponse.json(
      {
        error: 'Rocketlane API key is not configured.',
        code: 'MISSING_CREDENTIALS',
      },
      { status: 503 },
    );
  }

  // ── Live fetch ────────────────────────────────────────────────────────────
  try {
    const data = await buildDashboardData();

    // A successful fetch with zero matching projects is a valid live result.
    // Cache and return the empty result instead of replacing it with demo data.
    cache = { data, cachedAt: Date.now() };
    return NextResponse.json({ ...data, fromCache: false, demo: false });
  } catch (err) {
    // Never leave previously cached live data available after a failed refresh;
    // doing so can make stale information appear current on the next request.
    cache = null;
    console.error('[dashboard] Live fetch failed:', err);

    return NextResponse.json(
      {
        error: 'Live Rocketlane fetch failed. Please retry after checking the integration.',
        code: 'LIVE_FETCH_FAILED',
      },
      { status: 502 },
    );
  }
}

import { NextResponse } from 'next/server';
import { buildDashboardData } from '@/lib/escalationEngine';
import { MOCK_DATA } from '@/lib/mockData';

// Server-side in-memory cache (cleared on restart; refreshed daily)
let cache: { data: Awaited<ReturnType<typeof buildDashboardData>>; cachedAt: number } | null = null;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export async function GET(req: Request) {
  const url     = new URL(req.url);
  const force   = url.searchParams.get('refresh') === '1';
  const demo    = url.searchParams.get('demo') === '1';

  // ── Demo mode: return rich mock data ─────────────────────────────────────
  if (demo) {
    return NextResponse.json({ ...MOCK_DATA, lastRefreshedAt: new Date().toISOString(), fromCache: false, demo: true });
  }

  // ── Cache hit ─────────────────────────────────────────────────────────────
  if (!force && cache && Date.now() - cache.cachedAt < CACHE_TTL_MS) {
    return NextResponse.json({ ...cache.data, fromCache: true });
  }

  // ── No API key: return demo data so the UI is never blank ─────────────────
  if (!process.env.ROCKETLANE_API_KEY) {
    return NextResponse.json({
      ...MOCK_DATA,
      lastRefreshedAt: new Date().toISOString(),
      fromCache: false,
      demo: true,
    });
  }

  // ── Live fetch ────────────────────────────────────────────────────────────
  try {
    const data = await buildDashboardData();

    // If live Rocketlane returns zero flagged projects fall back to demo so
    // the dashboard is never visually empty during first run / testing.
    if (data.projects.length === 0) {
      return NextResponse.json({
        ...MOCK_DATA,
        lastRefreshedAt: new Date().toISOString(),
        fromCache: false,
        demo: true,
      });
    }

    cache = { data, cachedAt: Date.now() };
    return NextResponse.json({ ...data, fromCache: false });
  } catch (err) {
    console.error('[dashboard] Live fetch failed, falling back to demo data:', err);
    // On error also return demo data so the dashboard stays usable
    return NextResponse.json({
      ...MOCK_DATA,
      lastRefreshedAt: new Date().toISOString(),
      fromCache: false,
      demo: true,
      liveError: String(err),
    });
  }
}

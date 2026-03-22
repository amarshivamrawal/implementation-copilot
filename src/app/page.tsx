'use client';
import { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw, AlertCircle, Loader2, ShieldAlert,
  Clock, CheckCircle2,
} from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import type { DashboardData, EscalationRisk } from '@/types';

// Extend the API response type with optional demo flags
type ApiResponse = DashboardData & { fromCache?: boolean; demo?: boolean; liveError?: string };
import SummaryCards from '@/components/SummaryCards';
import EscalationTable from '@/components/EscalationTable';
import FilterBar, { type Filters } from '@/components/FilterBar';

const REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

const EMPTY_FILTERS: Filters = {
  search:       '',
  pm:           [],
  ps:           [],
  ic:           [],
  riskLevel:    [],
  reasons:      [],
  practiceType: [],
};

function applyFilters(risks: EscalationRisk[], filters: Filters): EscalationRisk[] {
  return risks.filter((r) => {
    const { search, pm, ps, ic, riskLevel, reasons, practiceType } = filters;

    if (search) {
      const q = search.toLowerCase();
      const hit =
        r.project.name.toLowerCase().includes(q) ||
        r.topCustomerPoc.toLowerCase().includes(q) ||
        (r.project.sourceSoftware ?? '').toLowerCase().includes(q) ||
        (r.project.businessType ?? '').toLowerCase().includes(q) ||
        (r.project.servicesTeam ?? '').toLowerCase().includes(q) ||
        (r.project.pm ?? '').toLowerCase().includes(q) ||
        (r.project.ps ?? '').toLowerCase().includes(q) ||
        (r.project.ic ?? '').toLowerCase().includes(q) ||
        (r.project.customer?.name ?? '').toLowerCase().includes(q);
      if (!hit) return false;
    }

    if (riskLevel.length && !riskLevel.includes(r.riskLevel)) return false;
    if (pm.length  && !pm.includes(r.project.pm ?? ''))  return false;
    if (ps.length  && !ps.includes(r.project.ps ?? ''))  return false;
    if (ic.length  && !ic.includes(r.project.ic ?? ''))  return false;
    if (practiceType.length && !practiceType.includes(r.project.category ?? '')) return false;

    if (reasons.length) {
      const projectReasons = (r.project.customFields?.escalationReasons as string[]) ?? [];
      const hasAny = reasons.some((req) => projectReasons.includes(req));
      if (!hasAny) return false;
    }

    return true;
  });
}

export default function DashboardPage() {
  const [data,      setData]      = useState<ApiResponse | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [filters,   setFilters]   = useState<Filters>(EMPTY_FILTERS);

  const fetchData = useCallback(async (force = false) => {
    try {
      force ? setRefreshing(true) : setLoading(true);
      setError(null);
      const res = await fetch(`/api/dashboard${force ? '?refresh=1' : ''}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const json: ApiResponse = await res.json();
      setData(json);
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => { fetchData(); }, [fetchData]);

  // Auto-refresh every 24 hours
  useEffect(() => {
    const timer = setInterval(() => fetchData(true), REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [fetchData]);

  const filteredRisks = data ? applyFilters(data.projects, filters) : [];

  // ── Sort: CRITICAL → HIGH → MEDIUM → LOW, then by delay count ────────────
  const ORDER: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  const sortedRisks = [...filteredRisks].sort((a, b) => {
    const lvl = (ORDER[a.riskLevel] ?? 9) - (ORDER[b.riskLevel] ?? 9);
    if (lvl !== 0) return lvl;
    return b.responseDelays.length - a.responseDelays.length;
  });

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-red-500 rounded-lg p-2">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">Escalation Risks Tracker</h1>
              <p className="text-xs text-slate-500 hidden sm:block">
                In-progress Base Application projects · Rocketlane + OneDrive
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {data && (
              <p className="text-xs text-slate-400 hidden md:flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                Refreshed {formatDistanceToNow(parseISO(data.lastRefreshedAt), { addSuffix: true })}
              </p>
            )}
            <button
              onClick={() => fetchData(true)}
              disabled={refreshing || loading}
              className="flex items-center gap-2 px-3 py-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
              {refreshing
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <RefreshCw className="w-4 h-4" />}
              {refreshing ? 'Refreshing…' : 'Refresh Now'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Loading state */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <Loader2 className="w-10 h-10 animate-spin text-brand-500 mb-4" />
            <p className="text-lg font-medium">Scanning Rocketlane projects…</p>
            <p className="text-sm mt-1">Analysing messages, chats, and call recordings</p>
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-800">Failed to load dashboard</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
              <p className="text-xs text-red-500 mt-2">
                Make sure <code className="bg-red-100 px-1 rounded">ROCKETLANE_API_KEY</code> is set in{' '}
                <code className="bg-red-100 px-1 rounded">.env.local</code>
              </p>
              <button
                onClick={() => fetchData(true)}
                className="mt-3 text-sm text-red-700 hover:text-red-900 underline"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {/* Data loaded */}
        {data && !loading && (
          <>
            {/* Demo mode banner */}
            {data.demo && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3 text-sm">
                <span className="text-amber-600 font-bold text-base">⚠</span>
                <div>
                  <span className="font-semibold text-amber-800">Demo mode — </span>
                  <span className="text-amber-700">
                    {data.liveError
                      ? `Live fetch failed (${data.liveError}). Showing sample data.`
                      : 'No live projects matched the filter (in-progress + name ends with "Base App"). Showing sample data.'}
                  </span>
                  <span className="text-amber-600 ml-2">Once real RL projects are in scope, this banner disappears automatically.</span>
                </div>
              </div>
            )}

            {/* Summary cards */}
            <SummaryCards summary={data.summary} />

            {/* Auto-refresh notice */}
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Clock className="w-3.5 h-3.5" />
              Dashboard auto-refreshes every 24 hours. Showing {filteredRisks.length} of{' '}
              {data.projects.length} at-risk project{data.projects.length !== 1 ? 's' : ''}.
            </div>

            {/* Filters */}
            <FilterBar
              filters={filters}
              onChange={setFilters}
              risks={data.projects}
            />

            {/* Results count */}
            {(filters.search || Object.values(filters).some((v) => Array.isArray(v) && v.length > 0)) && (
              <p className="text-sm text-slate-500">
                Showing <strong className="text-slate-800">{sortedRisks.length}</strong> results
                {sortedRisks.length !== data.projects.length && (
                  <> of <strong className="text-slate-800">{data.projects.length}</strong> total</>
                )}
              </p>
            )}

            {/* Main table */}
            <EscalationTable risks={sortedRisks} />
          </>
        )}
      </main>
    </div>
  );
}

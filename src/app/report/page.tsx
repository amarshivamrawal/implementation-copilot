'use client';
import { useState, useEffect, useCallback } from 'react';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import {
  Printer, ArrowLeft, ShieldAlert, AlertTriangle,
  Clock, MessageSquare, FolderOpen, ExternalLink,
  Loader2, AlertCircle,
} from 'lucide-react';
import Link from 'next/link';
import type { DashboardData, EscalationRisk, RiskLevel } from '@/types';

type ApiResponse = DashboardData & { fromCache?: boolean; demo?: boolean; liveError?: string };

const RISK_ORDER: Record<RiskLevel, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

const RISK_STYLE: Record<RiskLevel, { badge: string; section: string; heading: string; dot: string }> = {
  CRITICAL: {
    badge:   'bg-red-100 text-red-700 border border-red-200',
    section: 'border-l-4 border-red-500 bg-red-50/30',
    heading: 'text-red-700',
    dot:     'bg-red-500',
  },
  HIGH: {
    badge:   'bg-orange-100 text-orange-700 border border-orange-200',
    section: 'border-l-4 border-orange-400 bg-orange-50/30',
    heading: 'text-orange-700',
    dot:     'bg-orange-400',
  },
  MEDIUM: {
    badge:   'bg-amber-100 text-amber-700 border border-amber-200',
    section: 'border-l-4 border-amber-400 bg-amber-50/30',
    heading: 'text-amber-700',
    dot:     'bg-amber-400',
  },
  LOW: {
    badge:   'bg-green-100 text-green-700 border border-green-200',
    section: 'border-l-4 border-green-400 bg-green-50/30',
    heading: 'text-green-700',
    dot:     'bg-green-400',
  },
};

function formatTs(iso: string): string {
  try { return format(parseISO(iso), 'MMM d, yyyy h:mm a'); }
  catch { return iso; }
}

function SentimentChip({ label }: { label: string }) {
  const color =
    label === 'AGITATED'    ? 'bg-red-100 text-red-700' :
    label === 'OVERWHELMED' ? 'bg-purple-100 text-purple-700' :
    label === 'FRUSTRATED'  ? 'bg-orange-100 text-orange-700' :
                              'bg-green-100 text-green-700';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${color}`}>
      {label}
    </span>
  );
}

function MetricCard({ label, value, icon: Icon, color, bg }: {
  label: string; value: number; icon: React.ElementType; color: string; bg: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center bg-white border border-slate-200 rounded-xl p-4 text-center print:rounded-none print:border-slate-300">
      <div className={`${bg} rounded-full p-2 mb-2`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-slate-500 mt-0.5 leading-tight">{label}</p>
    </div>
  );
}

function ProjectCard({ risk }: { risk: EscalationRisk }) {
  const s = RISK_STYLE[risk.riskLevel];
  const reasons: string[] = (risk.project.customFields?.escalationReasons as string[]) ?? [];

  return (
    <div className={`rounded-xl overflow-hidden ${s.section} print:rounded-none print:break-inside-avoid`}>
      {/* Project header */}
      <div className="px-5 pt-4 pb-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${s.dot}`} />
              <h3 className="font-bold text-slate-900 text-base leading-tight">
                {risk.project.rlProjectUrl ? (
                  <a
                    href={risk.project.rlProjectUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline text-brand-600 print:text-slate-900 flex items-center gap-1"
                  >
                    {risk.project.name}
                    <ExternalLink className="w-3.5 h-3.5 flex-shrink-0 print:hidden" />
                  </a>
                ) : risk.project.name}
              </h3>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${s.badge}`}>
                <span className={`w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-70`} />
                {risk.riskLevel}
              </span>
            </div>

            {/* Customer POC */}
            <p className="text-sm text-slate-600 mt-1.5">
              <span className="font-medium">Customer POC:</span>{' '}
              {risk.topCustomerPoc || '—'}
              {risk.topCustomerPocEmail && (
                <span className="text-slate-400"> · {risk.topCustomerPocEmail}</span>
              )}
            </p>
          </div>
        </div>

        {/* Metadata grid */}
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-slate-600 bg-white/60 rounded-lg px-3 py-2 print:bg-transparent">
          {risk.project.pm && <span><span className="font-semibold text-slate-500">PM</span> {risk.project.pm}</span>}
          {risk.project.ps && <span><span className="font-semibold text-slate-500">PS</span> {risk.project.ps}</span>}
          {risk.project.ic && <span><span className="font-semibold text-slate-500">IC</span> {risk.project.ic}</span>}
          {risk.project.netMrr && (
            <span><span className="font-semibold text-slate-500">MRR</span> ${risk.project.netMrr.toLocaleString()}</span>
          )}
          {risk.project.numberOfCenters && (
            <span><span className="font-semibold text-slate-500">Centers</span> {risk.project.numberOfCenters}</span>
          )}
          {risk.project.sourceSoftware && (
            <span><span className="font-semibold text-slate-500">Source SW</span> {risk.project.sourceSoftware}</span>
          )}
          {risk.project.businessType && (
            <span><span className="font-semibold text-slate-500">Business</span> {risk.project.businessType}</span>
          )}
          {risk.project.servicesTeam && (
            <span><span className="font-semibold text-slate-500">Team</span> {risk.project.servicesTeam}</span>
          )}
        </div>

        {/* Escalation reasons */}
        {reasons.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {reasons.map((r) => (
              <span key={r} className="text-xs bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-full">
                {r}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Response delays */}
      {risk.responseDelays.length > 0 && (
        <div className="px-5 pb-3">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            Response Delays
            <span className="bg-amber-100 text-amber-700 rounded-full px-1.5 text-xs font-semibold">{risk.responseDelays.length}</span>
          </h4>
          <div className="space-y-2">
            {risk.responseDelays.map((d, i) => (
              <div key={i} className="bg-white rounded-lg border border-amber-100 px-3 py-2.5 print:border-slate-200">
                <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                  <span className="text-xs font-semibold text-slate-700">{d.customerPocName}</span>
                  <span className="text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                    {d.delayDays}d unanswered
                  </span>
                </div>
                <p className="text-xs text-slate-600 italic line-clamp-2">&ldquo;{d.customerMessageContent}&rdquo;</p>
                <div className="flex items-center justify-between gap-2 mt-1.5 text-xs text-slate-400 flex-wrap">
                  <span>Sent {formatTs(d.customerMessageAt)}</span>
                  <span className={d.zenotiResponseAt ? 'text-green-600' : 'text-red-500 font-medium'}>
                    {d.zenotiResponseAt
                      ? `Responded ${formatTs(d.zenotiResponseAt)}`
                      : `No response yet · delayed by ${d.delayedBy}`}
                  </span>
                </div>
                {d.chatLink && (
                  <a
                    href={d.chatLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-1.5 text-xs text-brand-600 hover:underline print:hidden"
                  >
                    View in Rocketlane <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Customer signals */}
      {risk.customerSignals.length > 0 && (
        <div className="px-5 pb-4">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-purple-500" />
            Customer Sentiment Signals
            <span className="bg-purple-100 text-purple-700 rounded-full px-1.5 text-xs font-semibold">{risk.customerSignals.length}</span>
          </h4>
          <div className="space-y-2">
            {risk.customerSignals.map((sig, i) => (
              <div key={i} className="bg-white rounded-lg border border-purple-100 px-3 py-2.5 print:border-slate-200">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <SentimentChip label={sig.sentiment.label} />
                  <span className="text-xs font-semibold text-slate-700">{sig.authorName}</span>
                  <span className="text-xs text-slate-400">
                    {sig.sourceType === 'VTT' ? `@ ${sig.messageAt}` : formatTs(sig.messageAt)}
                  </span>
                  <span className="text-xs text-slate-400 ml-auto">
                    Score: {Math.round(sig.sentiment.score * 100)}%
                  </span>
                </div>
                <p className="text-xs text-slate-600 italic line-clamp-2">&ldquo;{sig.messageContent}&rdquo;</p>
                {sig.sentiment.matchedKeywords.length > 0 && (
                  <p className="text-xs text-slate-400 mt-1">
                    Keywords: {sig.sentiment.matchedKeywords.join(', ')}
                  </p>
                )}
                <div className="flex items-center justify-between mt-1.5 flex-wrap gap-1">
                  <span className="text-xs text-slate-400">{sig.sourceLabel}</span>
                  {sig.sourceLink && (
                    <a
                      href={sig.sourceLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-brand-600 hover:underline print:hidden"
                    >
                      View source <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function groupByRisk(projects: EscalationRisk[]): [RiskLevel, EscalationRisk[]][] {
  const map = new Map<RiskLevel, EscalationRisk[]>();
  const sorted = [...projects].sort((a, b) => (RISK_ORDER[a.riskLevel] ?? 9) - (RISK_ORDER[b.riskLevel] ?? 9));
  for (const p of sorted) {
    const arr = map.get(p.riskLevel) ?? [];
    arr.push(p);
    map.set(p.riskLevel, arr);
  }
  return Array.from(map.entries());
}

function execSummary(data: DashboardData): string {
  const { summary } = data;
  const parts: string[] = [];
  parts.push(
    `${summary.totalProjects} project${summary.totalProjects !== 1 ? 's' : ''} are currently in active implementation.`
  );
  if (summary.criticalRisks > 0) {
    parts.push(
      `${summary.criticalRisks} project${summary.criticalRisks !== 1 ? 's are' : ' is'} at CRITICAL risk and require immediate attention.`
    );
  }
  if (summary.highRisks > 0) {
    parts.push(
      `${summary.highRisks} project${summary.highRisks !== 1 ? 's are' : ' is'} at HIGH risk.`
    );
  }
  if (summary.totalDelays > 0) {
    parts.push(
      `${summary.totalDelays} unanswered customer message${summary.totalDelays !== 1 ? 's have' : ' has'} exceeded the 2-day response threshold.`
    );
  }
  if (summary.totalAgitatedSignals > 0) {
    parts.push(
      `${summary.totalAgitatedSignals} negative sentiment signal${summary.totalAgitatedSignals !== 1 ? 's have' : ' has'} been detected across project chats and call recordings.`
    );
  }
  if (summary.criticalRisks === 0 && summary.highRisks === 0) {
    parts.push('No critical or high-risk projects are currently flagged.');
  }
  return parts.join(' ');
}

export default function ReportPage() {
  const [data,    setData]    = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/dashboard');
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      setData(await res.json());
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const grouped = data ? groupByRisk(data.projects) : [];
  const reportDate = data ? format(parseISO(data.lastRefreshedAt), 'MMMM d, yyyy') : '';
  const reportTime = data ? format(parseISO(data.lastRefreshedAt), 'h:mm a z') : '';

  return (
    <div className="min-h-screen bg-white">

      {/* Screen-only toolbar */}
      <div className="print:hidden sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Print or save as PDF</span>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
              <Printer className="w-4 h-4" />
              Print / Save PDF
            </button>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-24 text-slate-500 print:hidden">
          <Loader2 className="w-10 h-10 animate-spin text-brand-500 mb-4" />
          <p className="text-lg font-medium">Loading report data…</p>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="max-w-4xl mx-auto px-6 py-10 print:hidden">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-red-800">Failed to load report data</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
              <button onClick={fetchData} className="mt-3 text-sm text-red-700 hover:text-red-900 underline">
                Try again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report body */}
      {data && !loading && (
        <div className="max-w-4xl mx-auto px-6 py-8 space-y-8 print:px-0 print:py-0 print:space-y-6">

          {/* ── Report header ────────────────────────────────────────────────── */}
          <div className="border-b-2 border-slate-900 pb-6 print:pb-4">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="bg-red-500 rounded-lg p-2 print:hidden">
                  <ShieldAlert className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 leading-tight">
                    Escalation Risks Report
                  </h1>
                  <p className="text-sm text-slate-500 mt-0.5">
                    Services Operations Center · In-progress Base Application Projects
                  </p>
                </div>
              </div>
              <div className="text-right text-xs text-slate-500 space-y-0.5">
                <p className="font-semibold text-slate-700 text-sm">{reportDate}</p>
                <p>Data as of {reportTime}</p>
                {data.fromCache && <p className="text-slate-400">Served from cache</p>}
                {data.demo && (
                  <p className="text-amber-600 font-medium">Demo data</p>
                )}
              </div>
            </div>
          </div>

          {/* ── Executive summary ────────────────────────────────────────────── */}
          <section>
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-3">
              Executive Summary
            </h2>
            <p className="text-slate-700 leading-relaxed text-sm bg-slate-50 rounded-xl px-5 py-4 border border-slate-100 print:bg-transparent print:border-slate-200 print:rounded-none">
              {execSummary(data)}
            </p>
          </section>

          {/* ── Metrics ─────────────────────────────────────────────────────── */}
          <section>
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-3">
              Key Metrics
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <MetricCard label="In-Progress Projects"   value={data.summary.totalProjects}        icon={FolderOpen}      color="text-brand-600"   bg="bg-brand-50" />
              <MetricCard label="Critical Risks"          value={data.summary.criticalRisks}        icon={AlertTriangle}   color="text-red-600"     bg="bg-red-50" />
              <MetricCard label="High Risks"              value={data.summary.highRisks}            icon={AlertTriangle}   color="text-orange-600"  bg="bg-orange-50" />
              <MetricCard label="Response Delays (>2d)"  value={data.summary.totalDelays}          icon={Clock}           color="text-amber-600"   bg="bg-amber-50" />
              <MetricCard label="Agitation Signals"       value={data.summary.totalAgitatedSignals} icon={MessageSquare}   color="text-purple-600"  bg="bg-purple-50" />
            </div>
          </section>

          {/* ── Risk breakdown table ─────────────────────────────────────────── */}
          <section>
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-3">
              Risk Breakdown
            </h2>
            <div className="overflow-hidden rounded-xl border border-slate-200 print:rounded-none">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Project</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Customer POC</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Team</th>
                    <th className="text-center px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Delays</th>
                    <th className="text-center px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Signals</th>
                    <th className="text-center px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Risk</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[...data.projects]
                    .sort((a, b) => (RISK_ORDER[a.riskLevel] ?? 9) - (RISK_ORDER[b.riskLevel] ?? 9))
                    .map((risk) => {
                      const s = RISK_STYLE[risk.riskLevel];
                      return (
                        <tr key={risk.project.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-3">
                            <p className="font-medium text-slate-800 text-sm">{risk.project.name}</p>
                            {risk.project.netMrr && (
                              <p className="text-xs text-slate-400 mt-0.5">
                                ${(risk.project.netMrr / 1000).toFixed(1)}K MRR · {risk.project.numberOfCenters ?? '?'} centers
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm text-slate-700">{risk.topCustomerPoc || '—'}</p>
                            {risk.topCustomerPocEmail && (
                              <p className="text-xs text-slate-400 truncate max-w-[160px]">{risk.topCustomerPocEmail}</p>
                            )}
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell">
                            <p className="text-xs text-slate-600">
                              {[risk.project.pm, risk.project.ps, risk.project.ic].filter(Boolean).join(' · ') || '—'}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {risk.responseDelays.length > 0
                              ? <span className="font-semibold text-amber-600">{risk.responseDelays.length}</span>
                              : <span className="text-slate-300">—</span>}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {risk.customerSignals.length > 0
                              ? <span className="font-semibold text-purple-600">{risk.customerSignals.length}</span>
                              : <span className="text-slate-300">—</span>}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${s.badge}`}>
                              {risk.riskLevel}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </section>

          {/* ── Project details grouped by risk level ────────────────────────── */}
          <section className="space-y-8">
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest">
              Detailed Project Analysis
            </h2>

            {grouped.map(([level, projects]) => {
              const s = RISK_STYLE[level];
              return (
                <div key={level} className="space-y-4 print:break-before-auto">
                  <div className="flex items-center gap-3">
                    <h3 className={`text-base font-bold ${s.heading}`}>
                      {level} RISK
                    </h3>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${s.badge}`}>
                      {projects.length} project{projects.length !== 1 ? 's' : ''}
                    </span>
                    <div className="flex-1 h-px bg-slate-200" />
                  </div>

                  <div className="space-y-4">
                    {projects.map((risk) => (
                      <ProjectCard key={risk.project.id} risk={risk} />
                    ))}
                  </div>
                </div>
              );
            })}
          </section>

          {/* ── Footer ───────────────────────────────────────────────────────── */}
          <footer className="border-t border-slate-200 pt-4 text-xs text-slate-400 flex items-center justify-between flex-wrap gap-2">
            <span>
              Generated {format(new Date(), 'MMMM d, yyyy h:mm a')} · Rocketlane + OneDrive
            </span>
            <span>
              Data refreshed {data ? formatDistanceToNow(parseISO(data.lastRefreshedAt), { addSuffix: true }) : '—'}
            </span>
          </footer>
        </div>
      )}

      {/* Print-specific styles */}
      <style jsx global>{`
        @media print {
          @page { margin: 1.5cm; size: A4; }
          body { font-size: 11pt; }
          .print\\:hidden { display: none !important; }
          a { color: inherit !important; text-decoration: none !important; }
        }
      `}</style>
    </div>
  );
}

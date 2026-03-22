'use client';
import { useState } from 'react';
import { ChevronDown, ChevronRight, ExternalLink, Building2, Users, Server } from 'lucide-react';
import type { EscalationRisk } from '@/types';
import RiskBadge from './RiskBadge';
import DelayList from './DelayList';
import SignalList from './SignalList';

interface Props { risks: EscalationRisk[] }

export default function EscalationTable({ risks }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggleRow(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  if (risks.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-12 text-center text-slate-500">
        <p className="text-lg font-medium">No escalation risks found</p>
        <p className="text-sm mt-1">All matching projects appear to be on track.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Table header */}
      <div className="hidden lg:grid grid-cols-[28px_2fr_1.2fr_1fr_80px_80px_120px_1fr_80px_80px_80px_80px] gap-3 px-4 py-3 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wide">
        <span />
        <span>Project</span>
        <span>Customer POC</span>
        <span>Escalation Reason</span>
        <span>Delays</span>
        <span>Signals</span>
        <span>ARR</span>
        <span>Legacy System</span>
        <span>PM</span>
        <span>PS</span>
        <span>IC</span>
        <span>Risk</span>
      </div>

      <div className="divide-y divide-slate-50">
        {risks.map((risk) => {
          const isOpen = expanded.has(risk.project.id);
          const reasons: string[] = (risk.project.customFields?.escalationReasons as string[]) ?? [];

          return (
            <div key={risk.project.id}>
              {/* Main row */}
              <button
                type="button"
                onClick={() => toggleRow(risk.project.id)}
                className="w-full text-left hover:bg-slate-50/80 transition-colors"
              >
                {/* Mobile card */}
                <div className="lg:hidden p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <a
                        href={risk.project.rlProjectUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="font-semibold text-brand-600 hover:underline flex items-center gap-1"
                      >
                        {risk.project.name}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                      <p className="text-xs text-slate-500 mt-0.5">{risk.topCustomerPoc}</p>
                    </div>
                    <RiskBadge level={risk.riskLevel} />
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                    {risk.project.arr && <span>ARR: <strong>${risk.project.arr.toLocaleString()}</strong></span>}
                    {risk.project.numberOfCenters && <span>Centers: <strong>{risk.project.numberOfCenters}</strong></span>}
                    {risk.project.pm && <span>PM: <strong>{risk.project.pm}</strong></span>}
                    {risk.project.ps && <span>PS: <strong>{risk.project.ps}</strong></span>}
                    {risk.project.ic && <span>IC: <strong>{risk.project.ic}</strong></span>}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    {risk.responseDelays.length > 0 && <span className="text-amber-600">{risk.responseDelays.length} delay(s)</span>}
                    {risk.customerSignals.length > 0 && <span className="text-purple-600">{risk.customerSignals.length} signal(s)</span>}
                    <span className="ml-auto">{isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}</span>
                  </div>
                </div>

                {/* Desktop row */}
                <div className="hidden lg:grid grid-cols-[28px_2fr_1.2fr_1fr_80px_80px_120px_1fr_80px_80px_80px_80px] gap-3 px-4 py-3.5 items-center text-sm">
                  <span className="text-slate-400">
                    {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </span>

                  {/* Project name + link */}
                  <span>
                    <a
                      href={risk.project.rlProjectUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="font-medium text-brand-600 hover:underline flex items-center gap-1"
                    >
                      <span className="truncate">{risk.project.name}</span>
                      <ExternalLink className="w-3 h-3 flex-shrink-0" />
                    </a>
                    {risk.project.numberOfCenters && (
                      <span className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                        <Building2 className="w-3 h-3" />
                        {risk.project.numberOfCenters} centers
                      </span>
                    )}
                  </span>

                  {/* Customer POC */}
                  <span>
                    <p className="font-medium text-slate-800 truncate">{risk.topCustomerPoc || '—'}</p>
                    {risk.topCustomerPocEmail && (
                      <p className="text-xs text-slate-400 truncate">{risk.topCustomerPocEmail}</p>
                    )}
                  </span>

                  {/* Escalation reasons */}
                  <span>
                    <div className="flex flex-col gap-1">
                      {reasons.slice(0, 2).map((r) => (
                        <span key={r} className="inline-block text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                          {r}
                        </span>
                      ))}
                      {reasons.length > 2 && (
                        <span className="text-xs text-slate-400">+{reasons.length - 2} more</span>
                      )}
                    </div>
                  </span>

                  {/* Delays */}
                  <span>
                    {risk.responseDelays.length > 0 ? (
                      <span className="font-semibold text-amber-600">{risk.responseDelays.length}</span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </span>

                  {/* Signals */}
                  <span>
                    {risk.customerSignals.length > 0 ? (
                      <span className="font-semibold text-purple-600">{risk.customerSignals.length}</span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </span>

                  {/* ARR */}
                  <span className="font-medium text-slate-700">
                    {risk.project.arr
                      ? `$${(risk.project.arr / 1000).toFixed(0)}K`
                      : <span className="text-slate-300">—</span>}
                  </span>

                  {/* Legacy system */}
                  <span>
                    {risk.project.legacySourceSystem ? (
                      <span className="flex items-center gap-1 text-xs text-slate-600">
                        <Server className="w-3 h-3 text-slate-400" />
                        {risk.project.legacySourceSystem}
                      </span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </span>

                  {/* PM */}
                  <span className="text-xs text-slate-600 truncate">{risk.project.pm || <span className="text-slate-300">—</span>}</span>
                  {/* PS */}
                  <span className="text-xs text-slate-600 truncate">{risk.project.ps || <span className="text-slate-300">—</span>}</span>
                  {/* IC */}
                  <span className="text-xs text-slate-600 truncate">{risk.project.ic || <span className="text-slate-300">—</span>}</span>

                  {/* Risk level */}
                  <span><RiskBadge level={risk.riskLevel} /></span>
                </div>
              </button>

              {/* Expanded details */}
              {isOpen && (
                <div className="px-6 pb-5 bg-slate-50/50 border-t border-slate-100">
                  <div className="grid md:grid-cols-2 gap-4 pt-4">
                    {risk.responseDelays.length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                          Response Delays
                          <span className="ml-1 bg-amber-100 text-amber-700 rounded-full px-1.5 text-xs">{risk.responseDelays.length}</span>
                        </h4>
                        <DelayList delays={risk.responseDelays} />
                      </div>
                    )}
                    {risk.customerSignals.length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                          Customer Sentiment Signals
                          <span className="ml-1 bg-purple-100 text-purple-700 rounded-full px-1.5 text-xs">{risk.customerSignals.length}</span>
                        </h4>
                        <SignalList signals={risk.customerSignals} />
                      </div>
                    )}
                  </div>

                  {/* Project metadata footer */}
                  <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500 border-t border-slate-100 pt-3">
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />PM: <strong>{risk.project.pm || 'N/A'}</strong></span>
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />PS: <strong>{risk.project.ps || 'N/A'}</strong></span>
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />IC: <strong>{risk.project.ic || 'N/A'}</strong></span>
                    {risk.project.arr && <span>ARR: <strong>${risk.project.arr.toLocaleString()}</strong></span>}
                    {risk.project.numberOfCenters && <span>Centers: <strong>{risk.project.numberOfCenters}</strong></span>}
                    {risk.project.legacySourceSystem && <span>Legacy System: <strong>{risk.project.legacySourceSystem}</strong></span>}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

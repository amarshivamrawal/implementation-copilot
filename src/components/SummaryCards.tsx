'use client';
import { AlertTriangle, Clock, MessageSquare, FolderOpen } from 'lucide-react';

interface Props {
  summary: {
    totalProjects: number;
    criticalRisks: number;
    highRisks: number;
    totalDelays: number;
    totalAgitatedSignals: number;
  };
}

export default function SummaryCards({ summary }: Props) {
  const cards = [
    {
      label: 'In-Progress Projects',
      value: summary.totalProjects,
      icon:  FolderOpen,
      color: 'text-brand-600',
      bg:    'bg-brand-50',
    },
    {
      label: 'Critical Risks',
      value: summary.criticalRisks,
      icon:  AlertTriangle,
      color: 'text-red-600',
      bg:    'bg-red-50',
    },
    {
      label: 'High Risks',
      value: summary.highRisks,
      icon:  AlertTriangle,
      color: 'text-orange-600',
      bg:    'bg-orange-50',
    },
    {
      label: 'Response Delays (>2d)',
      value: summary.totalDelays,
      icon:  Clock,
      color: 'text-amber-600',
      bg:    'bg-amber-50',
    },
    {
      label: 'Agitation Signals',
      value: summary.totalAgitatedSignals,
      icon:  MessageSquare,
      color: 'text-purple-600',
      bg:    'bg-purple-50',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
      {cards.map((c) => (
        <div key={c.label} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex items-center gap-3">
          <div className={`${c.bg} rounded-lg p-2.5 flex-shrink-0`}>
            <c.icon className={`w-5 h-5 ${c.color}`} />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{c.value}</p>
            <p className="text-xs text-slate-500 leading-tight">{c.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

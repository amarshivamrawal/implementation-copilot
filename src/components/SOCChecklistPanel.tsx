'use client';
import { CheckCircle2, Clock, AlertTriangle, MinusCircle, ExternalLink } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import type { SOCChecklist, SOCChecklistItem, SOCItemStatus } from '@/types';

const STATUS_CONFIG: Record<SOCItemStatus, {
  Icon:    typeof CheckCircle2;
  color:   string;
  bg:      string;
  border:  string;
  pill:    string;
  label:   string;
}> = {
  DONE: {
    Icon:   CheckCircle2,
    color:  'text-green-600',
    bg:     'bg-green-50',
    border: 'border-green-200',
    pill:   'bg-green-100 text-green-700',
    label:  'Done',
  },
  PENDING: {
    Icon:   Clock,
    color:  'text-amber-500',
    bg:     'bg-amber-50',
    border: 'border-amber-200',
    pill:   'bg-amber-100 text-amber-700',
    label:  'Pending',
  },
  OVERDUE: {
    Icon:   AlertTriangle,
    color:  'text-red-600',
    bg:     'bg-red-50',
    border: 'border-red-300',
    pill:   'bg-red-100 text-red-700',
    label:  'Overdue',
  },
  MISSING: {
    Icon:   MinusCircle,
    color:  'text-slate-400',
    bg:     'bg-slate-50',
    border: 'border-slate-200',
    pill:   'bg-slate-100 text-slate-500',
    label:  'Not found',
  },
};

function healthBadgeClass(score: number): string {
  if (score >= 75) return 'bg-green-100 text-green-700';
  if (score >= 50) return 'bg-amber-100 text-amber-700';
  return 'bg-red-100 text-red-700';
}

function formatDate(iso: string): string {
  try { return format(parseISO(iso), 'dd MMM yyyy'); } catch { return iso; }
}

interface Props { checklist: SOCChecklist }

export default function SOCChecklistPanel({ checklist }: Props) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide">
          SOC Milestone Checklist
        </h4>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${healthBadgeClass(checklist.healthScore)}`}>
          {checklist.completedCount}/{checklist.items.length} done · {checklist.healthScore}% health
        </span>
      </div>

      <div className="space-y-2">
        {checklist.items.map((item) => (
          <SOCItem key={item.key} item={item} />
        ))}
      </div>
    </div>
  );
}

function SOCItem({ item }: { item: SOCChecklistItem }) {
  const cfg = STATUS_CONFIG[item.status];
  const { Icon } = cfg;

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg ${cfg.bg} border ${cfg.border}`}>
      <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${cfg.color}`} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-slate-800">{item.label}</span>
          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${cfg.pill}`}>
            {cfg.label}
          </span>
          {item.taskUrl && (
            <a
              href={item.taskUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-0.5 text-xs text-brand-500 hover:underline ml-auto flex-shrink-0"
            >
              View task <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>

        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{item.description}</p>

        {item.dueDate && item.status !== 'DONE' && (
          <p className={`text-xs mt-1 font-medium ${item.status === 'OVERDUE' ? 'text-red-600' : 'text-slate-500'}`}>
            {item.status === 'OVERDUE' ? 'Was due:' : 'Due:'} {formatDate(item.dueDate)}
          </p>
        )}

        {item.status === 'DONE' && item.completedAt && (
          <p className="text-xs mt-1 text-green-600">
            Completed {formatDate(item.completedAt)}
          </p>
        )}

        {item.status === 'MISSING' && (
          <p className="text-xs mt-1 text-slate-400 italic">
            No matching task found — check task naming in Rocketlane
          </p>
        )}
      </div>
    </div>
  );
}

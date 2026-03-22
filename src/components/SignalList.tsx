'use client';
import { MessageSquare, ExternalLink } from 'lucide-react';
import type { CustomerSignal } from '@/types';
import { formatDistanceToNow, parseISO } from 'date-fns';

const LABEL_COLOR: Record<string, string> = {
  AGITATED:    'bg-red-50 border-red-200 text-red-900',
  OVERWHELMED: 'bg-purple-50 border-purple-200 text-purple-900',
  FRUSTRATED:  'bg-orange-50 border-orange-200 text-orange-900',
};

const BADGE_COLOR: Record<string, string> = {
  AGITATED:    'bg-red-100 text-red-700',
  OVERWHELMED: 'bg-purple-100 text-purple-700',
  FRUSTRATED:  'bg-orange-100 text-orange-700',
};

interface Props { signals: CustomerSignal[] }

export default function SignalList({ signals }: Props) {
  if (signals.length === 0) return null;

  // Show top 3 by score
  const top = [...signals].sort((a, b) => b.sentiment.score - a.sentiment.score).slice(0, 3);

  return (
    <div className="mt-3 space-y-2">
      {top.map((s, i) => (
        <div key={i} className={`flex items-start gap-3 border rounded-lg p-3 text-xs ${LABEL_COLOR[s.sentiment.label] ?? 'bg-slate-50 border-slate-200 text-slate-800'}`}>
          <MessageSquare className="w-4 h-4 flex-shrink-0 mt-0.5 opacity-70" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${BADGE_COLOR[s.sentiment.label] ?? ''}`}>
                {s.sentiment.label}
              </span>
              <span className="font-semibold">{s.authorName}</span>
              <span className="opacity-60">{s.sourceLabel}</span>
            </div>
            <p className="mt-1 line-clamp-2 opacity-90">"{s.messageContent}"</p>
            {s.sentiment.matchedKeywords.length > 0 && (
              <p className="mt-1 opacity-60">
                Keywords: {s.sentiment.matchedKeywords.slice(0, 4).join(', ')}
              </p>
            )}
            <p className="mt-1 opacity-50">
              {formatDistanceToNow(parseISO(s.messageAt), { addSuffix: true })}
            </p>
          </div>
          <a
            href={s.sourceLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 flex items-center gap-1 px-2 py-1 bg-white/60 hover:bg-white/80 rounded font-medium transition-colors border border-current/20"
          >
            <ExternalLink className="w-3 h-3" />
            Open
          </a>
        </div>
      ))}
    </div>
  );
}

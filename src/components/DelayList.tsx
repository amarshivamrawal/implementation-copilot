'use client';
import { Clock, ExternalLink } from 'lucide-react';
import type { ResponseDelayAlert } from '@/types';
import { formatDistanceToNow, parseISO } from 'date-fns';

interface Props { delays: ResponseDelayAlert[] }

export default function DelayList({ delays }: Props) {
  if (delays.length === 0) return null;

  return (
    <div className="mt-3 space-y-2">
      {delays.map((d, i) => (
        <div key={i} className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs">
          <Clock className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-amber-900">
              {d.delayDays}d delay · From: {d.customerPocName}
            </p>
            <p className="text-amber-700 mt-0.5 line-clamp-2">"{d.customerMessageContent}"</p>
            <p className="text-amber-600 mt-1">
              No reply for <strong>{d.delayDays} days</strong>
              {d.delayedBy !== 'No response yet' && ` · Delayed by: ${d.delayedBy}`}
              {d.delayedBy === 'No response yet' && ' · Still unanswered'}
            </p>
            <p className="text-amber-500 mt-0.5">
              Sent {formatDistanceToNow(parseISO(d.customerMessageAt), { addSuffix: true })}
            </p>
          </div>
          <a
            href={d.chatLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 flex items-center gap-1 px-2 py-1 bg-amber-200 hover:bg-amber-300 text-amber-900 rounded font-medium transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            Open
          </a>
        </div>
      ))}
    </div>
  );
}

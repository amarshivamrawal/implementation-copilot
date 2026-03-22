'use client';
import type { RiskLevel } from '@/types';

const CONFIG: Record<RiskLevel, { label: string; className: string }> = {
  CRITICAL: { label: 'Critical', className: 'bg-red-100 text-red-700 border-red-200' },
  HIGH:     { label: 'High',     className: 'bg-orange-100 text-orange-700 border-orange-200' },
  MEDIUM:   { label: 'Medium',   className: 'bg-amber-100 text-amber-700 border-amber-200' },
  LOW:      { label: 'Low',      className: 'bg-green-100 text-green-700 border-green-200' },
};

export default function RiskBadge({ level }: { level: RiskLevel }) {
  const { label, className } = CONFIG[level];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${className}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1.5 opacity-70" />
      {label}
    </span>
  );
}

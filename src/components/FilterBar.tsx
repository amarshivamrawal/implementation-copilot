'use client';
import { Search, X } from 'lucide-react';
import type { EscalationRisk } from '@/types';
import SearchableSelect from './SearchableSelect';

export interface Filters {
  search:         string;
  pm:             string[];
  ps:             string[];
  ic:             string[];
  riskLevel:      string[];
  reasons:        string[];
  practiceType:   string[];
}

interface Props {
  filters: Filters;
  onChange: (f: Filters) => void;
  risks: EscalationRisk[];
}

function unique(arr: (string | undefined)[]): string[] {
  const seen = new Set<string>();
  for (const v of arr) { if (v) seen.add(v); }
  return Array.from(seen);
}

const ALL_REASONS = [
  'Response Delay',
  'Customer Agitation',
  'Customer Overwhelmed',
  'Customer Frustrated',
  'Call Recording Signal',
  'Multiple Issues',
];

const ALL_RISK_LEVELS = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

export default function FilterBar({ filters, onChange, risks }: Props) {
  const pmOptions           = unique(risks.map((r) => r.project.pm));
  const psOptions           = unique(risks.map((r) => r.project.ps));
  const icOptions           = unique(risks.map((r) => r.project.ic));
  const practiceTypeOptions = unique(risks.map((r) => r.project.category));

  function set<K extends keyof Filters>(key: K, val: Filters[K]) {
    onChange({ ...filters, [key]: val });
  }

  const hasActiveFilters =
    filters.search ||
    filters.pm.length ||
    filters.ps.length ||
    filters.ic.length ||
    filters.riskLevel.length ||
    filters.reasons.length ||
    filters.practiceType.length;

  function clearAll() {
    onChange({ search: '', pm: [], ps: [], ic: [], riskLevel: [], reasons: [], practiceType: [] });
  }

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 space-y-4">
      {/* Search bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={filters.search}
            onChange={(e) => set('search', e.target.value)}
            placeholder="Search by project name, customer POC, legacy system…"
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition"
          />
          {filters.search && (
            <button
              onClick={() => set('search', '')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {hasActiveFilters && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-600 px-3 py-2 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Clear all
          </button>
        )}
      </div>

      {/* Dropdown filters */}
      <div className="flex flex-wrap gap-3">
        <SearchableSelect
          label="Risk Level"
          options={ALL_RISK_LEVELS}
          value={filters.riskLevel}
          onChange={(v) => set('riskLevel', v)}
          multi
          placeholder="All levels"
        />
        <SearchableSelect
          label="Escalation Reason"
          options={ALL_REASONS}
          value={filters.reasons}
          onChange={(v) => set('reasons', v)}
          multi
          placeholder="All reasons"
        />
        {practiceTypeOptions.length > 0 && (
          <SearchableSelect
            label="Practice Type"
            options={practiceTypeOptions}
            value={filters.practiceType}
            onChange={(v) => set('practiceType', v)}
            multi
            placeholder="All practice types"
          />
        )}
        {pmOptions.length > 0 && (
          <SearchableSelect
            label="PM"
            options={pmOptions}
            value={filters.pm}
            onChange={(v) => set('pm', v)}
            multi
            placeholder="All PMs"
          />
        )}
        {psOptions.length > 0 && (
          <SearchableSelect
            label="PS"
            options={psOptions}
            value={filters.ps}
            onChange={(v) => set('ps', v)}
            multi
            placeholder="All PSs"
          />
        )}
        {icOptions.length > 0 && (
          <SearchableSelect
            label="IC"
            options={icOptions}
            value={filters.ic}
            onChange={(v) => set('ic', v)}
            multi
            placeholder="All ICs"
          />
        )}
      </div>

      {/* Active filter chips */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-100">
          {[
            ...filters.riskLevel.map((v) => ({ label: `Risk: ${v}`, key: 'riskLevel' as const, val: v })),
            ...filters.reasons.map((v) => ({ label: `Reason: ${v}`, key: 'reasons' as const, val: v })),
            ...filters.practiceType.map((v) => ({ label: `Practice: ${v}`, key: 'practiceType' as const, val: v })),
            ...filters.pm.map((v) => ({ label: `PM: ${v}`, key: 'pm' as const, val: v })),
            ...filters.ps.map((v) => ({ label: `PS: ${v}`, key: 'ps' as const, val: v })),
            ...filters.ic.map((v) => ({ label: `IC: ${v}`, key: 'ic' as const, val: v })),
          ].map((chip) => (
            <span
              key={`${chip.key}-${chip.val}`}
              className="inline-flex items-center gap-1 text-xs bg-brand-50 text-brand-700 border border-brand-100 rounded-full px-2.5 py-1"
            >
              {chip.label}
              <button
                onClick={() =>
                  set(chip.key, (filters[chip.key] as string[]).filter((v) => v !== chip.val))
                }
                className="hover:text-brand-900"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

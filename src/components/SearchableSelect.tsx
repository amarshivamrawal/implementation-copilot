'use client';
import { useState, useRef, useEffect } from 'react';
import { ChevronDown, X, Search } from 'lucide-react';

interface Props {
  label: string;
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
  multi?: boolean;
  placeholder?: string;
}

export default function SearchableSelect({
  label, options, value, onChange, multi = false, placeholder = 'All',
}: Props) {
  const [open, setOpen]     = useState(false);
  const [query, setQuery]   = useState('');
  const ref                 = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filtered = options.filter((o) =>
    o.toLowerCase().includes(query.toLowerCase())
  );

  function toggle(opt: string) {
    if (!multi) {
      onChange(value[0] === opt ? [] : [opt]);
      setOpen(false);
      return;
    }
    onChange(value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt]);
  }

  const display = value.length === 0
    ? placeholder
    : value.length === 1
    ? value[0]
    : `${value.length} selected`;

  return (
    <div ref={ref} className="relative min-w-[160px]">
      <p className="text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">{label}</p>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 hover:border-brand-500 transition-colors shadow-sm"
      >
        <span className="truncate">{display}</span>
        <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[200px] bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
          {/* Search box */}
          <div className="p-2 border-b border-slate-100 flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 text-sm outline-none placeholder-slate-400"
              placeholder="Search…"
            />
            {query && (
              <button onClick={() => setQuery('')}>
                <X className="w-3 h-3 text-slate-400" />
              </button>
            )}
          </div>

          {/* Clear all */}
          {value.length > 0 && (
            <button
              type="button"
              onClick={() => { onChange([]); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-xs text-brand-600 hover:bg-brand-50 border-b border-slate-100"
            >
              Clear selection
            </button>
          )}

          {/* Options */}
          <ul className="max-h-52 overflow-y-auto scrollbar-thin">
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-sm text-slate-400">No results</li>
            )}
            {filtered.map((opt) => (
              <li key={opt}>
                <button
                  type="button"
                  onClick={() => toggle(opt)}
                  className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-slate-50 ${
                    value.includes(opt) ? 'text-brand-600 font-medium' : 'text-slate-700'
                  }`}
                >
                  {multi && (
                    <span className={`w-4 h-4 border-2 rounded flex-shrink-0 flex items-center justify-center ${
                      value.includes(opt) ? 'border-brand-500 bg-brand-500' : 'border-slate-300'
                    }`}>
                      {value.includes(opt) && (
                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 8">
                          <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </span>
                  )}
                  {opt}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

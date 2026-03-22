/**
 * Keyword-based sentiment analysis engine.
 *
 * Detects customer agitation / frustration in messages without
 * relying on an external ML API. The lexicon is tuned for
 * B2B SaaS implementation project communications.
 */

import type { SentimentLabel, SentimentResult } from '@/types';

// ─── Lexicon ──────────────────────────────────────────────────────────────────

const OVERWHELMED_KEYWORDS = [
  'overwhelmed', 'too much', 'overloaded', 'can\'t handle', 'drowning',
  'too many things', 'it\'s a lot', 'very confused', 'completely lost',
  'don\'t know where to start', 'over my head', 'struggling to keep up',
];

const AGITATED_KEYWORDS = [
  'unacceptable', 'this is ridiculous', 'extremely frustrated',
  'very disappointed', 'highly dissatisfied', 'terrible', 'awful',
  'worst', 'disaster', 'fiasco', 'angry', 'furious', 'outraged',
  'escalate', 'escalation', 'raise this', 'senior management',
  'VP', 'C-suite', 'CEO', 'CTO', 'no progress', 'still not fixed',
  'still waiting', 'been waiting for weeks', 'unresponsive',
  'not responding', 'taking too long', 'missed deadline',
  'missed the deadline', 'not delivered', 'never resolved',
  'not resolved', 'breach of contract', 'SLA breach', 'SLA violation',
  'compensation', 'refund', 'legal', 'legal action',
];

const FRUSTRATED_KEYWORDS = [
  'frustrated', 'frustrating', 'disappointed', 'dissatisfied',
  'not happy', 'unhappy', 'annoyed', 'concerned', 'issue not resolved',
  'still an issue', 'same problem', 'again', 'repeatedly', 'multiple times',
  'never', 'always broken', 'keeps failing', 'keeps happening',
  'no update', 'no response', 'haven\'t heard', 'following up',
  'gentle reminder', 'reminder', 'waiting', 'delay', 'delayed',
  'overdue', 'past due', 'behind schedule', 'not meeting expectations',
  'falling short', 'not what was promised', 'below expectations',
  'urgent', 'urgently', 'asap', 'as soon as possible', 'immediately',
  'critical', 'blocker', 'blocking us', 'stuck', 'need this now',
];

type LexiconEntry = { keywords: string[]; label: SentimentLabel; baseScore: number };

const LEXICON: LexiconEntry[] = [
  { keywords: OVERWHELMED_KEYWORDS, label: 'OVERWHELMED', baseScore: 0.75 },
  { keywords: AGITATED_KEYWORDS,    label: 'AGITATED',    baseScore: 0.85 },
  { keywords: FRUSTRATED_KEYWORDS,  label: 'FRUSTRATED',  baseScore: 0.55 },
];

// ─── Public API ───────────────────────────────────────────────────────────────

export function analyzeSentiment(text: string): SentimentResult {
  const lower = text.toLowerCase();
  let bestLabel:    SentimentLabel = 'CALM';
  let bestScore     = 0;
  const allMatched: string[]       = [];

  for (const entry of LEXICON) {
    const matched = entry.keywords.filter((kw) => lower.includes(kw));
    if (matched.length === 0) continue;

    // Score = base + bonus for multiple hits (capped at 0.98)
    const score = Math.min(entry.baseScore + (matched.length - 1) * 0.05, 0.98);

    allMatched.push(...matched);

    if (score > bestScore) {
      bestScore = score;
      bestLabel = entry.label;
    }
  }

  return {
    label:           bestLabel,
    score:           bestScore,
    matchedKeywords: Array.from(new Set(allMatched)),
  };
}

/** Returns true if the sentiment warrants a risk alert */
export function isAtRisk(result: SentimentResult): boolean {
  return result.label !== 'CALM' && result.score >= 0.5;
}

/** Map sentiment label → risk level contribution */
export function sentimentToRiskLevel(
  label: SentimentLabel,
  hasDelays: boolean
): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  if (label === 'AGITATED' || (label === 'OVERWHELMED' && hasDelays)) return 'CRITICAL';
  if (label === 'OVERWHELMED') return 'HIGH';
  if (label === 'FRUSTRATED' && hasDelays) return 'HIGH';
  if (label === 'FRUSTRATED') return 'MEDIUM';
  if (hasDelays) return 'MEDIUM';
  return 'LOW';
}

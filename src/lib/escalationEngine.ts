/**
 * Escalation Engine
 *
 * Orchestrates Rocketlane + OneDrive data fetching, sentiment analysis,
 * and delay detection to produce a unified EscalationRisk per project.
 */

import type {
  EscalationRisk,
  DashboardData,
  CustomerSignal,
  RLProject,
  RLMessage,
} from '@/types';
import { fetchAllProjects, fetchProjectMessages } from './rocketlane';
import { fetchVTTFilesForProject } from './onedrive';
import { vttSegmentsToText } from './vttParser';
import { analyzeSentiment, isAtRisk, sentimentToRiskLevel } from './sentiment';
import { detectResponseDelays } from './delayDetector';

const ZENOTI_DOMAINS = (process.env.ZENOTI_TEAM_DOMAINS ?? 'zenoti.com')
  .split(',')
  .map((d) => d.trim().toLowerCase());

function isCustomer(email: string): boolean {
  const lower = email.toLowerCase();
  return !ZENOTI_DOMAINS.some((d) => lower.endsWith(`@${d}`));
}

// ─── Escalation reason categorisation ────────────────────────────────────────

export type EscalationReason =
  | 'Response Delay'
  | 'Customer Agitation'
  | 'Customer Overwhelmed'
  | 'Customer Frustrated'
  | 'Call Recording Signal'
  | 'Multiple Issues';

function categoriseReasons(risk: Omit<EscalationRisk, 'project'>): EscalationReason[] {
  const reasons = new Set<EscalationReason>();
  if (risk.responseDelays.length > 0) reasons.add('Response Delay');

  for (const sig of risk.customerSignals) {
    if (sig.sentiment.label === 'AGITATED')    reasons.add('Customer Agitation');
    if (sig.sentiment.label === 'OVERWHELMED') reasons.add('Customer Overwhelmed');
    if (sig.sentiment.label === 'FRUSTRATED')  reasons.add('Customer Frustrated');
    if (sig.sourceType === 'VTT')              reasons.add('Call Recording Signal');
  }

  if (reasons.size > 2) reasons.add('Multiple Issues');
  return [...reasons];
}

// ─── Core orchestration ───────────────────────────────────────────────────────

export async function buildDashboardData(): Promise<DashboardData> {
  const projects = await fetchAllProjects();

  const risks = await Promise.all(
    projects.map((project) => analyseProject(project))
  );

  // Only surface projects that actually have a risk
  const flagged = risks.filter(
    (r) => r.riskLevel !== 'LOW' || r.responseDelays.length > 0
  );

  const summary = {
    totalProjects:       projects.length,
    criticalRisks:       flagged.filter((r) => r.riskLevel === 'CRITICAL').length,
    highRisks:           flagged.filter((r) => r.riskLevel === 'HIGH').length,
    totalDelays:         flagged.reduce((n, r) => n + r.responseDelays.length, 0),
    totalAgitatedSignals: flagged.reduce((n, r) => n + r.customerSignals.length, 0),
  };

  return {
    projects:        flagged,
    summary,
    lastRefreshedAt: new Date().toISOString(),
  };
}

async function analyseProject(project: RLProject): Promise<EscalationRisk> {
  const [messages, vttFiles] = await Promise.all([
    fetchProjectMessages(project.id),
    fetchVTTFilesForProject(project.name, project.id),
  ]);

  // ── Customer signals from RL messages ──────────────────────────────────────
  const customerMessages = messages.filter((m) => isCustomer(m.authorEmail));
  const chatSignals: CustomerSignal[] = customerMessages
    .map((m): CustomerSignal | null => {
      const sentiment = analyzeSentiment(m.content);
      if (!isAtRisk(sentiment)) return null;
      return {
        projectId:    project.id,
        authorName:   m.authorName,
        authorEmail:  m.authorEmail,
        messageContent: m.content,
        messageAt:    m.createdAt,
        sentiment,
        sourceLink:   m.chatUrl ?? m.taskUrl ?? m.url ??
                      `https://app.rocketlane.com/projects/${project.id}`,
        sourceLabel:  m.taskId ? 'Task Comment' : 'Project Chat',
        sourceType:   m.taskId ? 'TASK_COMMENT' : 'CHAT',
      };
    })
    .filter(Boolean) as CustomerSignal[];

  // ── Customer signals from VTT call recordings ──────────────────────────────
  const vttSignals: CustomerSignal[] = [];
  for (const vtt of vttFiles) {
    const segments = vttSegmentsToText(vtt.segments);
    for (const seg of segments) {
      if (isCustomer(seg.authorName + '@external')) {
        // For VTT, we don't have emails – treat all speakers not named
        // "Zenoti" as potential customer speakers
        const sentiment = analyzeSentiment(seg.content);
        if (!isAtRisk(sentiment)) continue;
        vttSignals.push({
          projectId:    project.id,
          authorName:   seg.authorName,
          authorEmail:  '',
          messageContent: seg.content,
          messageAt:    seg.createdAt,
          sentiment,
          sourceLink:   `https://app.rocketlane.com/projects/${project.id}`,
          sourceLabel:  `Call: ${vtt.fileName}`,
          sourceType:   'VTT',
        });
      }
    }
  }

  const allSignals = [...chatSignals, ...vttSignals];

  // ── Response delays ────────────────────────────────────────────────────────
  const responseDelays = detectResponseDelays({
    projectId:   project.id,
    projectName: project.name,
    messages,
  });

  // ── Aggregate risk level ───────────────────────────────────────────────────
  const topSignal = allSignals.sort((a, b) => b.sentiment.score - a.sentiment.score)[0];
  const riskLevel = sentimentToRiskLevel(
    topSignal?.sentiment.label ?? 'CALM',
    responseDelays.length > 0
  );

  // ── Top customer POC ───────────────────────────────────────────────────────
  // Use the POC with the highest-scoring signal; fall back to first delay
  const topCustomerPoc     = topSignal?.authorName ?? responseDelays[0]?.customerPocName ?? 'N/A';
  const topCustomerPocEmail = topSignal?.authorEmail ?? responseDelays[0]?.customerPocEmail ?? '';

  const partialRisk = {
    riskLevel,
    customerSignals:      allSignals,
    responseDelays,
    topCustomerPoc,
    topCustomerPocEmail,
    lastCheckedAt:        new Date().toISOString(),
  };

  return {
    project: {
      ...project,
      // Attach escalation reasons to be used by UI filters
      customFields: {
        ...(project.customFields ?? {}),
        escalationReasons: categoriseReasons(partialRisk),
      },
    },
    ...partialRisk,
  };
}

// EscalationReason already exported above

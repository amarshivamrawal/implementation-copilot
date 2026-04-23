/**
 * Escalation Engine
 *
 * Orchestrates all data sources:
 *   1. Rocketlane messages + comments
 *   2. Rocketlane file attachments (.vtt / .txt on tasks)
 *   3. OneDrive / SharePoint / Teams recordings (.vtt / .txt)
 *
 * Then runs sentiment analysis + response-delay detection.
 */

import type {
  EscalationRisk,
  DashboardData,
  CustomerSignal,
  RLProject,
  RLAttachment,
} from '@/types';
import { fetchAllProjects, fetchProjectMessages, fetchProjectVTTAttachments, fetchProjectTasks } from './rocketlane';
import { detectSOCChecklist } from './socDetector';
import { fetchVTTFilesForProject } from './onedrive';
import { vttSegmentsToText, parseVTT, parsePlainTextTranscript } from './vttParser';
import { analyzeSentiment, isAtRisk, sentimentToRiskLevel } from './sentiment';
import { detectResponseDelays } from './delayDetector';
import axios from 'axios';

const ZENOTI_DOMAINS = (process.env.ZENOTI_TEAM_DOMAINS ?? 'zenoti.com')
  .split(',')
  .map((d) => d.trim().toLowerCase());

function isCustomerEmail(email: string): boolean {
  const lower = email.toLowerCase();
  return !ZENOTI_DOMAINS.some((d) => lower.endsWith(`@${d}`));
}

// ─── Build the set of known Zenoti speaker names for a project ────────────────
// Used to exclude Zenoti team members when analysing VTT call recordings.

function buildZenotiSpeakerSet(project: RLProject): Set<string> {
  const names = new Set<string>();
  const add = (name?: string) => {
    if (!name) return;
    // Add full name and first name so partial matches work
    const clean = name.trim().toLowerCase();
    if (clean) {
      names.add(clean);
      names.add(clean.split(/\s+/)[0]);   // first name only
    }
  };

  add(project.pm);
  add(project.ps);
  add(project.ic);
  add(project.servicesTeam);

  for (const m of project.members ?? []) {
    if (!isCustomerEmail(m.email)) add(m.name);
  }

  return names;
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
  return Array.from(reasons);
}

// ─── Core orchestration ───────────────────────────────────────────────────────

export async function buildDashboardData(): Promise<DashboardData> {
  const projects = await fetchAllProjects();

  const risks = await Promise.all(
    projects.map((project) => analyseProject(project))
  );

  const flagged = risks.filter(
    (r) => r.riskLevel !== 'LOW' || r.responseDelays.length > 0
  );

  const summary = {
    totalProjects:        projects.length,
    criticalRisks:        flagged.filter((r) => r.riskLevel === 'CRITICAL').length,
    highRisks:            flagged.filter((r) => r.riskLevel === 'HIGH').length,
    totalDelays:          flagged.reduce((n, r) => n + r.responseDelays.length, 0),
    totalAgitatedSignals: flagged.reduce((n, r) => n + r.customerSignals.length, 0),
    socBlockers:          flagged.filter((r) => (r.socChecklist?.overdueCount ?? 0) > 0).length,
  };

  return { projects: flagged, summary, lastRefreshedAt: new Date().toISOString() };
}

async function analyseProject(project: RLProject): Promise<EscalationRisk> {
  const zenotiSpeakers = buildZenotiSpeakerSet(project);

  // ── Fetch all sources in parallel ─────────────────────────────────────────
  const [messages, rlAttachments, oneDriveVTTs, tasks] = await Promise.all([
    fetchProjectMessages(project.id),
    fetchProjectVTTAttachments(project.id),
    fetchVTTFilesForProject(project.name, project.id),
    fetchProjectTasks(project.id),
  ]);

  // ── 1. Customer signals from Rocketlane messages / comments ────────────────
  const chatSignals: CustomerSignal[] = messages
    .filter((m) => isCustomerEmail(m.authorEmail))
    .flatMap((m): CustomerSignal[] => {
      const sentiment = analyzeSentiment(m.content);
      if (!isAtRisk(sentiment)) return [];
      return [{
        projectId:      project.id,
        authorName:     m.authorName,
        authorEmail:    m.authorEmail,
        messageContent: m.content,
        messageAt:      m.createdAt,
        sentiment,
        sourceLink:     m.chatUrl ?? m.taskUrl ?? m.url ??
                        `https://app.rocketlane.com/projects/${project.id}`,
        sourceLabel:    m.taskId ? 'Task Comment' : 'Project Chat',
        sourceType:     m.taskId ? 'TASK_COMMENT' : 'CHAT',
      }];
    });

  // ── 2. VTT signals from RL task/project file attachments ───────────────────
  const rlVTTSignals = await processAttachments(rlAttachments, project.id, zenotiSpeakers);

  // ── 3. VTT signals from OneDrive / SharePoint / Teams recordings ───────────
  const oneDriveVTTSignals: CustomerSignal[] = [];
  for (const vtt of oneDriveVTTs) {
    const segments = vttSegmentsToText(vtt.segments, zenotiSpeakers);
    for (const seg of segments) {
      const sentiment = analyzeSentiment(seg.content);
      if (!isAtRisk(sentiment)) continue;
      oneDriveVTTSignals.push({
        projectId:      project.id,
        authorName:     seg.authorName,
        authorEmail:    '',
        messageContent: seg.content,
        messageAt:      seg.createdAt,
        sentiment,
        sourceLink:     vtt.sourceUrl ?? `https://app.rocketlane.com/projects/${project.id}`,
        sourceLabel:    vtt.sourceLabel ?? `OneDrive: ${vtt.fileName}`,
        sourceType:     'VTT',
      });
    }
  }

  const allSignals = [...chatSignals, ...rlVTTSignals, ...oneDriveVTTSignals];

  // ── Response delays ────────────────────────────────────────────────────────
  const responseDelays = detectResponseDelays({
    projectId:   project.id,
    projectName: project.name,
    messages,
  });

  // ── Aggregate risk level ───────────────────────────────────────────────────
  const topSignal = [...allSignals].sort((a, b) => b.sentiment.score - a.sentiment.score)[0];
  const riskLevel = sentimentToRiskLevel(
    topSignal?.sentiment.label ?? 'CALM',
    responseDelays.length > 0
  );

  const topCustomerPoc      = topSignal?.authorName ?? responseDelays[0]?.customerPocName ?? 'N/A';
  const topCustomerPocEmail = topSignal?.authorEmail ?? responseDelays[0]?.customerPocEmail ?? '';

  const socChecklist = detectSOCChecklist(tasks);

  const partialRisk = {
    riskLevel,
    customerSignals:      allSignals,
    responseDelays,
    topCustomerPoc,
    topCustomerPocEmail,
    lastCheckedAt:        new Date().toISOString(),
    socChecklist,
  };

  return {
    project: {
      ...project,
      customFields: {
        ...(project.customFields ?? {}),
        escalationReasons: categoriseReasons(partialRisk),
      },
    },
    ...partialRisk,
  };
}

// ─── Download + parse RL file attachments ────────────────────────────────────

async function processAttachments(
  attachments:     RLAttachment[],
  projectId:       string,
  zenotiSpeakers:  Set<string>
): Promise<CustomerSignal[]> {
  const signals: CustomerSignal[] = [];

  for (const att of attachments) {
    try {
      const content = await downloadAttachment(att.downloadUrl);
      const parsed  = att.name.toLowerCase().endsWith('.vtt')
        ? parseVTT(content)
        : parsePlainTextTranscript(content);

      const segments = vttSegmentsToText(parsed.segments, zenotiSpeakers);

      for (const seg of segments) {
        const sentiment = analyzeSentiment(seg.content);
        if (!isAtRisk(sentiment)) continue;
        signals.push({
          projectId,
          authorName:     seg.authorName,
          authorEmail:    '',
          messageContent: seg.content,
          messageAt:      seg.createdAt,
          sentiment,
          sourceLink:     att.rlViewUrl,
          sourceLabel:    att.taskTitle
            ? `RL Task: ${att.taskTitle}`
            : `RL File: ${att.name}`,
          sourceType:     'VTT',
        });
      }
    } catch { /* skip unreadable */ }
  }

  return signals;
}

async function downloadAttachment(url: string): Promise<string> {
  const res = await axios.get(url, { responseType: 'text', timeout: 20_000 });
  return res.data as string;
}

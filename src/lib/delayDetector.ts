/**
 * Response-delay detector
 *
 * Scans a chronologically-sorted list of messages for a project and
 * identifies customer messages that went un-replied by the Zenoti team
 * for longer than the configured threshold (default: 2 days).
 */

import { differenceInCalendarDays, parseISO } from 'date-fns';
import type { RLMessage, ResponseDelayAlert } from '@/types';

const THRESHOLD_DAYS = Number(process.env.RESPONSE_DELAY_THRESHOLD_DAYS ?? 2);
const ZENOTI_DOMAINS = (process.env.ZENOTI_TEAM_DOMAINS ?? 'zenoti.com')
  .split(',')
  .map((d) => d.trim().toLowerCase());

function isZenotiMember(email: string): boolean {
  const lower = email.toLowerCase();
  return ZENOTI_DOMAINS.some((domain) => lower.endsWith(`@${domain}`));
}

function isCustomerMember(email: string): boolean {
  return !isZenotiMember(email);
}

export interface DelayDetectorInput {
  projectId:   string;
  projectName: string;
  messages:    RLMessage[];   // All messages for the project (will be sorted internally)
}

export function detectResponseDelays(input: DelayDetectorInput): ResponseDelayAlert[] {
  const { projectId, projectName, messages } = input;

  // Sort chronologically
  const sorted = [...messages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const alerts: ResponseDelayAlert[] = [];
  const now = new Date();

  // Walk through messages; when we find a customer message, look ahead for a Zenoti reply
  for (let i = 0; i < sorted.length; i++) {
    const msg = sorted[i];
    if (!isCustomerMember(msg.authorEmail)) continue;

    // Find next Zenoti reply in the same thread
    const nextZenotiReply = sorted.slice(i + 1).find(
      (m) => isZenotiMember(m.authorEmail) && sameThread(m, msg)
    );

    const sentAt        = parseISO(msg.createdAt);
    const repliedAt     = nextZenotiReply ? parseISO(nextZenotiReply.createdAt) : now;
    const delayDays     = differenceInCalendarDays(repliedAt, sentAt);

    if (delayDays >= THRESHOLD_DAYS) {
      const delayedBy = nextZenotiReply
        ? nextZenotiReply.authorName   // who eventually replied
        : 'No response yet';

      alerts.push({
        projectId,
        projectName,
        customerPocName:     msg.authorName,
        customerPocEmail:    msg.authorEmail,
        customerMessageContent: truncate(msg.content, 200),
        customerMessageAt:   msg.createdAt,
        zenotiResponseAt:    nextZenotiReply?.createdAt ?? null,
        delayDays,
        delayedBy,
        chatLink:
          msg.chatUrl ??
          msg.taskUrl ??
          msg.url ??
          `https://app.rocketlane.com/projects/${projectId}`,
        taskTitle: undefined,
      });
    }
  }

  // De-duplicate: keep the worst delay per customer POC
  return deduplicateAlerts(alerts);
}

/** Two messages are in the "same thread" if they share a taskId or both have none */
function sameThread(a: RLMessage, b: RLMessage): boolean {
  if (a.taskId && b.taskId) return a.taskId === b.taskId;
  if (!a.taskId && !b.taskId) return true;
  return false;
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

function deduplicateAlerts(alerts: ResponseDelayAlert[]): ResponseDelayAlert[] {
  const map = new Map<string, ResponseDelayAlert>();
  for (const alert of alerts) {
    const key = `${alert.projectId}::${alert.customerPocEmail}`;
    const existing = map.get(key);
    if (!existing || alert.delayDays > existing.delayDays) {
      map.set(key, alert);
    }
  }
  return Array.from(map.values());
}

/**
 * SOC Milestone Checklist Detector
 *
 * Scans a project's Rocketlane task list and checks whether each of the
 * four mandatory SOC (Scope of Configuration) milestone deliverables has
 * a corresponding task and whether that task is complete, pending, or overdue.
 *
 * The four items tracked:
 *   1. GLR MOM – Go-Live Review meeting minutes, with cutover date called out
 *   2. Go-live communication – formal announcement sent to stakeholders
 *   3. Daily usage reports – usage reports shared with customer post go-live
 *   4. Onboarding completion MOM – closure MOM using prescribed template
 */

import type { RLTask, SOCChecklist, SOCChecklistItem, SOCItemKey, SOCItemStatus } from '@/types';

// Task statuses that count as "completed"
const DONE_STATUSES = new Set([
  'completed', 'done', 'closed', 'complete', 'finished', 'approved', 'sent', 'shared',
]);

interface SOCDefinition {
  key: SOCItemKey;
  label: string;
  description: string;
  patterns: string[];
}

const SOC_ITEMS: SOCDefinition[] = [
  {
    key: 'GLR_MOM',
    label: 'GLR MOM shared (with go-live/cutover date)',
    description: 'Go-Live Review meeting minutes must be sent and must clearly call out the go-live / cutover date.',
    patterns: [
      'glr mom',
      'go-live review mom',
      'go live review mom',
      'golive review mom',
      'glr meeting minutes',
      'go-live review minutes',
      'go live review minutes',
      'go-live review meeting',
      'glr notes',
    ],
  },
  {
    key: 'GOLIVE_COMM',
    label: 'Go-live communication sent',
    description: 'A formal go-live communication must be sent to all stakeholders before the cutover date.',
    patterns: [
      'go-live communication',
      'go live communication',
      'golive communication',
      'go-live announcement',
      'go live announcement',
      'go-live email',
      'go live email',
      'golive email',
      'cutover communication',
      'go-live notification',
      'go live notification',
    ],
  },
  {
    key: 'DAILY_USAGE',
    label: 'Daily usage reports shared',
    description: 'Daily usage reports must be generated and shared with the customer post go-live to track adoption.',
    patterns: [
      'daily usage report',
      'daily usage reports',
      'daily usage',
      'usage report',
      'usage reports',
      'share usage report',
      'share daily report',
      'daily report',
    ],
  },
  {
    key: 'ONBOARDING_MOM',
    label: 'Onboarding completion MOM + template sent',
    description: 'Onboarding completion meeting minutes using the prescribed template must be sent to the customer.',
    patterns: [
      'onboarding completion mom',
      'onboarding completion minutes',
      'onboarding mom',
      'completion mom',
      'project closure mom',
      'project completion mom',
      'onboarding closure',
      'onboarding completion meeting',
      'go-live completion mom',
      'post go-live mom',
    ],
  },
];

function matchesPattern(title: string, patterns: string[]): boolean {
  const lower = title.toLowerCase();
  return patterns.some((p) => lower.includes(p));
}

function isTaskDone(status: string): boolean {
  return DONE_STATUSES.has((status ?? '').toLowerCase());
}

function isTaskOverdue(task: RLTask): boolean {
  if (!task.dueDate) return false;
  return new Date(task.dueDate) < new Date();
}

export function detectSOCChecklist(tasks: RLTask[]): SOCChecklist {
  const items: SOCChecklistItem[] = SOC_ITEMS.map(({ key, label, description, patterns }) => {
    const matched = tasks.find((t) => matchesPattern(t.title, patterns));

    let status: SOCItemStatus;
    if (!matched) {
      status = 'MISSING';
    } else if (isTaskDone(matched.status)) {
      status = 'DONE';
    } else if (isTaskOverdue(matched)) {
      status = 'OVERDUE';
    } else {
      status = 'PENDING';
    }

    return {
      key,
      label,
      description,
      status,
      taskTitle:   matched?.title,
      taskUrl:     matched?.url,
      dueDate:     matched?.dueDate,
      completedAt: status === 'DONE' ? matched?.updatedAt : undefined,
    };
  });

  const completedCount = items.filter((i) => i.status === 'DONE').length;
  const pendingCount   = items.filter((i) => i.status === 'PENDING').length;
  const overdueCount   = items.filter((i) => i.status === 'OVERDUE').length;
  const missingCount   = items.filter((i) => i.status === 'MISSING').length;

  // DONE=full credit, PENDING=half credit, OVERDUE/MISSING=no credit
  const scoreMap: Record<SOCItemStatus, number> = { DONE: 1, PENDING: 0.5, OVERDUE: 0, MISSING: 0 };
  const healthScore = Math.round(
    (items.reduce((sum, i) => sum + scoreMap[i.status], 0) / items.length) * 100
  );

  return { items, completedCount, pendingCount, overdueCount, missingCount, healthScore };
}

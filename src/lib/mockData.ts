/**
 * Demo / mock data for local validation and screenshots.
 * Served when ?demo=1 is passed to /api/dashboard, or when the
 * live Rocketlane API returns no matching projects.
 */

import type { DashboardData, SOCChecklist, SOCItemStatus } from '@/types';

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString();
}
function daysFromNow(n: number): string {
  return new Date(Date.now() + n * 86_400_000).toISOString();
}

function makeSocChecklist(
  statuses: [SOCItemStatus, SOCItemStatus, SOCItemStatus, SOCItemStatus],
  dueDates: [string | undefined, string | undefined, string | undefined, string | undefined],
): SOCChecklist {
  const LABELS = [
    { key: 'GLR_MOM'        as const, label: 'GLR MOM shared (with go-live/cutover date)',     description: 'Go-Live Review meeting minutes must be sent and must clearly call out the go-live / cutover date.' },
    { key: 'GOLIVE_COMM'    as const, label: 'Go-live communication sent',                     description: 'A formal go-live communication must be sent to all stakeholders before the cutover date.' },
    { key: 'DAILY_USAGE'    as const, label: 'Daily usage reports shared',                     description: 'Daily usage reports must be generated and shared with the customer post go-live to track adoption.' },
    { key: 'ONBOARDING_MOM' as const, label: 'Onboarding completion MOM + template sent',      description: 'Onboarding completion meeting minutes using the prescribed template must be sent to the customer.' },
  ];

  const scoreMap: Record<SOCItemStatus, number> = { DONE: 1, PENDING: 0.5, OVERDUE: 0, MISSING: 0 };

  const items = LABELS.map((def, i) => ({
    key:         def.key,
    label:       def.label,
    description: def.description,
    status:      statuses[i],
    dueDate:     dueDates[i],
    completedAt: statuses[i] === 'DONE' ? daysAgo(1) : undefined,
  }));

  const completedCount = items.filter((x) => x.status === 'DONE').length;
  const pendingCount   = items.filter((x) => x.status === 'PENDING').length;
  const overdueCount   = items.filter((x) => x.status === 'OVERDUE').length;
  const missingCount   = items.filter((x) => x.status === 'MISSING').length;
  const healthScore    = Math.round((items.reduce((s, x) => s + scoreMap[x.status], 0) / items.length) * 100);

  return { items, completedCount, pendingCount, overdueCount, missingCount, healthScore };
}

export const MOCK_DATA: DashboardData = {
  lastRefreshedAt: new Date().toISOString(),
  summary: {
    totalProjects:        8,
    criticalRisks:        2,
    highRisks:            3,
    totalDelays:          7,
    totalAgitatedSignals: 11,
    socBlockers:          3,
  },
  projects: [
    // ── CRITICAL ─────────────────────────────────────────────────────────────
    {
      riskLevel:         'CRITICAL',
      topCustomerPoc:    'Jessica Morgan',
      topCustomerPocEmail: 'jessica.morgan@verdant-spa.com',
      lastCheckedAt:     new Date().toISOString(),
      project: {
        id:              'proj-001',
        name:            'Verdant Spa & Wellness Base App',
        status:          'At Risk',
        category:        'Base Application',
        createdAt:       '2024-09-01T00:00:00Z',
        updatedAt:       new Date().toISOString(),
        netMrr:          18500,
        numberOfCenters: 12,
        sourceSoftware:  'Mindbody',
        businessType:    'Spa & Wellness',
        servicesTeam:    'Team Alpha',
        pm:              'Priya Sharma',
        ps:              'Rahul Nair',
        ic:              'Ananya Menon',
        rlProjectUrl:    'https://app.rocketlane.com/projects/proj-001',
        customFields: {
          escalationReasons: ['Customer Agitation', 'Response Delay', 'Multiple Issues'],
        },
      },
      socChecklist: makeSocChecklist(
        ['DONE', 'OVERDUE', 'MISSING', 'MISSING'],
        [daysAgo(10), daysAgo(3), undefined, undefined],
      ),
      responseDelays: [
        {
          projectId:              'proj-001',
          projectName:            'Verdant Spa & Wellness Base App',
          customerPocName:        'Jessica Morgan',
          customerPocEmail:       'jessica.morgan@verdant-spa.com',
          customerMessageContent: 'This is absolutely unacceptable. We were promised go-live in October and it is now 3 weeks past that date with no resolution. I am escalating this to our CEO if we don\'t have a concrete plan by end of week.',
          customerMessageAt:      new Date(Date.now() - 6 * 86_400_000).toISOString(),
          zenotiResponseAt:       null,
          delayDays:              6,
          delayedBy:              'No response yet',
          chatLink:               'https://app.rocketlane.com/projects/proj-001/tasks/task-045',
        },
        {
          projectId:              'proj-001',
          projectName:            'Verdant Spa & Wellness Base App',
          customerPocName:        'Tom Baxter',
          customerPocEmail:       'tom.baxter@verdant-spa.com',
          customerMessageContent: 'Following up again on the inventory sync issue. This has been raised 4 times now. We cannot go live without this fixed.',
          customerMessageAt:      new Date(Date.now() - 4 * 86_400_000).toISOString(),
          zenotiResponseAt:       new Date(Date.now() - 1 * 86_400_000).toISOString(),
          delayDays:              3,
          delayedBy:              'Ananya Menon',
          chatLink:               'https://app.rocketlane.com/projects/proj-001/tasks/task-031',
        },
      ],
      customerSignals: [
        {
          projectId:      'proj-001',
          authorName:     'Jessica Morgan',
          authorEmail:    'jessica.morgan@verdant-spa.com',
          messageContent: 'This is absolutely unacceptable. We were promised go-live in October and it is now 3 weeks past that date with no resolution. I am escalating this to our CEO.',
          messageAt:      new Date(Date.now() - 6 * 86_400_000).toISOString(),
          sentiment:      { label: 'AGITATED', score: 0.93, matchedKeywords: ['unacceptable', 'escalate', 'CEO', 'no resolution', 'missed deadline'] },
          sourceLink:     'https://app.rocketlane.com/projects/proj-001/tasks/task-045',
          sourceLabel:    'Task Comment',
          sourceType:     'TASK_COMMENT',
        },
        {
          projectId:      'proj-001',
          authorName:     'Jessica Morgan',
          authorEmail:    'jessica.morgan@verdant-spa.com',
          messageContent: 'I am extremely frustrated with the lack of progress. We have been waiting for 3 weeks and the team is still not responding to our urgent requests.',
          messageAt:      new Date(Date.now() - 8 * 86_400_000).toISOString(),
          sentiment:      { label: 'AGITATED', score: 0.88, matchedKeywords: ['extremely frustrated', 'not responding', 'urgent'] },
          sourceLink:     'https://app.rocketlane.com/projects/proj-001',
          sourceLabel:    'Project Chat',
          sourceType:     'CHAT',
        },
        {
          projectId:      'proj-001',
          authorName:     'Jessica Morgan',
          authorEmail:    '',
          messageContent: 'I am completely overwhelmed with all these configuration changes coming in at once. We were not prepared for this at all and my team is drowning.',
          messageAt:      '00:14:22.000',
          sentiment:      { label: 'OVERWHELMED', score: 0.82, matchedKeywords: ['overwhelmed', 'drowning', 'too much'] },
          sourceLink:     'https://app.rocketlane.com/projects/proj-001/tasks/task-061',
          sourceLabel:    'RL Task: Go-Live Readiness Call',
          sourceType:     'VTT',
        },
      ],
    },

    // ── CRITICAL ─────────────────────────────────────────────────────────────
    {
      riskLevel:         'CRITICAL',
      topCustomerPoc:    'David Chen',
      topCustomerPocEmail: 'david.chen@luxe-fitness.com',
      lastCheckedAt:     new Date().toISOString(),
      project: {
        id:              'proj-002',
        name:            'Luxe Fitness Studios Base App',
        status:          'At Risk',
        category:        'Base Application',
        createdAt:       '2024-08-15T00:00:00Z',
        updatedAt:       new Date().toISOString(),
        netMrr:          32000,
        numberOfCenters: 24,
        sourceSoftware:  'ClubReady',
        businessType:    'Fitness',
        servicesTeam:    'Team Beta',
        pm:              'Vikram Patel',
        ps:              'Neha Gupta',
        ic:              'Suresh Kumar',
        rlProjectUrl:    'https://app.rocketlane.com/projects/proj-002',
        customFields: {
          escalationReasons: ['Customer Agitation', 'Response Delay', 'Call Recording Signal'],
        },
      },
      socChecklist: makeSocChecklist(
        ['PENDING', 'PENDING', 'MISSING', 'MISSING'],
        [daysFromNow(3), daysFromNow(5), undefined, undefined],
      ),
      responseDelays: [
        {
          projectId:              'proj-002',
          projectName:            'Luxe Fitness Studios Base App',
          customerPocName:        'David Chen',
          customerPocEmail:       'david.chen@luxe-fitness.com',
          customerMessageContent: 'We have been waiting for a response on the membership migration issue for 5 days. This is a blocker for our entire go-live. Please respond ASAP.',
          customerMessageAt:      new Date(Date.now() - 5 * 86_400_000).toISOString(),
          zenotiResponseAt:       null,
          delayDays:              5,
          delayedBy:              'No response yet',
          chatLink:               'https://app.rocketlane.com/projects/proj-002/tasks/task-112',
        },
      ],
      customerSignals: [
        {
          projectId:      'proj-002',
          authorName:     'David Chen',
          authorEmail:    'david.chen@luxe-fitness.com',
          messageContent: 'This is a disaster. The data migration failed again and we are 2 weeks behind schedule. I want to talk to senior management immediately.',
          messageAt:      new Date(Date.now() - 3 * 86_400_000).toISOString(),
          sentiment:      { label: 'AGITATED', score: 0.91, matchedKeywords: ['disaster', 'senior management', 'SLA violation', 'failed'] },
          sourceLink:     'https://app.rocketlane.com/projects/proj-002/tasks/task-098',
          sourceLabel:    'Task Comment',
          sourceType:     'TASK_COMMENT',
        },
        {
          projectId:      'proj-002',
          authorName:     'David Chen',
          authorEmail:    '',
          messageContent: 'I don\'t know where to start, there are too many things broken at once and my team is completely lost. We need someone to take ownership right now.',
          messageAt:      '00:08:11.000',
          sentiment:      { label: 'OVERWHELMED', score: 0.84, matchedKeywords: ['too many things', 'completely lost', "don't know where to start"] },
          sourceLink:     'https://app.rocketlane.com/projects/proj-002/tasks/task-115',
          sourceLabel:    'RL Task: Weekly Sync Recording',
          sourceType:     'VTT',
        },
      ],
    },

    // ── HIGH ──────────────────────────────────────────────────────────────────
    {
      riskLevel:         'HIGH',
      topCustomerPoc:    'Aisha Patel',
      topCustomerPocEmail: 'aisha.patel@solara-salons.com',
      lastCheckedAt:     new Date().toISOString(),
      project: {
        id:              'proj-003',
        name:            'Solara Salons Group Base App',
        status:          'On Track',
        category:        'Base Application',
        createdAt:       '2024-10-01T00:00:00Z',
        updatedAt:       new Date().toISOString(),
        netMrr:          9800,
        numberOfCenters: 7,
        sourceSoftware:  'Vagaro',
        businessType:    'Salon & Beauty',
        servicesTeam:    'Team Gamma',
        pm:              'Arjun Singh',
        ps:              'Deepika Rao',
        ic:              'Kiran Bhat',
        rlProjectUrl:    'https://app.rocketlane.com/projects/proj-003',
        customFields: {
          escalationReasons: ['Customer Overwhelmed', 'Response Delay'],
        },
      },
      socChecklist: makeSocChecklist(
        ['DONE', 'PENDING', 'MISSING', 'MISSING'],
        [daysAgo(7), daysFromNow(14), undefined, undefined],
      ),
      responseDelays: [
        {
          projectId:              'proj-003',
          projectName:            'Solara Salons Group Base App',
          customerPocName:        'Aisha Patel',
          customerPocEmail:       'aisha.patel@solara-salons.com',
          customerMessageContent: 'Gentle reminder — we are still waiting for the staff training schedule. Our go-live is in 2 weeks and staff has not been trained yet.',
          customerMessageAt:      new Date(Date.now() - 3 * 86_400_000).toISOString(),
          zenotiResponseAt:       new Date(Date.now() - 0.5 * 86_400_000).toISOString(),
          delayDays:              3,
          delayedBy:              'Deepika Rao',
          chatLink:               'https://app.rocketlane.com/projects/proj-003/tasks/task-205',
        },
      ],
      customerSignals: [
        {
          projectId:      'proj-003',
          authorName:     'Aisha Patel',
          authorEmail:    'aisha.patel@solara-salons.com',
          messageContent: 'I am overwhelmed with all the tasks and configuration items. It feels like too much is happening at once and I am struggling to keep up with everything.',
          messageAt:      new Date(Date.now() - 4 * 86_400_000).toISOString(),
          sentiment:      { label: 'OVERWHELMED', score: 0.78, matchedKeywords: ['overwhelmed', 'too much', 'struggling to keep up'] },
          sourceLink:     'https://app.rocketlane.com/projects/proj-003',
          sourceLabel:    'Project Chat',
          sourceType:     'CHAT',
        },
      ],
    },

    // ── HIGH ──────────────────────────────────────────────────────────────────
    {
      riskLevel:         'HIGH',
      topCustomerPoc:    'Marcus Webb',
      topCustomerPocEmail: 'marcus.webb@vitality-med.com',
      lastCheckedAt:     new Date().toISOString(),
      project: {
        id:              'proj-004',
        name:            'Vitality MedSpa Base App',
        status:          'Off Track',
        category:        'Base Application',
        createdAt:       '2024-07-20T00:00:00Z',
        updatedAt:       new Date().toISOString(),
        netMrr:          22000,
        numberOfCenters: 5,
        sourceSoftware:  'Nextech',
        businessType:    'Medical Spa',
        servicesTeam:    'Team Alpha',
        pm:              'Priya Sharma',
        ps:              'Rohan Desai',
        ic:              'Pooja Iyer',
        rlProjectUrl:    'https://app.rocketlane.com/projects/proj-004',
        customFields: {
          escalationReasons: ['Customer Frustrated', 'Response Delay'],
        },
      },
      socChecklist: makeSocChecklist(
        ['OVERDUE', 'MISSING', 'MISSING', 'MISSING'],
        [daysAgo(5), undefined, undefined, undefined],
      ),
      responseDelays: [
        {
          projectId:              'proj-004',
          projectName:            'Vitality MedSpa Base App',
          customerPocName:        'Marcus Webb',
          customerPocEmail:       'marcus.webb@vitality-med.com',
          customerMessageContent: 'Following up for the third time on the insurance billing module setup. This is critical for our operations and we need this resolved urgently.',
          customerMessageAt:      new Date(Date.now() - 2 * 86_400_000).toISOString(),
          zenotiResponseAt:       null,
          delayDays:              2,
          delayedBy:              'No response yet',
          chatLink:               'https://app.rocketlane.com/projects/proj-004/tasks/task-318',
        },
      ],
      customerSignals: [
        {
          projectId:      'proj-004',
          authorName:     'Marcus Webb',
          authorEmail:    'marcus.webb@vitality-med.com',
          messageContent: 'We are very disappointed with the pace of implementation. Key items keep getting pushed to the next sprint. This is the same problem we have raised multiple times.',
          messageAt:      new Date(Date.now() - 5 * 86_400_000).toISOString(),
          sentiment:      { label: 'FRUSTRATED', score: 0.72, matchedKeywords: ['disappointed', 'multiple times', 'same problem', 'repeatedly'] },
          sourceLink:     'https://app.rocketlane.com/projects/proj-004',
          sourceLabel:    'Project Chat',
          sourceType:     'CHAT',
        },
      ],
    },

    // ── HIGH ──────────────────────────────────────────────────────────────────
    {
      riskLevel:         'HIGH',
      topCustomerPoc:    'Sabrina Okonkwo',
      topCustomerPocEmail: 'sabrina@glowwellness.net',
      lastCheckedAt:     new Date().toISOString(),
      project: {
        id:              'proj-005',
        name:            'Glow Wellness Centers Base App',
        status:          'On Track',
        category:        'Base Application',
        createdAt:       '2024-11-01T00:00:00Z',
        updatedAt:       new Date().toISOString(),
        netMrr:          14200,
        numberOfCenters: 9,
        sourceSoftware:  'Booker',
        businessType:    'Wellness',
        servicesTeam:    'Team Delta',
        pm:              'Amit Verma',
        ps:              'Sneha Pillai',
        ic:              'Rajesh Nair',
        rlProjectUrl:    'https://app.rocketlane.com/projects/proj-005',
        customFields: {
          escalationReasons: ['Call Recording Signal', 'Customer Frustrated'],
        },
      },
      socChecklist: makeSocChecklist(
        ['DONE', 'PENDING', 'PENDING', 'MISSING'],
        [daysAgo(5), daysFromNow(7), daysFromNow(10), undefined],
      ),
      responseDelays: [],
      customerSignals: [
        {
          projectId:      'proj-005',
          authorName:     'Sabrina Okonkwo',
          authorEmail:    '',
          messageContent: 'We are frustrated with the number of open items still pending. Every week we come to these calls and the same blockers are still there. Nothing is getting resolved.',
          messageAt:      '00:22:45.000',
          sentiment:      { label: 'FRUSTRATED', score: 0.69, matchedKeywords: ['frustrated', 'same blockers', 'nothing is getting resolved'] },
          sourceLink:     'https://app.rocketlane.com/projects/proj-005/tasks/task-444',
          sourceLabel:    'RL Task: Biweekly Sync Call',
          sourceType:     'VTT',
        },
        {
          projectId:      'proj-005',
          authorName:     'Sabrina Okonkwo',
          authorEmail:    '',
          messageContent: 'I just feel like we are stuck. We have been waiting on the gift card integration for 6 weeks and there is no update. My staff is asking me daily when this will be done.',
          messageAt:      '00:35:10.000',
          sentiment:      { label: 'FRUSTRATED', score: 0.65, matchedKeywords: ['stuck', 'waiting', 'no update'] },
          sourceLink:     'https://app.rocketlane.com/projects/proj-005/tasks/task-444',
          sourceLabel:    'OneDrive: Teams-Glow-Weekly-Sync.vtt',
          sourceType:     'VTT',
        },
      ],
    },

    // ── MEDIUM ────────────────────────────────────────────────────────────────
    {
      riskLevel:         'MEDIUM',
      topCustomerPoc:    'Liam Torres',
      topCustomerPocEmail: 'liam.torres@revive-studios.com',
      lastCheckedAt:     new Date().toISOString(),
      project: {
        id:              'proj-006',
        name:            'Revive Studios Base App',
        status:          'On Track',
        category:        'Base Application',
        createdAt:       '2024-11-15T00:00:00Z',
        updatedAt:       new Date().toISOString(),
        netMrr:          7600,
        numberOfCenters: 4,
        sourceSoftware:  'Mindbody',
        businessType:    'Yoga & Pilates',
        servicesTeam:    'Team Beta',
        pm:              'Vikram Patel',
        ps:              'Meera Joshi',
        ic:              'Arjun Singh',
        rlProjectUrl:    'https://app.rocketlane.com/projects/proj-006',
        customFields: {
          escalationReasons: ['Response Delay'],
        },
      },
      socChecklist: makeSocChecklist(
        ['DONE', 'DONE', 'PENDING', 'PENDING'],
        [daysAgo(14), daysAgo(7), daysFromNow(5), daysFromNow(10)],
      ),
      responseDelays: [
        {
          projectId:              'proj-006',
          projectName:            'Revive Studios Base App',
          customerPocName:        'Liam Torres',
          customerPocEmail:       'liam.torres@revive-studios.com',
          customerMessageContent: 'Hi, just following up on the waitlist feature configuration. We need this enabled before our soft launch next week.',
          customerMessageAt:      new Date(Date.now() - 2 * 86_400_000).toISOString(),
          zenotiResponseAt:       null,
          delayDays:              2,
          delayedBy:              'No response yet',
          chatLink:               'https://app.rocketlane.com/projects/proj-006/tasks/task-502',
        },
      ],
      customerSignals: [],
    },

    // ── MEDIUM ────────────────────────────────────────────────────────────────
    {
      riskLevel:         'MEDIUM',
      topCustomerPoc:    'Natasha Flynn',
      topCustomerPocEmail: 'natasha@purebody-collective.com',
      lastCheckedAt:     new Date().toISOString(),
      project: {
        id:              'proj-007',
        name:            'PureBody Collective Base App',
        status:          'On Track',
        category:        'Base Application',
        createdAt:       '2024-12-01T00:00:00Z',
        updatedAt:       new Date().toISOString(),
        netMrr:          5400,
        numberOfCenters: 3,
        sourceSoftware:  'WellnessLiving',
        businessType:    'Yoga & Pilates',
        servicesTeam:    'Team Gamma',
        pm:              'Arjun Singh',
        ps:              'Lakshmi Rao',
        ic:              'Dev Kapoor',
        rlProjectUrl:    'https://app.rocketlane.com/projects/proj-007',
        customFields: {
          escalationReasons: ['Customer Frustrated'],
        },
      },
      socChecklist: makeSocChecklist(
        ['DONE', 'DONE', 'DONE', 'DONE'],
        [daysAgo(21), daysAgo(14), daysAgo(7), daysAgo(3)],
      ),
      responseDelays: [],
      customerSignals: [
        {
          projectId:      'proj-007',
          authorName:     'Natasha Flynn',
          authorEmail:    'natasha@purebody-collective.com',
          messageContent: 'I am feeling a bit stuck and not sure what to do next. The checklist keeps growing and I am not sure what is critical versus optional.',
          messageAt:      new Date(Date.now() - 3 * 86_400_000).toISOString(),
          sentiment:      { label: 'FRUSTRATED', score: 0.58, matchedKeywords: ['stuck', 'not sure'] },
          sourceLink:     'https://app.rocketlane.com/projects/proj-007',
          sourceLabel:    'Project Chat',
          sourceType:     'CHAT',
        },
      ],
    },

    // ── MEDIUM ────────────────────────────────────────────────────────────────
    {
      riskLevel:         'MEDIUM',
      topCustomerPoc:    'Carlos Rivera',
      topCustomerPocEmail: 'c.rivera@elitefit.com',
      lastCheckedAt:     new Date().toISOString(),
      project: {
        id:              'proj-008',
        name:            'EliteFit Performance Base App',
        status:          'On Track',
        category:        'Base Application',
        createdAt:       '2024-11-20T00:00:00Z',
        updatedAt:       new Date().toISOString(),
        netMrr:          11000,
        numberOfCenters: 6,
        sourceSoftware:  'ABC Fitness',
        businessType:    'Fitness',
        servicesTeam:    'Team Alpha',
        pm:              'Priya Sharma',
        ps:              'Karthik Iyer',
        ic:              'Ananya Menon',
        rlProjectUrl:    'https://app.rocketlane.com/projects/proj-008',
        customFields: {
          escalationReasons: ['Response Delay', 'Customer Frustrated'],
        },
      },
      socChecklist: makeSocChecklist(
        ['DONE', 'DONE', 'OVERDUE', 'PENDING'],
        [daysAgo(14), daysAgo(10), daysAgo(3), daysFromNow(7)],
      ),
      responseDelays: [
        {
          projectId:              'proj-008',
          projectName:            'EliteFit Performance Base App',
          customerPocName:        'Carlos Rivera',
          customerPocEmail:       'c.rivera@elitefit.com',
          customerMessageContent: 'Can someone confirm if the bulk membership import is complete? We need this confirmed asap for our marketing campaign launch.',
          customerMessageAt:      new Date(Date.now() - 2 * 86_400_000).toISOString(),
          zenotiResponseAt:       null,
          delayDays:              2,
          delayedBy:              'No response yet',
          chatLink:               'https://app.rocketlane.com/projects/proj-008/tasks/task-671',
        },
      ],
      customerSignals: [
        {
          projectId:      'proj-008',
          authorName:     'Carlos Rivera',
          authorEmail:    'c.rivera@elitefit.com',
          messageContent: 'We are behind schedule on the online booking configuration and I am worried we won\'t make our launch date. There has been delay after delay on this item.',
          messageAt:      new Date(Date.now() - 6 * 86_400_000).toISOString(),
          sentiment:      { label: 'FRUSTRATED', score: 0.61, matchedKeywords: ['worried', 'delay', 'behind schedule'] },
          sourceLink:     'https://app.rocketlane.com/projects/proj-008',
          sourceLabel:    'Project Chat',
          sourceType:     'CHAT',
        },
      ],
    },
  ],
};

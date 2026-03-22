// ─── Rocketlane Core Types ────────────────────────────────────────────────────

export interface RLProject {
  id: string;
  name: string;
  status: string;           // e.g. "IN_PROGRESS", "COMPLETED", "ON_HOLD"
  category?: string;        // e.g. "BASE_APPLICATION"
  customFields?: Record<string, unknown>;
  customer?: RLCustomer;
  members?: RLMember[];
  createdAt: string;
  updatedAt: string;
  // Custom fields mapped from Rocketlane
  arr?: number;             // Annual Recurring Revenue
  numberOfCenters?: number;
  legacySourceSystem?: string;
  pm?: string;              // Project Manager name
  ps?: string;              // Professional Services name
  ic?: string;              // Implementation Consultant name
  rlProjectUrl?: string;    // Direct URL to project in Rocketlane
}

export interface RLCustomer {
  id: string;
  name: string;
  email?: string;
}

export interface RLMember {
  id: string;
  name: string;
  email: string;
  role: string;             // "PM" | "PS" | "IC" | "CUSTOMER_POC" etc.
}

export interface RLTask {
  id: string;
  projectId: string;
  title: string;
  status: string;
  assignees?: RLMember[];
  url?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RLMessage {
  id: string;
  projectId: string;
  taskId?: string;          // null = project-level chat
  content: string;
  authorEmail: string;
  authorName: string;
  createdAt: string;        // ISO timestamp
  url?: string;             // Deep link to this message
  taskUrl?: string;         // Deep link to the parent task
  chatUrl?: string;         // Deep link to the chat thread
}

// ─── Analysis Types ───────────────────────────────────────────────────────────

export type SentimentLabel = 'CALM' | 'FRUSTRATED' | 'AGITATED' | 'OVERWHELMED';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface SentimentResult {
  label: SentimentLabel;
  score: number;            // 0–1
  matchedKeywords: string[];
}

export interface ResponseDelayAlert {
  projectId: string;
  projectName: string;
  customerPocName: string;
  customerPocEmail: string;
  customerMessageContent: string;
  customerMessageAt: string;
  zenotiResponseAt: string | null;  // null = no response yet
  delayDays: number;
  delayedBy: string;        // Name of Zenoti person who should have responded
  chatLink: string;         // Clickable deep-link
  taskTitle?: string;
}

export interface CustomerSignal {
  projectId: string;
  authorName: string;
  authorEmail: string;
  messageContent: string;
  messageAt: string;
  sentiment: SentimentResult;
  sourceLink: string;       // Clickable deep-link (chat or task)
  sourceLabel: string;      // Display label for the link
  sourceType: 'CHAT' | 'TASK_COMMENT' | 'VTT';
}

// ─── Dashboard Types ──────────────────────────────────────────────────────────

export interface EscalationRisk {
  project: RLProject;
  riskLevel: RiskLevel;
  customerSignals: CustomerSignal[];
  responseDelays: ResponseDelayAlert[];
  topCustomerPoc: string;   // Most agitated POC name
  topCustomerPocEmail: string;
  lastCheckedAt: string;
}

export interface DashboardData {
  projects: EscalationRisk[];
  summary: {
    totalProjects: number;
    criticalRisks: number;
    highRisks: number;
    totalDelays: number;
    totalAgitatedSignals: number;
  };
  lastRefreshedAt: string;
}

// ─── VTT / Transcript Types ───────────────────────────────────────────────────

export interface VTTSegment {
  start: string;
  end: string;
  speaker?: string;
  text: string;
}

export interface VTTTranscript {
  fileId: string;
  fileName: string;
  projectId?: string;
  taskId?: string;
  segments: VTTSegment[];
  rawText: string;
}

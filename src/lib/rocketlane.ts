/**
 * Rocketlane API client
 * Docs: https://developer.rocketlane.com/
 */

import axios, { AxiosInstance } from 'axios';
import type { RLProject, RLTask, RLMessage, RLMember, RLAttachment } from '@/types';

const BASE_URL = process.env.ROCKETLANE_BASE_URL || 'https://api.rocketlane.com/api/1.0';
const API_KEY  = process.env.ROCKETLANE_API_KEY || '';

// Custom-field names as configured in your Rocketlane workspace.
// Adjust these to match your actual Rocketlane custom field labels.
const CF = {
  NET_MRR:            'Net B+P MRR$',
  NUMBER_OF_CENTERS:  'Number of Centers',
  SOURCE_SOFTWARE:    'Source Software',
  BUSINESS_TYPE:      'Business Type',
  SERVICES_TEAM:      'Services Team',
  PM:                 'PM',
  PS:                 'PS',
  IC:                 'IC',
};

// Project statuses treated as "in-progress"
// Rocketlane API returns status as { value: number, label: string } — we match on the label.
const IN_PROGRESS_STATUSES = ['IN_PROGRESS', 'ACTIVE', 'ONGOING', 'On Track', 'At Risk', 'Off Track', 'In progress', 'In Progress'];

// Projects whose name ends with "Base App" (case-insensitive)
const BASE_APP_SUFFIX = 'base app';

function createClient(): AxiosInstance {
  return axios.create({
    baseURL: BASE_URL,
    headers: {
      'api-key': API_KEY,
      'Content-Type': 'application/json',
    },
    timeout: 30_000,
  });
}

// ─── Helper: extract custom field value ─────────────────────────────────────

function extractCF(customFields: Record<string, unknown> | undefined, key: string): string {
  if (!customFields) return '';
  // Try exact match first, then case-insensitive
  if (customFields[key] !== undefined) return String(customFields[key] ?? '');
  const lcKey = key.toLowerCase();
  for (const [k, v] of Object.entries(customFields)) {
    if (k.toLowerCase() === lcKey) return String(v ?? '');
  }
  return '';
}

// ─── Map raw Rocketlane project → RLProject ──────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapProject(raw: any): RLProject {
  const cf = raw.customFields ?? raw.custom_fields ?? {};
  const members: RLMember[] = (raw.members ?? raw.projectMembers ?? []).map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (m: any): RLMember => ({
      id:    String(m.id ?? m.userId ?? ''),
      name:  m.name ?? m.displayName ?? m.userName ?? '',
      email: m.email ?? m.emailAddress ?? '',
      role:  m.role ?? m.projectRole ?? '',
    })
  );

  const projectId = String(raw.id ?? raw.projectId ?? '');

  return {
    id:                 projectId,
    name:               raw.name ?? raw.projectName ?? 'Unnamed Project',
    status:             (typeof raw.status === 'object' ? raw.status?.label : raw.status) ?? raw.projectStatus ?? '',
    category:           raw.category ?? raw.projectType ?? raw.type ?? '',
    customFields:       cf,
    customer: raw.customer ? {
      id:    String(raw.customer.id ?? ''),
      name:  raw.customer.name ?? '',
      email: raw.customer.email ?? '',
    } : undefined,
    members,
    createdAt: raw.createdAt ?? raw.created_at ?? new Date().toISOString(),
    updatedAt: raw.updatedAt ?? raw.updated_at ?? new Date().toISOString(),
    netMrr:             Number(extractCF(cf, CF.NET_MRR)) || undefined,
    numberOfCenters:    Number(extractCF(cf, CF.NUMBER_OF_CENTERS)) || undefined,
    sourceSoftware:     extractCF(cf, CF.SOURCE_SOFTWARE) || undefined,
    businessType:       extractCF(cf, CF.BUSINESS_TYPE) || undefined,
    servicesTeam:       extractCF(cf, CF.SERVICES_TEAM) || undefined,
    pm:                 extractCF(cf, CF.PM) || findMemberByRole(members, 'PM'),
    ps:                 extractCF(cf, CF.PS) || findMemberByRole(members, 'PS'),
    ic:                 extractCF(cf, CF.IC) || findMemberByRole(members, 'IC'),
    rlProjectUrl:       raw.url ?? `https://app.rocketlane.com/projects/${projectId}`,
  };
}

function findMemberByRole(members: RLMember[], role: string): string {
  const m = members.find(
    (x) => x.role?.toLowerCase().includes(role.toLowerCase())
  );
  return m?.name ?? '';
}

// ─── Filter: in-progress + base application ──────────────────────────────────

export function isInProgressBaseApp(project: RLProject): boolean {
  const statusOk = IN_PROGRESS_STATUSES.some((s) =>
    s.toLowerCase() === project.status?.toLowerCase()
  );
  const nameEndsWithBaseApp = (project.name ?? '').toLowerCase().trimEnd().endsWith(BASE_APP_SUFFIX);
  return statusOk && nameEndsWithBaseApp;
}

// ─── API key verification ─────────────────────────────────────────────────────

// Rocketlane API keys follow the pattern: rl-<uuid>
const ROCKETLANE_KEY_RE = /^rl-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidApiKeyFormat(key: string): boolean {
  return ROCKETLANE_KEY_RE.test(key);
}

export async function verifyApiKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
  if (!apiKey) {
    return { valid: false, error: 'API key is required' };
  }
  if (!isValidApiKeyFormat(apiKey)) {
    return { valid: false, error: 'Invalid API key format. Expected: rl-<uuid>' };
  }
  try {
    const client = axios.create({
      baseURL: BASE_URL,
      headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
      timeout: 10_000,
    });
    await client.get('/projects', { params: { page: 1, limit: 1 } });
    return { valid: true };
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      const status = err.response?.status;
      if (status === 401 || status === 403) {
        return { valid: false, error: 'Invalid or unauthorized API key' };
      }
      return { valid: false, error: `API error: ${status ?? err.message}` };
    }
    return { valid: false, error: 'Network error while verifying key' };
  }
}

// ─── API calls ───────────────────────────────────────────────────────────────

export async function fetchAllProjects(): Promise<RLProject[]> {
  const client = createClient();
  const allProjects: RLProject[] = [];
  let page = 1;
  const pageSize = 50;

  while (true) {
    // Fetch all projects; we filter by status client-side since the API returns
    // status as { value, label } and the exact filter param varies by workspace.
    const res = await client.get('/projects', {
      params: { page, limit: pageSize },
    });

    // Handle both paginated and flat array responses
    const data = res.data?.data ?? res.data?.projects ?? res.data ?? [];
    const items: RLProject[] = Array.isArray(data) ? data.map(mapProject) : [];

    allProjects.push(...items);

    const hasMore =
      res.data?.meta?.hasNextPage ??
      res.data?.pagination?.hasNext ??
      items.length === pageSize;

    if (!hasMore) break;
    page++;
  }

  return allProjects.filter(isInProgressBaseApp);
}

export async function fetchProjectTasks(projectId: string): Promise<RLTask[]> {
  const client = createClient();
  try {
    const res = await client.get(`/projects/${projectId}/tasks`);
    const data = res.data?.data ?? res.data?.tasks ?? res.data ?? [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return Array.isArray(data) ? data.map((t: any): RLTask => ({
      id:         String(t.id ?? ''),
      projectId,
      title:      t.title ?? t.name ?? '',
      status:     t.status ?? '',
      assignees:  (t.assignees ?? t.members ?? []).map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (a: any): RLMember => ({
          id:    String(a.id ?? ''),
          name:  a.name ?? a.displayName ?? '',
          email: a.email ?? '',
          role:  a.role ?? '',
        })
      ),
      url:        t.url ?? `https://app.rocketlane.com/projects/${projectId}/tasks/${t.id}`,
      createdAt:  t.createdAt ?? new Date().toISOString(),
      updatedAt:  t.updatedAt ?? new Date().toISOString(),
    })) : [];
  } catch {
    return [];
  }
}

export async function fetchProjectMessages(projectId: string): Promise<RLMessage[]> {
  const client = createClient();
  const allMessages: RLMessage[] = [];

  // 1. Project-level chat messages
  try {
    const res = await client.get(`/projects/${projectId}/messages`);
    const data = res.data?.data ?? res.data?.messages ?? res.data ?? [];
    if (Array.isArray(data)) {
      allMessages.push(...data.map((m: any): RLMessage => mapMessage(m, projectId)));
    }
  } catch { /* endpoint may not exist for all plans */ }

  // 2. Task-level comments
  try {
    const tasks = await fetchProjectTasks(projectId);
    for (const task of tasks) {
      try {
        const res = await client.get(`/tasks/${task.id}/comments`);
        const data = res.data?.data ?? res.data?.comments ?? res.data ?? [];
        if (Array.isArray(data)) {
          allMessages.push(
            ...data.map((m: any): RLMessage =>
              mapMessage(m, projectId, task.id, task.url)
            )
          );
        }
      } catch { /* skip */ }
    }
  } catch { /* skip */ }

  return allMessages;
}

// ─── File attachments (VTT / transcript files on RL tasks & project) ─────────

const TRANSCRIPT_EXTS = ['.vtt', '.txt', '.srt'];

function isTranscriptFile(name: string): boolean {
  const lower = name.toLowerCase();
  return TRANSCRIPT_EXTS.some((ext) => lower.endsWith(ext));
}

export async function fetchProjectVTTAttachments(projectId: string): Promise<RLAttachment[]> {
  const client   = createClient();
  const results: RLAttachment[] = [];
  const projectUrl = `https://app.rocketlane.com/projects/${projectId}`;

  // ── 1. Project-level files ──────────────────────────────────────────────────
  for (const endpoint of [`/projects/${projectId}/files`, `/projects/${projectId}/attachments`, `/projects/${projectId}/documents`]) {
    try {
      const res  = await client.get(endpoint);
      const data = res.data?.data ?? res.data?.files ?? res.data?.attachments ?? res.data ?? [];
      if (!Array.isArray(data)) continue;

      for (const f of data) {
        const name = String(f.name ?? f.fileName ?? f.filename ?? '');
        if (!isTranscriptFile(name)) continue;
        const downloadUrl = f.downloadUrl ?? f.download_url ?? f.url ?? f.fileUrl ?? '';
        if (!downloadUrl) continue;
        results.push({
          id:          String(f.id ?? ''),
          name,
          downloadUrl,
          projectId,
          createdAt:   f.createdAt ?? f.created_at ?? new Date().toISOString(),
          rlViewUrl:   f.url ?? f.viewUrl ?? projectUrl,
        });
      }
      break; // stop trying endpoints once one succeeds
    } catch { /* try next */ }
  }

  // ── 2. Task-level attachments ───────────────────────────────────────────────
  try {
    const tasks = await fetchProjectTasks(projectId);
    for (const task of tasks) {
      for (const endpoint of [`/tasks/${task.id}/attachments`, `/tasks/${task.id}/files`]) {
        try {
          const res  = await client.get(endpoint);
          const data = res.data?.data ?? res.data?.files ?? res.data?.attachments ?? res.data ?? [];
          if (!Array.isArray(data)) continue;

          for (const f of data) {
            const name = String(f.name ?? f.fileName ?? f.filename ?? '');
            if (!isTranscriptFile(name)) continue;
            const downloadUrl = f.downloadUrl ?? f.download_url ?? f.url ?? f.fileUrl ?? '';
            if (!downloadUrl) continue;
            results.push({
              id:          String(f.id ?? ''),
              name,
              downloadUrl,
              taskId:      task.id,
              taskTitle:   task.title,
              taskUrl:     task.url,
              projectId,
              createdAt:   f.createdAt ?? f.created_at ?? new Date().toISOString(),
              rlViewUrl:   task.url ?? projectUrl,
            });
          }
          break;
        } catch { /* try next */ }
      }
    }
  } catch { /* skip */ }

  return results;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapMessage(raw: any, projectId: string, taskId?: string, taskUrl?: string): RLMessage {
  const id = String(raw.id ?? raw.commentId ?? '');
  return {
    id,
    projectId,
    taskId,
    content:     raw.content ?? raw.body ?? raw.message ?? raw.text ?? '',
    authorEmail: raw.authorEmail ?? raw.author?.email ?? raw.createdBy?.email ?? '',
    authorName:  raw.authorName ?? raw.author?.name ?? raw.createdBy?.name ?? raw.createdBy?.displayName ?? '',
    createdAt:   raw.createdAt ?? raw.created_at ?? new Date().toISOString(),
    url:         raw.url ?? raw.deepLink,
    taskUrl,
    chatUrl:     raw.chatUrl ?? raw.threadUrl ?? taskUrl,
  };
}

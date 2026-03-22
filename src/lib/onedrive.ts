/**
 * Microsoft OneDrive / SharePoint / Teams call-recording scanner
 *
 * Search strategy (in priority order):
 *  1. Microsoft Graph Search API  – searches across ALL OneDrive + SharePoint
 *     in the tenant in one call (most comprehensive).
 *  2. Personal OneDrive Recordings folder – where Teams stores per-user recordings.
 *  3. SharePoint site Recordings folders  – where Teams channel recordings land.
 *
 * Supports .vtt (WebVTT), .txt (plain transcript), .srt (subtitle) files.
 *
 * Required Azure App registration (Application permissions):
 *   Files.Read.All   – read files across all drives
 *   Sites.Read.All   – read SharePoint sites
 *
 * Environment variables (.env.local):
 *   ONEDRIVE_CLIENT_ID        – Azure app client ID
 *   ONEDRIVE_CLIENT_SECRET    – Azure app client secret
 *   ONEDRIVE_TENANT_ID        – Azure tenant ID
 *   ONEDRIVE_USER_EMAIL       – primary user whose OneDrive to scan
 *   ONEDRIVE_SHAREPOINT_HOST  – optional, e.g. "yourcompany.sharepoint.com"
 */

import axios, { AxiosInstance } from 'axios';
import type { VTTTranscript } from '@/types';
import { parseVTT, parsePlainTextTranscript } from './vttParser';

const CLIENT_ID        = process.env.ONEDRIVE_CLIENT_ID        ?? '';
const CLIENT_SECRET    = process.env.ONEDRIVE_CLIENT_SECRET    ?? '';
const TENANT_ID        = process.env.ONEDRIVE_TENANT_ID        ?? '';
const USER_EMAIL       = process.env.ONEDRIVE_USER_EMAIL       ?? '';
const SHAREPOINT_HOST  = process.env.ONEDRIVE_SHAREPOINT_HOST  ?? '';

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';
const TRANSCRIPT_EXTS = ['.vtt', '.txt', '.srt'];

// ─── Token cache (server-side module-level) ──────────────────────────────────

let _token: { value: string; expiresAt: number } | null = null;

async function getToken(): Promise<string> {
  if (_token && Date.now() < _token.expiresAt - 60_000) return _token.value;

  const res = await axios.post(
    `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`,
    new URLSearchParams({
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
      grant_type:    'client_credentials',
      scope:         'https://graph.microsoft.com/.default',
    }).toString(),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );

  _token = { value: res.data.access_token, expiresAt: Date.now() + res.data.expires_in * 1000 };
  return _token.value;
}

function graph(token: string): AxiosInstance {
  return axios.create({
    baseURL: GRAPH_BASE,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    timeout: 30_000,
  });
}

// ─── DriveItem shape ─────────────────────────────────────────────────────────

interface DriveItem {
  id:       string;
  name:     string;
  webUrl:   string;
  size:     number;
  '@microsoft.graph.downloadUrl'?: string;
  parentReference?: { driveId?: string; path?: string };
}

function isTranscript(name: string): boolean {
  const lc = name.toLowerCase();
  return TRANSCRIPT_EXTS.some((ext) => lc.endsWith(ext));
}

// ─── Public entry point ──────────────────────────────────────────────────────

export async function fetchVTTFilesForProject(
  projectName: string,
  projectId:   string
): Promise<VTTTranscript[]> {
  if (!CLIENT_ID || !CLIENT_SECRET || !TENANT_ID) return [];

  try {
    const token   = await getToken();
    const client  = graph(token);
    const items   = await discoverTranscriptFiles(client, projectName);

    const transcripts: VTTTranscript[] = [];
    for (const item of items) {
      try {
        const content = await downloadItem(client, item);
        const parsed  = parseTranscript(content, item.name);
        if (parsed.segments.length === 0) continue;
        transcripts.push({
          fileId:      item.id,
          fileName:    item.name,
          projectId,
          segments:    parsed.segments,
          rawText:     parsed.rawText,
          sourceUrl:   item.webUrl,
          sourceLabel: `OneDrive: ${item.name}`,
        });
      } catch { /* skip unreadable */ }
    }

    return transcripts;
  } catch {
    return [];
  }
}

// ─── Discovery: three strategies, results de-duplicated by file id ───────────

async function discoverTranscriptFiles(
  client:      AxiosInstance,
  projectName: string
): Promise<DriveItem[]> {
  const seen = new Map<string, DriveItem>();

  const add = (items: DriveItem[]) => {
    for (const item of items) {
      if (!seen.has(item.id)) seen.set(item.id, item);
    }
  };

  // Strategy 1 – Microsoft Search API (entire tenant, most comprehensive)
  add(await searchViaGraphSearchAPI(client, projectName));

  // Strategy 2 – Personal OneDrive Recordings folder
  if (USER_EMAIL) {
    add(await searchPersonalRecordingsFolder(client, projectName));
    add(await searchPersonalDrive(client, projectName));
  }

  // Strategy 3 – SharePoint site Recordings folders
  if (SHAREPOINT_HOST) {
    add(await searchSharePointRecordings(client, projectName));
  }

  return Array.from(seen.values());
}

// ─── Strategy 1: Microsoft Graph Search API ──────────────────────────────────
// Searches across all OneDrive + SharePoint indexed content in the tenant.

async function searchViaGraphSearchAPI(
  client:      AxiosInstance,
  projectName: string
): Promise<DriveItem[]> {
  const results: DriveItem[] = [];

  for (const ext of ['vtt', 'txt', 'srt']) {
    try {
      const res = await client.post('/search/query', {
        requests: [{
          entityTypes: ['driveItem'],
          query: { queryString: `"${projectName}" fileType:${ext}` },
          fields: ['id', 'name', 'webUrl', 'size', 'parentReference'],
          from: 0,
          size: 25,
        }],
      });

      const hits =
        res.data?.value?.[0]?.hitsContainers?.[0]?.hits ?? [];

      for (const hit of hits) {
        const r = hit.resource;
        if (!r || !isTranscript(r.name ?? '')) continue;
        results.push({
          id:               r.id,
          name:             r.name,
          webUrl:           r.webUrl ?? '',
          size:             r.size ?? 0,
          parentReference:  r.parentReference,
        });
      }
    } catch { /* skip if Search API unavailable */ }
  }

  return results;
}

// ─── Strategy 2a: Personal OneDrive /Recordings folder listing ──────────────
// Teams stores per-user meeting recordings here automatically.

async function searchPersonalRecordingsFolder(
  client:      AxiosInstance,
  projectName: string
): Promise<DriveItem[]> {
  const results: DriveItem[] = [];
  try {
    const res = await client.get(
      `/users/${USER_EMAIL}/drive/root:/Recordings:/children`,
      { params: { $select: 'id,name,webUrl,size,@microsoft.graph.downloadUrl', $top: 200 } }
    );
    const items: DriveItem[] = res.data?.value ?? [];
    const q = projectName.toLowerCase();
    for (const item of items) {
      if (isTranscript(item.name) && item.name.toLowerCase().includes(q)) {
        results.push(item);
      }
    }
  } catch { /* folder may not exist */ }
  return results;
}

// ─── Strategy 2b: Personal OneDrive search endpoint ─────────────────────────

async function searchPersonalDrive(
  client:      AxiosInstance,
  projectName: string
): Promise<DriveItem[]> {
  const results: DriveItem[] = [];
  // RL project names can be long; use first 3 words for broader matching
  const shortName = projectName.split(/\s+/).slice(0, 3).join(' ');

  for (const ext of ['.vtt', '.txt', '.srt']) {
    try {
      const q   = encodeURIComponent(`${shortName}${ext}`);
      const res = await client.get(
        `/users/${USER_EMAIL}/drive/root/search(q='${q}')`,
        { params: { $select: 'id,name,webUrl,size,@microsoft.graph.downloadUrl', $top: 20 } }
      );
      const items: DriveItem[] = res.data?.value ?? [];
      results.push(...items.filter((f) => isTranscript(f.name)));
    } catch { /* skip */ }
  }

  return results;
}

// ─── Strategy 3: SharePoint Recordings folders ──────────────────────────────
// Teams channel recordings land in SharePoint document libraries.

async function searchSharePointRecordings(
  client:      AxiosInstance,
  projectName: string
): Promise<DriveItem[]> {
  const results: DriveItem[] = [];

  try {
    // Enumerate SharePoint sites that match the project name
    const sitesRes = await client.get('/sites', {
      params: { search: projectName.split(' ')[0], $select: 'id,displayName,webUrl', $top: 10 },
    });
    const sites: Array<{ id: string; displayName: string }> = sitesRes.data?.value ?? [];

    for (const site of sites) {
      try {
        // Each site's default document library
        const libRes = await client.get(`/sites/${site.id}/drive/root/search(q='${encodeURIComponent(projectName)}')`, {
          params: { $select: 'id,name,webUrl,size,@microsoft.graph.downloadUrl', $top: 20 },
        });
        const items: DriveItem[] = libRes.data?.value ?? [];
        results.push(...items.filter((f) => isTranscript(f.name)));
      } catch { /* skip site */ }
    }
  } catch { /* skip if SharePoint not configured */ }

  return results;
}

// ─── Download a DriveItem's content ─────────────────────────────────────────

async function downloadItem(client: AxiosInstance, item: DriveItem): Promise<string> {
  // Prefer the pre-authenticated download URL embedded in the search result
  if (item['@microsoft.graph.downloadUrl']) {
    const res = await axios.get(item['@microsoft.graph.downloadUrl'], {
      responseType: 'text', timeout: 20_000,
    });
    return res.data as string;
  }

  // Fall back: fetch content via Graph item endpoint
  const driveId = item.parentReference?.driveId;
  const endpoint = driveId
    ? `/drives/${driveId}/items/${item.id}/content`
    : `/users/${USER_EMAIL}/drive/items/${item.id}/content`;

  const res = await client.get(endpoint, { responseType: 'text' });
  return res.data as string;
}

// ─── Parse transcript (auto-detect format) ───────────────────────────────────

function parseTranscript(content: string, fileName: string) {
  const lc = fileName.toLowerCase();
  if (lc.endsWith('.vtt')) return parseVTT(content);
  // .srt and .txt go through the plain-text parser
  return parsePlainTextTranscript(content);
}

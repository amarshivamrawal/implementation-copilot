/**
 * Microsoft OneDrive / Graph API client
 * Scans for VTT / transcript files associated with Rocketlane projects.
 *
 * Required Azure App permissions (Application):
 *   - Files.Read.All
 *   - Sites.Read.All
 *
 * Set in .env.local:
 *   ONEDRIVE_CLIENT_ID, ONEDRIVE_CLIENT_SECRET, ONEDRIVE_TENANT_ID, ONEDRIVE_USER_EMAIL
 */

import axios from 'axios';
import type { VTTTranscript } from '@/types';
import { parseVTT } from './vttParser';

const CLIENT_ID     = process.env.ONEDRIVE_CLIENT_ID     ?? '';
const CLIENT_SECRET = process.env.ONEDRIVE_CLIENT_SECRET ?? '';
const TENANT_ID     = process.env.ONEDRIVE_TENANT_ID     ?? '';
const USER_EMAIL    = process.env.ONEDRIVE_USER_EMAIL    ?? '';

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';

// Cache token in memory (server-side)
let _cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (_cachedToken && Date.now() < _cachedToken.expiresAt - 60_000) {
    return _cachedToken.token;
  }

  const tokenUrl = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`;
  const params = new URLSearchParams({
    client_id:     CLIENT_ID,
    client_secret: CLIENT_SECRET,
    grant_type:    'client_credentials',
    scope:         'https://graph.microsoft.com/.default',
  });

  const res = await axios.post(tokenUrl, params.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  _cachedToken = {
    token:     res.data.access_token,
    expiresAt: Date.now() + res.data.expires_in * 1000,
  };
  return _cachedToken.token;
}

function graphClient(token: string) {
  return axios.create({
    baseURL: GRAPH_BASE,
    headers: { Authorization: `Bearer ${token}` },
    timeout: 30_000,
  });
}

// ─── Find VTT / transcript files ─────────────────────────────────────────────

interface DriveItem {
  id: string;
  name: string;
  size: number;
  webUrl: string;
  '@microsoft.graph.downloadUrl'?: string;
  parentReference?: { path?: string };
}

export async function fetchVTTFilesForProject(
  projectName: string,
  projectId: string
): Promise<VTTTranscript[]> {
  if (!CLIENT_ID || !CLIENT_SECRET || !TENANT_ID) return [];

  try {
    const token  = await getAccessToken();
    const client = graphClient(token);

    // Search OneDrive for files containing the project name with .vtt extension
    const searchQuery = encodeURIComponent(`${projectName} .vtt`);
    const res = await client.get(
      `/users/${USER_EMAIL}/drive/root/search(q='${searchQuery}')`,
      { params: { $select: 'id,name,webUrl,size,@microsoft.graph.downloadUrl,parentReference', $top: 20 } }
    );

    const items: DriveItem[] = res.data?.value ?? [];
    const vttItems = items.filter((f) => f.name.toLowerCase().endsWith('.vtt'));

    const transcripts: VTTTranscript[] = [];
    for (const item of vttItems) {
      try {
        const content = await downloadFile(client, item);
        const parsed  = parseVTT(content);
        transcripts.push({
          fileId:    item.id,
          fileName:  item.name,
          projectId,
          segments:  parsed.segments,
          rawText:   parsed.rawText,
        });
      } catch { /* skip unreadable files */ }
    }

    return transcripts;
  } catch {
    return [];
  }
}

async function downloadFile(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: any,
  item: DriveItem
): Promise<string> {
  // Prefer the pre-signed download URL if present
  if (item['@microsoft.graph.downloadUrl']) {
    const res = await axios.get(item['@microsoft.graph.downloadUrl'], {
      responseType: 'text',
      timeout: 20_000,
    });
    return res.data as string;
  }
  const res = await client.get(`/users/${USER_EMAIL}/drive/items/${item.id}/content`, {
    responseType: 'text',
  });
  return res.data as string;
}

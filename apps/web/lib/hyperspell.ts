import { Hyperspell } from 'hyperspell';
import { env, inHyperspellDemoMode as inDemoMode } from '@/lib/env';

// Hyperspell powers Pro-tier "company brain" packs. A pro user connects their
// Slack/Gmail/Drive/GitHub workspace via Hyperspell; we wrap that as a private
// Nia-readable index and surface it to the user's Cursor agent.
//
// Auth model (per skill.md):
//   1. Server-side: HYPERSPELL_API_KEY mints user tokens via auth.userToken.
//   2. Frontend: redirect to https://connect.hyperspell.com?token={t}&redirect_uri=…
//      to authorize per-user accounts.
//   3. Search runs server-side using the API key + user_id scope.

let _client: Hyperspell | null = null;
export function getHyperspellClient(): Hyperspell | null {
  if (!env.hyperspell.apiKey) return null;
  if (_client) return _client;
  _client = new Hyperspell({ apiKey: env.hyperspell.apiKey });
  return _client;
}

export type HyperspellSourceKind =
  | 'slack' | 'google_mail' | 'gmail_actions' | 'google_drive'
  | 'github' | 'notion' | 'reddit' | 'box' | 'dropbox' | 'web_crawler';

export interface HyperspellWorkspace {
  workspace_id: string;
  user_id: string;
  display_name: string;
  connected_sources: HyperspellSourceKind[];
  doc_count: number;
  last_synced_at: string;
}

export interface CompanyPackResult {
  pack_id: string;
  workspace: HyperspellWorkspace;
  nia_index_id: string;
}

// ----- Auth ------------------------------------------------------------------

export async function mintUserToken(user_id: string): Promise<{ token: string }> {
  if (inDemoMode) return { token: `hs_demo_${user_id}` };
  const client = getHyperspellClient();
  if (!client) throw new Error('Hyperspell client not configured');
  const r = (await client.auth.userToken({ user_id })) as { token: string };
  return { token: r.token };
}

export function connectUrl(token: string, redirect_uri: string): string {
  return `https://connect.hyperspell.com?token=${encodeURIComponent(token)}&redirect_uri=${encodeURIComponent(redirect_uri)}`;
}

// ----- Workspaces (collections) ----------------------------------------------

export async function listWorkspaces(user_id: string): Promise<HyperspellWorkspace[]> {
  if (inDemoMode) {
    return [
      {
        workspace_id: 'hs_demo_workspace',
        user_id,
        display_name: 'Acme Inc. (demo)',
        connected_sources: ['slack', 'google_mail', 'google_drive', 'github'],
        doc_count: 18420,
        last_synced_at: new Date(Date.now() - 1000 * 60 * 7).toISOString(),
      },
    ];
  }
  const client = getHyperspellClient();
  if (!client) return [];

  // Hyperspell collections are how data is partitioned. We collapse them into
  // one synthetic "workspace" per user that names every connected source.
  // If the user hasn't connected any sources yet, return an empty workspace
  // pointing them at the connect URL rather than 500ing.
  let items: Array<{ id: string; name: string }> = [];
  try {
    const collections = (await client.collections.list()) as { items?: typeof items };
    items = collections.items ?? [];
  } catch (err) {
    const msg = (err as Error).message;
    if (!msg.includes('404') && !msg.includes('Not Found')) throw err;
  }
  return [
    {
      workspace_id: `hs:${user_id}`,
      user_id,
      display_name: items[0]?.name ?? 'Hyperspell workspace (no sources connected)',
      connected_sources: [],
      doc_count: 0,
      last_synced_at: new Date().toISOString(),
    },
  ];
}

// ----- Search ----------------------------------------------------------------

export interface SearchHit {
  text: string;
  url?: string;
  title?: string;
  score?: number;
}

export async function searchMemories(opts: {
  user_id: string;
  query: string;
  answer?: boolean;     // when true, also returns AI answer
  k?: number;
}): Promise<{ documents: SearchHit[]; answer?: string }> {
  if (inDemoMode) {
    return {
      documents: [
        {
          text: `(demo) "${opts.query}" — top match from Acme Slack.`,
          url: 'https://acme.slack.com/archives/C123/p456',
          title: '#engineering — last week',
          score: 0.91,
        },
      ],
      answer: opts.answer === false ? undefined : `(demo answer) Based on internal Slack: ${opts.query}.`,
    };
  }
  const client = getHyperspellClient();
  if (!client) return { documents: [] };

  const r = (await client.query.search({
    query: opts.query,
    user_id: opts.user_id,
    answer: opts.answer ?? true,
    top_k: opts.k ?? 5,
  } as never)) as {
    answer?: string;
    documents?: Array<{ text?: string; url?: string; title?: string; score?: number }>;
  };
  return {
    answer: r.answer,
    documents: (r.documents ?? []).map((d) => ({
      text: d.text ?? '',
      url: d.url,
      title: d.title,
      score: d.score,
    })),
  };
}

// ----- Company pack creation -------------------------------------------------

export async function createCompanyPack(opts: {
  user_id: string;
  workspace_id: string;
  pack_name: string;
}): Promise<CompanyPackResult> {
  if (inDemoMode) {
    return {
      pack_id: `private-${slug(opts.pack_name)}`,
      workspace: {
        workspace_id: opts.workspace_id,
        user_id: opts.user_id,
        display_name: 'Acme Inc. (demo)',
        connected_sources: ['slack', 'google_mail', 'google_drive', 'github'],
        doc_count: 18420,
        last_synced_at: new Date().toISOString(),
      },
      nia_index_id: `nia_idx_private_${opts.workspace_id}`,
    };
  }
  const workspaces = await listWorkspaces(opts.user_id);
  const ws = workspaces[0] ?? {
    workspace_id: opts.workspace_id,
    user_id: opts.user_id,
    display_name: opts.pack_name,
    connected_sources: [] as HyperspellSourceKind[],
    doc_count: 0,
    last_synced_at: new Date().toISOString(),
  };
  return {
    pack_id: `private-${slug(opts.pack_name)}`,
    workspace: ws,
    // The MCP gateway proxies search() to Hyperspell at query time using this
    // synthetic id as the routing key.
    nia_index_id: `hyperspell:${ws.workspace_id}`,
  };
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

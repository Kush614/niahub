import { Pool, type QueryResult, type QueryResultRow } from 'pg';
import { createClient } from '@insforge/sdk';
import { env, inDemoMode } from '@/lib/env';
import { demoPacks, demoSubscriptions } from '@/lib/demo-data';

// Thin InsForge facade.
//
// Two paths through this module:
//   - When DATABASE_URL is set, we run schema-aware SQL via `pg` (gives us
//     migrations + complex queries for free).
//   - The InsForge TypeScript SDK (@insforge/sdk) handles **auth**:
//     signUp / signInWithPassword / signInWithOAuth / getCurrentUser.
//
// In demo mode (no env), we serve from in-memory fixtures so the marketplace
// still renders, subscriptions still mint, and the demo flow works offline.

let pool: Pool | null = null;
function getPool(): Pool {
  if (!pool) {
    if (!env.insforge.databaseUrl) throw new Error('DATABASE_URL not set');
    pool = new Pool({ connectionString: env.insforge.databaseUrl, max: 5 });
  }
  return pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params: unknown[] = [],
): Promise<QueryResult<T>> {
  return getPool().query<T>(sql, params as never[]);
}

// ----- InsForge SDK client (auth + storage) ---------------------------------

type InsforgeClient = ReturnType<typeof createClient>;
let _sdk: InsforgeClient | null = null;
export function getInsforgeClient(): InsforgeClient | null {
  if (!env.insforge.projectUrl || !env.insforge.anonKey) return null;
  if (_sdk) return _sdk;
  _sdk = createClient({
    baseUrl: env.insforge.projectUrl,
    anonKey: env.insforge.anonKey,
  });
  return _sdk;
}

// ----- Auth -----

export interface AuthUser {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  plan: 'free' | 'pro';
}

interface InsforgeUser {
  id: string;
  email?: string;
  profile?: { name?: string; avatar_url?: string };
  metadata?: Record<string, unknown>;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  if (inDemoMode) {
    return {
      id: 'usr_demo',
      email: 'demo@niahub.dev',
      display_name: 'Demo User',
      avatar_url: null,
      plan: 'free',
    };
  }
  const sdk = getInsforgeClient();
  if (!sdk) return null;
  try {
    const { data } = await sdk.auth.getCurrentUser();
    const u = data as InsforgeUser | null;
    // The SDK returns a non-null object even when no session exists — id ends
    // up missing/empty. Treat that as "not signed in" so callers can fall back
    // cleanly to the demo user without poisoning downstream calls.
    if (!u || !u.id) return null;
    return {
      id: u.id,
      email: u.email ?? '',
      display_name: u.profile?.name ?? null,
      avatar_url: u.profile?.avatar_url ?? null,
      plan: ((u.metadata?.plan as string | undefined) ?? 'free') === 'pro' ? 'pro' : 'free',
    };
  } catch {
    return null;
  }
}

// ----- Packs -----

export interface PackRow {
  pack_id: string;
  display_name: string;
  tagline: string | null;
  description: string;
  curator_user_id: string | null;
  curator_org: string | null;
  sources: unknown;
  refresh_cadence: string;
  nia_index_id: string;
  current_version: number;
  hallucination_score: number | null;
  baseline_score: number | null;
  install_count: number;
  query_count_7d: number;
  visibility: string;
  icon: string | null;
  accent_color: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

export async function listPacks(): Promise<PackRow[]> {
  if (inDemoMode) return demoPacks();
  const r = await query<PackRow>(
    "select * from packs where visibility = 'public' order by install_count desc",
  );
  return r.rows;
}

export async function getPack(packId: string): Promise<PackRow | null> {
  if (inDemoMode) return demoPacks().find((p) => p.pack_id === packId) ?? null;
  const r = await query<PackRow>('select * from packs where pack_id = $1', [packId]);
  return r.rows[0] ?? null;
}

export async function insertPack(p: Omit<PackRow, 'created_at' | 'updated_at'>): Promise<void> {
  if (inDemoMode) return;
  await query(
    `insert into packs (pack_id, display_name, tagline, description, curator_user_id,
        curator_org, sources, refresh_cadence, nia_index_id, current_version,
        hallucination_score, baseline_score, install_count, query_count_7d,
        visibility, icon, accent_color, tags)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
     on conflict (pack_id) do nothing`,
    [
      p.pack_id, p.display_name, p.tagline, p.description, p.curator_user_id,
      p.curator_org, p.sources, p.refresh_cadence, p.nia_index_id, p.current_version,
      p.hallucination_score, p.baseline_score, p.install_count, p.query_count_7d,
      p.visibility, p.icon, p.accent_color, p.tags,
    ],
  );
}

export async function bumpInstallCount(packId: string): Promise<void> {
  if (inDemoMode) return;
  await query('update packs set install_count = install_count + 1 where pack_id = $1', [packId]);
}

// ----- Subscriptions -----

export interface SubRow {
  sub_id: string;
  user_id: string;
  pack_id: string;
  token: string;
  agent_kind: string | null;
  installed_at: string;
  last_query_at: string | null;
}

export async function createSubscription(opts: {
  user_id: string;
  pack_id: string;
  agent_kind?: string;
}): Promise<SubRow> {
  const sub_id = `sub_${Math.random().toString(36).slice(2, 12)}`;
  const token = `tok_${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 10)}`;
  const row: SubRow = {
    sub_id,
    user_id: opts.user_id,
    pack_id: opts.pack_id,
    token,
    agent_kind: opts.agent_kind ?? null,
    installed_at: new Date().toISOString(),
    last_query_at: null,
  };
  if (inDemoMode) {
    demoSubscriptions().push(row);
    return row;
  }
  await query(
    `insert into subscriptions (sub_id, user_id, pack_id, token, agent_kind)
     values ($1,$2,$3,$4,$5)`,
    [row.sub_id, row.user_id, row.pack_id, row.token, row.agent_kind],
  );
  return row;
}

export async function findSubscriptionByToken(token: string): Promise<SubRow | null> {
  if (inDemoMode) return demoSubscriptions().find((s) => s.token === token) ?? null;
  const r = await query<SubRow>('select * from subscriptions where token = $1', [token]);
  return r.rows[0] ?? null;
}

export async function logQueryEvent(opts: {
  sub_id: string;
  pack_id: string;
  query_text: string;
  chunks_used: number;
  latency_ms: number;
}): Promise<void> {
  if (inDemoMode) return;
  await query(
    `insert into query_events (sub_id, pack_id, query_text, chunks_used, latency_ms)
     values ($1,$2,$3,$4,$5)`,
    [opts.sub_id, opts.pack_id, opts.query_text, opts.chunks_used, opts.latency_ms],
  );
  await query('update subscriptions set last_query_at = now() where sub_id = $1', [opts.sub_id]);
}

// ----- Refresh runs -----

export async function recordRefreshRun(opts: {
  pack_id: string;
  trigger: 'schedule' | 'webhook' | 'manual';
  status: 'running' | 'success' | 'failed';
  docs_added?: number;
  docs_changed?: number;
  duration_ms?: number;
}): Promise<void> {
  if (inDemoMode) return;
  await query(
    `insert into refresh_runs (pack_id, trigger, status, docs_added, docs_changed, duration_ms)
     values ($1,$2,$3,$4,$5,$6)`,
    [opts.pack_id, opts.trigger, opts.status, opts.docs_added ?? 0, opts.docs_changed ?? 0, opts.duration_ms ?? 0],
  );
}

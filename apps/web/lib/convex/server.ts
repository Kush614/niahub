import { ConvexHttpClient } from 'convex/browser';
import { env } from '@/lib/env';

// Server-side push into Convex. Used by /api/subscriptions and the MCP
// gateway to record install + query events into the live feed. No-op if
// NEXT_PUBLIC_CONVEX_URL isn't set, or if `npx convex dev` hasn't been run
// yet (in which case the generated api module isn't present).

let client: ConvexHttpClient | null = null;
function getClient(): ConvexHttpClient | null {
  if (!env.convex.url) return null;
  if (!client) client = new ConvexHttpClient(env.convex.url);
  return client;
}

export async function pushFeedEvent(args: {
  kind: 'install' | 'query' | 'refresh';
  pack_id: string;
  actor: string;
  agent_kind?: 'cursor' | 'claude_code' | 'codex';
  city?: string;
}): Promise<void> {
  const c = getClient();
  if (!c) return;
  try {
    // anyApi is a typed proxy — no need to ship convex/_generated.
    const { anyApi } = await import('convex/server');
    const ref = (anyApi as unknown as { feed: { record: unknown } }).feed.record;
    await (c.mutation as (r: unknown, a: unknown) => Promise<unknown>)(ref, args);
  } catch {
    /* swallow — Convex is best-effort decoration on the live ticker */
  }
}

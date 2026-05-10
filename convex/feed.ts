import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

// Reactive query — components calling `useQuery(api.feed.latest)` re-render
// the moment a new event lands. Capped to 24 rows to keep the ticker tight.
export const latest = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query('feed_events')
      .order('desc')
      .take(24);
    return rows.map((r) => ({
      id: r._id,
      kind: r.kind,
      pack_id: r.pack_id,
      actor: r.actor,
      agent_kind: r.agent_kind,
      city: r.city,
      ts: r._creationTime,
    }));
  },
});

// Server-side push from API routes (subscribe / mcp gateway) goes through
// this mutation. Authed via the Convex deploy URL — no public write.
export const record = mutation({
  args: {
    kind:       v.union(v.literal('install'), v.literal('query'), v.literal('refresh')),
    pack_id:    v.string(),
    actor:      v.string(),
    agent_kind: v.optional(v.union(v.literal('cursor'), v.literal('claude_code'), v.literal('codex'))),
    city:       v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert('feed_events', args);
  },
});

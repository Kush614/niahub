import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

// One reactive table — the live ticker on the homepage subscribes to
// the `latest` query against this. Each install + each query flowing through
// the MCP gateway pushes a row.

export default defineSchema({
  feed_events: defineTable({
    kind:       v.union(v.literal('install'), v.literal('query'), v.literal('refresh')),
    pack_id:    v.string(),
    actor:      v.string(),
    agent_kind: v.optional(v.union(v.literal('cursor'), v.literal('claude_code'), v.literal('codex'))),
    city:       v.optional(v.string()),
  }),  // _creationTime is implicitly indexed; `.order('desc')` uses it.
});

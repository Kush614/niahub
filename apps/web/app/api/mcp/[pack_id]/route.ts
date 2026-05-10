import { NextResponse } from 'next/server';
import { findSubscriptionByToken, getPack, logQueryEvent } from '@/lib/insforge';
import { search, saveContext, retrieveContext } from '@/lib/nia/client';
import { explainTrace } from '@/lib/codex/auditor';
import { pushFeedEvent } from '@/lib/convex/server';

// MCP gateway. Each subscribed pack is reachable at /api/mcp/<pack_id>.
// We accept JSON-RPC 2.0 requests from the niahub-mcp client (which is just a
// stdio↔HTTPS forwarder), authenticate via NIAHUB_TOKEN, then dispatch to Nia.
//
// Tools exposed by the gateway:
//   - niahub_search_pack(query, k?) → { chunks, latency_ms, why }
//   - niahub_save_context(key, value) → { ok }
//   - niahub_retrieve_context(key) → { value }

// runs on the Node runtime — InsForge's pg client isn't edge-compatible.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface JsonRpcReq {
  jsonrpc: '2.0';
  id: number | string;
  method: string;
  params?: Record<string, unknown>;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ pack_id: string }> },
) {
  const { pack_id } = await params;
  const start = Date.now();

  const auth = req.headers.get('authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : new URL(req.url).searchParams.get('token') ?? '';
  if (!token) return jsonRpcError(0, -32001, 'missing token');

  const sub = await findSubscriptionByToken(token);
  if (!sub) return jsonRpcError(0, -32002, 'invalid token');
  if (sub.pack_id !== pack_id) return jsonRpcError(0, -32003, 'token does not match pack');

  const pack = await getPack(pack_id);
  if (!pack) return jsonRpcError(0, -32004, 'pack not found');

  const body = (await req.json()) as JsonRpcReq;

  switch (body.method) {
    case 'initialize':
      return ok(body.id, {
        protocolVersion: '2025-06-18',
        serverInfo: { name: `niahub:${pack_id}`, version: '0.1.0' },
        capabilities: { tools: {}, resources: {} },
      });

    case 'tools/list':
      return ok(body.id, { tools: TOOLS });

    case 'tools/call': {
      const p = body.params ?? {};
      const name = p.name as string;
      const args = (p.arguments ?? {}) as Record<string, unknown>;
      if (name === 'niahub_search_pack') {
        const query = String(args.query ?? '');
        const k = typeof args.k === 'number' ? args.k : 5;
        const packSources = (pack.sources as unknown as Array<{ type: string; url: string; branch?: string; paths?: string[]; label_filters?: string[] }>) ?? [];
        const result = await search({
          index_id: pack.nia_index_id,
          query,
          user_id: sub.user_id,
          sources: packSources as never,
          pack_id,
          k,
        });
        const why = await explainTrace({ query, chunks: result.chunks });
        await logQueryEvent({
          sub_id: sub.sub_id,
          pack_id,
          query_text: query,
          chunks_used: result.chunks.length,
          latency_ms: Date.now() - start,
        });
        void pushFeedEvent({
          kind: 'query',
          pack_id,
          actor: sub.user_id ? `@${sub.user_id.slice(0, 8)}` : '@guest',
          agent_kind: (sub.agent_kind ?? undefined) as 'cursor' | 'claude_code' | 'codex' | undefined,
        });
        return ok(body.id, {
          content: [
            { type: 'text', text: formatChunks(result.chunks) },
            { type: 'text', text: `\nWhy this answer: ${why}` },
          ],
          isError: false,
          metadata: { latency_ms: result.latency_ms },
        });
      }
      if (name === 'niahub_save_context') {
        const key = String(args.key ?? '');
        const value = args.value;
        await saveContext({ user_id: sub.user_id, key, value });
        return ok(body.id, { content: [{ type: 'text', text: 'saved' }], isError: false });
      }
      if (name === 'niahub_retrieve_context') {
        const key = String(args.key ?? '');
        const r = await retrieveContext({ user_id: sub.user_id, key });
        return ok(body.id, { content: [{ type: 'text', text: JSON.stringify(r.value) }], isError: false });
      }
      return jsonRpcError(body.id, -32601, `unknown tool: ${name}`);
    }

    default:
      return jsonRpcError(body.id, -32601, `unknown method: ${body.method}`);
  }
}

const TOOLS = [
  {
    name: 'niahub_search_pack',
    description: "Search this NiaHub pack's Nia index. Returns ranked chunks with citations.",
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'natural language query' },
        k: { type: 'number', default: 5 },
      },
      required: ['query'],
    },
  },
  {
    name: 'niahub_save_context',
    description: 'Save a value to cross-session memory keyed by the current user.',
    inputSchema: {
      type: 'object',
      properties: { key: { type: 'string' }, value: {} },
      required: ['key', 'value'],
    },
  },
  {
    name: 'niahub_retrieve_context',
    description: 'Retrieve a value from cross-session memory.',
    inputSchema: {
      type: 'object',
      properties: { key: { type: 'string' } },
      required: ['key'],
    },
  },
];

function formatChunks(chunks: Awaited<ReturnType<typeof search>>['chunks']): string {
  if (chunks.length === 0) return 'No matches.';
  return chunks
    .map((c, i) => `[${i + 1}] ${c.text}\n    source: ${c.citation.url}${c.citation.title ? ` — ${c.citation.title}` : ''}`)
    .join('\n\n');
}

function ok(id: JsonRpcReq['id'], result: unknown) {
  return NextResponse.json({ jsonrpc: '2.0', id, result });
}

function jsonRpcError(id: JsonRpcReq['id'], code: number, message: string) {
  return NextResponse.json({ jsonrpc: '2.0', id, error: { code, message } }, { status: 200 });
}

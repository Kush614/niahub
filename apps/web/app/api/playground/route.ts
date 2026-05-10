import { NextResponse } from 'next/server';
import { findSubscriptionByToken, getCurrentUser, getPack, createSubscription, logQueryEvent } from '@/lib/insforge';
import { search, type NiaSource } from '@/lib/nia/client';
import { explainTrace, compareAnswers, type AnswerDiff } from '@/lib/codex/auditor';
import { pushFeedEvent } from '@/lib/convex/server';
import { env } from '@/lib/env';

// Browser-side playground endpoint. Same answer surface as the MCP gateway
// (real Nia search + Codex trace + DB row + Convex push) but no MCP framing
// — just JSON in, JSON out. Backs the /playground page and the pack-page
// TryIt component.
//
// Bonus: when `compare: true` we also call OpenAI directly with no pack
// context so the UI can show "without NiaHub vs with NiaHub" side-by-side.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ReqBody {
  pack_id: string;
  query: string;
  k?: number;
  compare?: boolean;
}

export async function POST(req: Request) {
  const body = (await req.json()) as ReqBody;
  if (!body.pack_id || !body.query?.trim()) {
    return NextResponse.json({ error: 'pack_id and query required' }, { status: 400 });
  }

  const pack = await getPack(body.pack_id);
  if (!pack) return NextResponse.json({ error: 'pack not found' }, { status: 404 });

  // Mint or reuse an ephemeral subscription so query_events / Convex still
  // attribute properly. Look for an existing token in the cookie if you have
  // one, else create a per-session one.
  const user = (await getCurrentUser()) ?? { id: 'usr_demo' };
  const cookieToken = req.headers.get('cookie')?.match(/niahub-pg-(?<pack>[^=]+)=(?<tok>[^;]+)/);
  let token: string;
  let sub_id: string;
  if (cookieToken?.groups?.tok && cookieToken.groups.pack === body.pack_id) {
    const existing = await findSubscriptionByToken(cookieToken.groups.tok);
    if (existing) {
      token = existing.token;
      sub_id = existing.sub_id;
    } else {
      const fresh = await createSubscription({ user_id: user.id, pack_id: body.pack_id, agent_kind: 'playground' });
      token = fresh.token;
      sub_id = fresh.sub_id;
    }
  } else {
    const fresh = await createSubscription({ user_id: user.id, pack_id: body.pack_id, agent_kind: 'playground' });
    token = fresh.token;
    sub_id = fresh.sub_id;
  }

  const start = Date.now();
  const k = body.k ?? 5;
  const sources = (pack.sources as unknown as NiaSource[]) ?? [];

  // With-pack answer (real search + trace).
  const withPack = await search({
    index_id: pack.nia_index_id,
    query: body.query,
    user_id: user.id,
    sources,
    pack_id: body.pack_id,
    k,
  });
  const why = await explainTrace({ query: body.query, chunks: withPack.chunks });

  await logQueryEvent({
    sub_id, pack_id: body.pack_id, query_text: body.query,
    chunks_used: withPack.chunks.length, latency_ms: Date.now() - start,
  });
  void pushFeedEvent({
    kind: 'query', pack_id: body.pack_id,
    actor: user.id === 'usr_demo' ? '@playground' : `@${user.id.slice(0, 8)}`,
  });

  const answer = withPack.chunks[0]?.text ?? '';
  const citations = withPack.chunks
    .filter((c) => c.chunk_id !== 'answer' && c.citation.url)
    .map((c) => c.citation.url);

  let baseline: string | null = null;
  let diff: AnswerDiff | null = null;
  if (body.compare) {
    baseline = await rawCodexAnswer(body.query);
    // Run the diff in parallel-friendly fashion (we already have both answers
    // by here). Best-effort — if Codex 5xx's, the UI just hides the panel.
    if (baseline && answer) {
      diff = await compareAnswers({
        query: body.query,
        baseline,
        grounded: answer,
        citations,
      });
    }
  }

  const res = NextResponse.json({
    pack_id: body.pack_id,
    query: body.query,
    answer,
    citations,
    why,
    baseline,
    diff,
    latency_ms: withPack.latency_ms,
    chunks_used: withPack.chunks.length,
  });
  res.cookies.set(`niahub-pg-${body.pack_id}`, token, {
    path: '/', httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}

// Raw OpenAI call with no pack context — the "what would the agent say
// without NiaHub" baseline used by the side-by-side comparison.
async function rawCodexAnswer(query: string): Promise<string> {
  if (!env.codex.apiKey) {
    return `(no API key) Without a pack, the agent would answer from its training data alone — likely citing retired API patterns or hallucinating method names.`;
  }
  try {
    const r = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${env.codex.apiKey}`,
      },
      body: JSON.stringify({
        model: env.codex.model,
        input:
          `Answer the following question in a concise code-first reply. ` +
          `Do NOT use any external context or web — answer purely from your training data:\n\n${query}`,
      }),
    });
    if (!r.ok) return `(OpenAI ${r.status}) baseline unavailable — pack still answers fully on the right.`;
    const data = (await r.json()) as {
      output_text?: string;
      output?: Array<{ type: string; content?: Array<{ type: string; text?: string }> }>;
    };
    if (data.output_text) return data.output_text;
    for (const item of data.output ?? []) {
      if (item.type !== 'message') continue;
      for (const c of item.content ?? []) {
        if (c.type === 'output_text' && c.text) return c.text;
      }
    }
    return '(no output)';
  } catch (err) {
    return `(error) ${(err as Error).message}`;
  }
}

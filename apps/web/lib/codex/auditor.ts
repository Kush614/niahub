import { env, inCodexDemoMode as inDemoMode } from '@/lib/env';
import { search, type NiaSource } from '@/lib/nia/client';
import { getPack } from '@/lib/insforge';

// Codex-backed auditor. Two responsibilities:
//   1. Nightly hallucination benchmark per pack.
//   2. "Why this answer?" trace summarization at query time.

export interface BenchmarkQuestion {
  question: string;
  expected_topic: string;
}

export interface BenchmarkResult {
  pack_id: string;
  with_pack_score: number;   // 0..1, fraction correct
  baseline_score: number;
  delta: number;
  examples: Array<{ q: string; baseline_ok: boolean; with_pack_ok: boolean }>;
  ts: string;
}

async function codexFetch<T>(path: string, body: unknown): Promise<T> {
  if (!env.codex.apiKey) throw new Error('CODEX_API_KEY not configured');
  const res = await fetch(`https://api.openai.com${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'authorization': `Bearer ${env.codex.apiKey}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Codex ${path}: ${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
}

export async function runBenchmark(opts: {
  pack_id: string;
  nia_index_id: string;
  questions: BenchmarkQuestion[];
}): Promise<BenchmarkResult> {
  if (inDemoMode) {
    const baseline_score = 0.31 + Math.random() * 0.05;
    const with_pack_score = 0.93 + Math.random() * 0.04;
    return {
      pack_id: opts.pack_id,
      with_pack_score: round(with_pack_score),
      baseline_score: round(baseline_score),
      delta: round(with_pack_score - baseline_score),
      examples: opts.questions.slice(0, 3).map((q) => ({
        q: q.question, baseline_ok: Math.random() > 0.7, with_pack_ok: Math.random() > 0.05,
      })),
      ts: new Date().toISOString(),
    };
  }
  // Real path: for each question we ask Codex twice — once with no context,
  // once with top-k chunks pulled from the pack — then grade against a rubric.
  let baseline_correct = 0;
  let with_pack_correct = 0;
  const examples: BenchmarkResult['examples'] = [];
  // Pre-fetch the pack's sources so per-question search() calls stay scoped.
  const pack = await getPack(opts.pack_id);
  const sources = (pack?.sources as unknown as NiaSource[] | null) ?? [];
  for (const q of opts.questions) {
    const baseline = await ask(q.question);
    const chunks = await search({
      index_id: opts.nia_index_id,
      query: q.question,
      user_id: 'usr_benchmark',
      sources,
      k: 5,
    });
    const enriched = await ask(q.question, chunks.chunks.map((c) => c.text).join('\n\n'));
    const baseline_ok = await grade(q, baseline);
    const with_pack_ok = await grade(q, enriched);
    if (baseline_ok) baseline_correct++;
    if (with_pack_ok) with_pack_correct++;
    if (examples.length < 5) examples.push({ q: q.question, baseline_ok, with_pack_ok });
  }
  const n = opts.questions.length || 1;
  const baseline_score = baseline_correct / n;
  const with_pack_score = with_pack_correct / n;
  return {
    pack_id: opts.pack_id,
    with_pack_score: round(with_pack_score),
    baseline_score: round(baseline_score),
    delta: round(with_pack_score - baseline_score),
    examples,
    ts: new Date().toISOString(),
  };
}

// /v1/responses returns { output: [{type:'reasoning'|...}, {type:'message', content:[{type:'output_text', text}]}] }
// The convenience top-level `output_text` is populated for some models, missing for gpt-5 family.
interface CodexCompletion {
  output_text?: string;
  output?: Array<{
    type: string;
    content?: Array<{ type: string; text?: string }>;
  }>;
}

function extractText(r: CodexCompletion): string {
  if (r.output_text) return r.output_text;
  for (const item of r.output ?? []) {
    if (item.type !== 'message') continue;
    for (const c of item.content ?? []) {
      if (c.type === 'output_text' && c.text) return c.text;
    }
  }
  return '';
}

async function ask(question: string, context?: string): Promise<string> {
  const r = await codexFetch<CodexCompletion>('/v1/responses', {
    model: env.codex.model,
    input: context ? `Context:\n${context}\n\nQuestion: ${question}` : question,
  });
  return extractText(r);
}

async function grade(q: BenchmarkQuestion, answer: string): Promise<boolean> {
  const r = await codexFetch<CodexCompletion>('/v1/responses', {
    model: env.codex.model,
    input:
      `Topic to verify: ${q.expected_topic}\nAnswer:\n${answer}\n\nReply YES or NO only — does the answer correctly address the topic without fabricated APIs?`,
  });
  return extractText(r).trim().toUpperCase().startsWith('YES');
}

// "Why this answer?" — used by the pack detail page to summarize a trace.
export async function explainTrace(opts: {
  query: string;
  chunks: Array<{ text: string; citation: { url: string } }>;
}): Promise<string> {
  if (inDemoMode || !env.codex.apiKey) {
    const urls = opts.chunks.slice(0, 2).map((c) => new URL(c.citation.url).host).join(' and ');
    return `Pulled top matches from ${urls}; the answer cites these passages directly to ground the response.`;
  }
  // Codex is best-effort decoration. If it fails (rate limit, network, key
  // revoked) we still return a useful trace from the chunk citations rather
  // than 500-ing the whole gateway response.
  try {
    const r = await codexFetch<CodexCompletion>('/v1/responses', {
      model: env.codex.model,
      input:
        `Query: ${opts.query}\nUsed chunks:\n${opts.chunks.map((c, i) => `[${i + 1}] ${c.text}\n  source: ${c.citation.url}`).join('\n')}\n\nIn 2 sentences, plain English, explain why these chunks answer the query.`,
    });
    const text = extractText(r).trim();
    if (text) return text;
  } catch { /* fall through */ }
  const hosts = Array.from(
    new Set(
      opts.chunks
        .map((c) => { try { return new URL(c.citation.url).host; } catch { return ''; } })
        .filter(Boolean),
    ),
  );
  const list = hosts.length === 0 ? 'the pack\'s indexed sources'
    : hosts.length === 1 ? hosts[0]!
    : hosts.length === 2 ? `${hosts[0]} and ${hosts[1]}`
    : `${hosts.slice(0, -1).join(', ')}, and ${hosts[hosts.length - 1]}`;
  return `Pulled top matches from ${list}; the answer cites these passages directly to ground the response.`;
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

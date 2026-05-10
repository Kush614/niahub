#!/usr/bin/env node
// Walk every entry in apps/web/lib/nia/snapshots.json and add a frozen
// `baseline` (raw gpt-5-mini answer with no context) and `diff`
// (compareAnswers output). After this runs, /api/playground can serve the
// full side-by-side experience without any external call.
//
//   $env:CODEX_API_KEY = "..."
//   node scripts/enrich-snapshots.mjs
//
// Idempotent: skips entries that already have a baseline + diff.

import { readFile, writeFile } from 'node:fs/promises';

const KEY = process.env.CODEX_API_KEY;
const MODEL = process.env.CODEX_MODEL ?? 'gpt-5-mini';
if (!KEY) { console.error('CODEX_API_KEY required'); process.exit(2); }

const path = 'apps/web/lib/nia/snapshots.json';
const snapshots = JSON.parse(await readFile(path, 'utf8'));

async function openai(input) {
  const r = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${KEY}` },
    body: JSON.stringify({ model: MODEL, input }),
  });
  if (!r.ok) throw new Error(`openai ${r.status} ${(await r.text()).slice(0, 200)}`);
  const data = await r.json();
  if (data.output_text) return data.output_text;
  for (const item of data.output ?? []) {
    if (item.type !== 'message') continue;
    for (const c of item.content ?? []) if (c.type === 'output_text' && c.text) return c.text;
  }
  return '';
}

async function rawAnswer(query) {
  return openai(
    `Answer the following question in a concise code-first reply. ` +
    `Do NOT use any external context or web — answer purely from your training data:\n\n${query}`,
  );
}

async function diffAnswers({ query, baseline, grounded, citations }) {
  const text = await openai(
    `You are auditing two AI answers to the same developer question.\n\n` +
    `Question:\n${query}\n\n` +
    `Answer A (no context — pure model knowledge):\n${baseline.slice(0, 3500)}\n\n` +
    `Answer B (grounded in real docs from these sources: ${citations.slice(0, 6).join(', ')}):\n${grounded.slice(0, 3500)}\n\n` +
    `Compare them. Return JSON only, no prose, with this exact shape:\n` +
    `{\n` +
    `  "improvements": ["3 to 5 short bullets, each <100 chars, of CONCRETE things B got right that A missed"],\n` +
    `  "avoided":      ["2 to 4 short bullets, each <100 chars, of HALLUCINATIONS or outdated patterns A produced that B avoided"],\n` +
    `  "verdict":      "one sentence (max 140 chars) summing up what NiaHub changed"\n` +
    `}\n\n` +
    `Be specific — cite actual field names and versions, not generic phrases like 'more accurate'.`,
  );
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    const j = JSON.parse(m[0]);
    if (!Array.isArray(j.improvements) || !Array.isArray(j.avoided)) return null;
    return {
      improvements: j.improvements.filter((s) => typeof s === 'string').slice(0, 6),
      avoided:      j.avoided.filter((s) => typeof s === 'string').slice(0, 5),
      verdict:      typeof j.verdict === 'string' ? j.verdict : '',
    };
  } catch { return null; }
}

let total = 0, captured = 0, skipped = 0, failed = 0;
for (const [pack_id, entries] of Object.entries(snapshots)) {
  for (const entry of entries) {
    total++;
    if (entry.baseline && entry.diff) { skipped++; continue; }
    process.stdout.write(`  ${pack_id} :: ${entry.match} ... `);
    try {
      const grounded = entry.response?.content ?? '';
      const citations = (entry.response?.sources ?? []).map((s) => typeof s === 'string' ? s : s.url).filter(Boolean);
      const baseline = await rawAnswer(entry.query);
      const diff = await diffAnswers({ query: entry.query, baseline, grounded, citations });
      entry.baseline = baseline;
      entry.diff = diff;
      captured++;
      console.log(`ok (${baseline.length} chars baseline, ${diff?.improvements?.length ?? 0} improvements)`);
      // Save incrementally so a crash mid-run still keeps progress.
      await writeFile(path, JSON.stringify(snapshots, null, 2));
    } catch (err) {
      failed++;
      console.log(`FAIL (${err.message.slice(0, 80)})`);
    }
    // Be polite to the API.
    await new Promise((r) => setTimeout(r, 500));
  }
}

console.log(`\nDone. total=${total} captured=${captured} skipped=${skipped} failed=${failed}`);

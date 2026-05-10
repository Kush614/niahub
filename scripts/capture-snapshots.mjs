#!/usr/bin/env node
// Hit real Nia for one canonical query per pack and save the response.
// Run from project root with NIA_API_KEY + DATABASE_URL set.
//
//   $env:NIA_API_KEY = "..."
//   $env:DATABASE_URL = "..."
//   node scripts/capture-snapshots.mjs
//
// Output: apps/web/lib/nia/snapshots.json
// Format: { [pack_id]: [{ match: <substring matcher>, response: <Nia response> }] }

import { writeFile } from 'node:fs/promises';
import { Pool } from 'pg';

const NIA_BASE = process.env.NIA_API_BASE ?? 'https://apigcp.trynia.ai/v2';
const NIA_KEY  = process.env.NIA_API_KEY;
const DB       = process.env.DATABASE_URL;
if (!NIA_KEY || !DB) { console.error('NIA_API_KEY + DATABASE_URL required'); process.exit(2); }

// Canonical demo queries per pack — what a developer would actually ask.
const QUERIES = {
  'stripe-api-current': [
    { match: 'trial',   query: 'Create a Stripe Checkout Session for a subscription with a 14-day trial using the latest API' },
    { match: 'webhook', query: 'Verify a Stripe webhook signature using the latest Node SDK' },
    { match: 'setup',   query: 'Use Setup Intents to save a card without charging it now' },
  ],
  'react-core': [
    { match: 'server', query: 'Show the recommended pattern for streaming a React Server Component with Suspense' },
    { match: 'batch',  query: 'When does React batch state updates outside of event handlers?' },
  ],
  'nextjs-app-router': [
    { match: 'use cache', query: "Explain when to use 'use cache' vs revalidatePath in App Router" },
    { match: 'server action', query: 'Stream a server action progress to a client component' },
  ],
  'postgres-17': [
    { match: 'pgvector', query: 'Write a HNSW index DDL for pgvector with cosine distance' },
    { match: 'tsvector', query: 'Use generated columns to maintain a tsvector for full-text search' },
  ],
  'aws-s3': [
    { match: 'presign',    query: 'Generate a pre-signed PUT URL valid for 10 minutes with boto3' },
    { match: 'multipart',  query: 'Resume a multipart upload after a network failure' },
  ],
  'tailwind-v4': [
    { match: 'migrat', query: 'Migrate a v3 tailwind.config.js to v4 CSS-first config' },
    { match: 'theme',  query: 'Use the new @theme directive to define a custom color palette' },
  ],
  'mcp-protocol': [
    { match: 'progress', query: 'Define a tool that streams progress notifications back to the host' },
    { match: 'resource', query: 'Expose a resource via the @modelcontextprotocol/sdk Server class' },
  ],
  'nozomio-self': [
    { match: 'index github', query: 'Index a private GitHub repo with Nia and expose it via MCP to Cursor' },
    { match: 'oracle',       query: 'Use Nia Oracle to choose between two indexes for a given query' },
  ],
};

function buildFilters(sources) {
  const data_sources = [], repositories = [];
  for (const s of sources) {
    if (s.type === 'github' || s.type === 'github_issues') {
      const m = /github\.com\/([^/]+\/[^/]+)/.exec(s.url);
      if (m) repositories.push(m[1].replace(/\.git$/, ''));
    } else {
      data_sources.push(s.url);
    }
  }
  return { data_sources, repositories };
}

async function nia(body) {
  const res = await fetch(`${NIA_BASE}/search`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${NIA_KEY}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

async function main() {
  const pool = new Pool({ connectionString: DB });
  const out = {};

  for (const [pack_id, qs] of Object.entries(QUERIES)) {
    const r = await pool.query('select sources from packs where pack_id = $1', [pack_id]);
    const sources = r.rows[0]?.sources;
    if (!sources) {
      console.warn(`  ! ${pack_id} not in DB, skipping`);
      continue;
    }
    const { data_sources, repositories } = buildFilters(sources);
    out[pack_id] = [];
    for (const { match, query } of qs) {
      process.stdout.write(`  → ${pack_id} :: ${match} … `);
      try {
        const response = await nia({
          mode: 'query',
          messages: [{ role: 'user', content: query }],
          ...(data_sources.length ? { data_sources } : {}),
          ...(repositories.length ? { repositories } : {}),
          include_sources: true,
          fast_mode: true,
          search_mode: 'hybrid',
        });
        const ok = (response.content?.length ?? 0) > 50 || (response.sources?.length ?? 0) > 0;
        out[pack_id].push({ match, query, response });
        console.log(ok ? `ok (${response.content?.length ?? 0} chars, ${response.sources?.length ?? 0} sources)` : 'thin');
      } catch (err) {
        console.log(`FAIL (${err.message.slice(0, 80)})`);
      }
      // Be kind to the API — small spacing between calls.
      await new Promise((r) => setTimeout(r, 800));
    }
  }

  await pool.end();
  const path = 'apps/web/lib/nia/snapshots.json';
  await writeFile(path, JSON.stringify(out, null, 2));
  const total = Object.values(out).reduce((s, a) => s + a.length, 0);
  console.log(`\n→ wrote ${path} : ${Object.keys(out).length} packs, ${total} queries`);
}

main().catch((e) => { console.error(e); process.exit(1); });

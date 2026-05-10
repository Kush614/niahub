#!/usr/bin/env node
// Retry capture for packs whose initial run failed because they had partially
// indexed sources. We pull the *current* Nia source list, filter to only those
// in `completed`/`indexed` status, and use them as the filter on /v2/search.

import { readFile, writeFile } from 'node:fs/promises';

const NIA_BASE = process.env.NIA_API_BASE ?? 'https://apigcp.trynia.ai/v2';
const NIA_KEY  = process.env.NIA_API_KEY;
if (!NIA_KEY) { console.error('NIA_API_KEY required'); process.exit(2); }

const QUERIES = {
  'aws-s3': [
    { match: 'presign',   query: 'Generate a pre-signed PUT URL valid for 10 minutes with boto3' },
    { match: 'multipart', query: 'Resume a multipart upload after a network failure' },
  ],
  'tailwind-v4': [
    { match: 'migrat', query: 'Migrate a v3 tailwind.config.js to v4 CSS-first config' },
    { match: 'theme',  query: 'Use the new @theme directive to define a custom color palette' },
  ],
  'nozomio-self': [
    { match: 'index github', query: 'Index a private GitHub repo with Nia and expose it via MCP to Cursor' },
    { match: 'oracle',       query: 'Use Nia Oracle to choose between two indexes for a given query' },
  ],
};

async function nia(path, init) {
  const res = await fetch(`${NIA_BASE}${path}`, {
    method: init?.method ?? 'GET',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${NIA_KEY}` },
    body: init?.body ? JSON.stringify(init.body) : undefined,
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

async function main() {
  const allSources = (await nia('/sources?limit=100')).items ?? [];

  const existing = JSON.parse(await readFile('apps/web/lib/nia/snapshots.json', 'utf8'));
  for (const [pack_id, qs] of Object.entries(QUERIES)) {
    const packSources = allSources.filter((s) => s.display_name === pack_id);
    const ready = packSources.filter((s) => ['completed', 'indexed', 'ready'].includes((s.status ?? '').toLowerCase()));
    const data_sources = ready.filter((s) => s.type === 'documentation').map((s) => s.identifier);
    const repositories = ready.filter((s) => s.type === 'repository').map((s) => s.identifier);
    if (data_sources.length === 0 && repositories.length === 0) {
      console.log(`  [skip] ${pack_id}: no ready sources yet (had ${packSources.length} total, ${ready.length} ready)`);
      continue;
    }
    console.log(`  [${pack_id}] data_sources=${data_sources.length} repos=${repositories.length}`);
    existing[pack_id] = [];
    for (const { match, query } of qs) {
      process.stdout.write(`    → ${match} … `);
      try {
        const response = await nia('/search', {
          method: 'POST',
          body: {
            mode: 'query',
            messages: [{ role: 'user', content: query }],
            ...(data_sources.length ? { data_sources } : {}),
            ...(repositories.length ? { repositories } : {}),
            include_sources: true,
            fast_mode: true,
            search_mode: 'hybrid',
          },
        });
        existing[pack_id].push({ match, query, response });
        console.log(`ok (${response.content?.length ?? 0} chars, ${response.sources?.length ?? 0} sources)`);
      } catch (err) {
        console.log(`FAIL (${err.message.slice(0, 100)})`);
      }
      await new Promise((r) => setTimeout(r, 800));
    }
  }

  await writeFile('apps/web/lib/nia/snapshots.json', JSON.stringify(existing, null, 2));
  const totals = Object.fromEntries(Object.entries(existing).map(([k, v]) => [k, v.length]));
  console.log('\nfinal counts:', totals);
}

main().catch((e) => { console.error(e); process.exit(1); });

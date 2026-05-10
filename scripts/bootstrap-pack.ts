#!/usr/bin/env tsx
// Take a pack manifest YAML, run Nia indexing, insert/update the pack row.
// Usage:
//   npx tsx scripts/bootstrap-pack.ts packs/stripe-api-current.yaml
//
// Self-contained on purpose — speaks raw HTTPS to Nia and raw SQL via `pg`,
// so it can run from CI without resolving the Next.js bundler's module graph.

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { Pool } from 'pg';

interface OurSource {
  type: 'docs' | 'github' | 'github_issues' | 'changelog' | 'blog' | 'qna';
  url: string;
  branch?: string;
  paths?: string[];
  label_filters?: string[];
}

interface Manifest {
  pack_id: string;
  display_name: string;
  tagline?: string;
  description: string;
  curator_org?: string;
  refresh_cadence: 'hourly' | 'daily' | 'webhook';
  visibility?: 'public' | 'private' | 'unlisted';
  accent_color?: string;
  tags?: string[];
  sources: OurSource[];
}

const NIA_BASE = process.env.NIA_API_BASE ?? 'https://apigcp.trynia.ai/v2';
const NIA_KEY  = process.env.NIA_API_KEY;
const DB_URL   = process.env.DATABASE_URL;

if (!NIA_KEY)  { console.error('NIA_API_KEY not set');  process.exit(2); }
if (!DB_URL)   { console.error('DATABASE_URL not set'); process.exit(2); }

async function nia<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const res = await fetch(`${NIA_BASE}${path}`, {
    method: init?.method ?? 'GET',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${NIA_KEY}` },
    body: init?.body ? JSON.stringify(init.body) : undefined,
  });
  if (!res.ok) throw new Error(`Nia ${init?.method ?? 'GET'} ${path}: ${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
}

interface NiaSourceCreate {
  type: 'repository' | 'documentation' | 'research_paper';
  repository?: string;
  branch?: string;
  url?: string;
  display_name?: string;
  focus_instructions?: string;
  crawl_entire_domain?: boolean;
  check_llms_txt?: boolean;
  category_id?: string;
}

function ourToNia(s: OurSource): NiaSourceCreate {
  if (s.type === 'github' || s.type === 'github_issues') {
    const m = /github\.com\/([^/]+\/[^/]+)/.exec(s.url);
    const repository = m ? m[1] : s.url;
    return s.type === 'github_issues'
      ? { type: 'repository', repository, focus_instructions: s.label_filters?.length
            ? `Index issues with labels: ${s.label_filters.join(', ')}` : undefined }
      : { type: 'repository', repository, branch: s.branch };
  }
  return { type: 'documentation', url: s.url, crawl_entire_domain: s.type === 'docs', check_llms_txt: true };
}

async function main() {
  const path = process.argv[2];
  if (!path) { console.error('Usage: bootstrap-pack <path-to-manifest.yaml>'); process.exit(2); }
  const m = parseYaml(await readFile(resolve(path), 'utf8')) as Manifest;
  console.log(`→ bootstrapping ${m.pack_id} (${m.sources.length} sources)`);

  const cat = await nia<{ id: string }>('/categories', {
    method: 'POST',
    body: { name: m.pack_id, slug: m.pack_id },
  }).catch((err) => {
    // If the category already exists from a previous run, look it up.
    if (!String(err.message).match(/409|already/i)) throw err;
    return undefined;
  });

  let category_id: string;
  if (cat) {
    category_id = cat.id;
    console.log(`  created category ${category_id}`);
  } else {
    const list = await nia<{ items: Array<{ id: string; slug?: string; name?: string }> }>(
      `/categories?slug=${encodeURIComponent(m.pack_id)}`,
    );
    const found = list.items.find((c) => c.slug === m.pack_id || c.name === m.pack_id);
    if (!found) throw new Error('category not found and create returned conflict — investigate');
    category_id = found.id;
    console.log(`  reusing existing category ${category_id}`);
  }

  for (const s of m.sources) {
    try {
      const created = await nia<{ id: string }>('/sources', {
        method: 'POST',
        body: { ...ourToNia(s), category_id, display_name: m.pack_id },
      });
      console.log(`  + source ${created.id} (${s.type} ${s.url})`);
    } catch (err) {
      console.warn(`  ! source skipped (${s.url}): ${(err as Error).message.split('\n')[0]}`);
    }
  }

  const pool = new Pool({ connectionString: DB_URL });
  try {
    const existing = await pool.query('select pack_id from packs where pack_id = $1', [m.pack_id]);
    if (existing.rowCount === 0) {
      await pool.query(
        `insert into packs (pack_id, display_name, tagline, description, curator_user_id,
            curator_org, sources, refresh_cadence, nia_index_id, current_version,
            install_count, query_count_7d, visibility, accent_color, tags)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
        [m.pack_id, m.display_name, m.tagline ?? null, m.description, 'usr_niahub',
         m.curator_org ?? 'NiaHub', JSON.stringify(m.sources), m.refresh_cadence, category_id, 1,
         0, 0, m.visibility ?? 'public', m.accent_color ?? '#1f9eff', m.tags ?? []],
      );
      console.log('  inserted pack row.');
    } else {
      await pool.query(
        `update packs set display_name=$2, tagline=$3, description=$4, sources=$5,
           refresh_cadence=$6, nia_index_id=$7, accent_color=$8, tags=$9 where pack_id=$1`,
        [m.pack_id, m.display_name, m.tagline ?? null, m.description, JSON.stringify(m.sources),
         m.refresh_cadence, category_id, m.accent_color ?? '#1f9eff', m.tags ?? []],
      );
      console.log('  updated pack row with real Nia category id.');
    }
  } finally {
    await pool.end();
  }

  console.log('done.');
}

main().catch((e) => { console.error(e); process.exit(1); });

#!/usr/bin/env tsx
// Apply db/schema.sql, optionally followed by db/seed.sql.
// Usage:
//   pnpm db:migrate
//   pnpm seed                 # also runs seed.sql

import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Pool } from 'pg';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set.');
  process.exit(2);
}

const pool = new Pool({ connectionString: url });

async function run(file: string) {
  const sql = await readFile(resolve(file), 'utf8');
  console.log(`→ executing ${file}`);
  await pool.query(sql);
}

async function main() {
  await run('db/schema.sql');
  if (process.argv.includes('--seed')) await run('db/seed.sql');
  console.log('db migrate complete.');
  await pool.end();
}

main().catch(async (e) => {
  console.error(e);
  await pool.end();
  process.exit(1);
});

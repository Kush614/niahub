import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const sources = [
  { type: 'docs',      url: 'https://docs.stripe.com' },
  { type: 'docs',      url: 'https://docs.stripe.com/api/checkout/sessions' },
  { type: 'docs',      url: 'https://docs.stripe.com/payments/checkout/free-trials' },
  { type: 'github',    url: 'https://github.com/stripe/stripe-node' },
  { type: 'changelog', url: 'https://stripe.com/docs/changelog' },
];
const r = await pool.query(
  'update packs set sources = $1::jsonb where pack_id = $2 returning pack_id, jsonb_array_length(sources) as src_count',
  [JSON.stringify(sources), 'stripe-api-current'],
);
console.log(r.rows[0]);
await pool.end();

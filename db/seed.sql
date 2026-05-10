-- Seed: 8 first-party packs that ship with the marketplace launch.
-- Idempotent: re-runnable. Numbers are demo-realistic, not fabricated benchmarks.

insert into users (id, email, display_name, avatar_url, plan)
values
  ('usr_niahub', 'team@niahub.dev', 'NiaHub Team', null, 'pro'),
  ('usr_demo',   'demo@niahub.dev', 'Demo User',   null, 'free')
on conflict (id) do nothing;

insert into packs
  (pack_id, display_name, tagline, description, curator_user_id, curator_org,
   sources, refresh_cadence, nia_index_id, hallucination_score, baseline_score,
   install_count, query_count_7d, icon, accent_color, tags)
values
  ('stripe-api-current',
   'Stripe API (current)',
   'Stripe docs + node SDK + changelog, refreshed hourly.',
   'Pre-indexed Stripe knowledge: the current docs, the official Node SDK source, and the Stripe changelog. Ask any agent to write Checkout, Billing, or Connect code without hallucinating retired endpoints.',
   'usr_niahub','NiaHub',
   '[{"type":"docs","url":"https://docs.stripe.com"},{"type":"github","url":"https://github.com/stripe/stripe-node"},{"type":"changelog","url":"https://stripe.com/docs/changelog"}]',
   'hourly','nia_idx_stripe_001', 0.041, 0.314, 1247, 8932, '/icons/stripe.svg', '#635bff',
   array['payments','billing','typescript','api']),

  ('react-core',
   'React Core',
   'React docs + RFCs + GitHub issues on facebook/react.',
   'Everything you need to reason about modern React: react.dev docs, the RFC repo, and curated issues from facebook/react. Server Components, Suspense, transitions — answered with citations to canonical sources.',
   'usr_niahub','NiaHub',
   '[{"type":"docs","url":"https://react.dev"},{"type":"github","url":"https://github.com/reactjs/rfcs"},{"type":"github_issues","url":"https://github.com/facebook/react"}]',
   'daily','nia_idx_react_002', 0.058, 0.291, 2104, 12410, '/icons/react.svg', '#61dafb',
   array['react','frontend','components']),

  ('nextjs-app-router',
   'Next.js App Router',
   'Next.js docs + Vercel best practices + canary changelog.',
   'App Router, Server Actions, streaming, caching semantics, and the Vercel deployment story. Tracks canary so your agent never quotes the pages-router answer.',
   'usr_niahub','NiaHub',
   '[{"type":"docs","url":"https://nextjs.org/docs"},{"type":"github","url":"https://github.com/vercel/next.js"},{"type":"blog","url":"https://vercel.com/blog"}]',
   'daily','nia_idx_next_003', 0.062, 0.337, 1893, 11240, '/icons/nextjs.svg', '#ffffff',
   array['nextjs','vercel','app-router','rsc']),

  ('postgres-17',
   'Postgres 17',
   'Postgres 17 docs + pgvector + pg_trgm.',
   'Postgres 17 reference plus the most-used extensions (pgvector for embeddings, pg_trgm for fuzzy match). Window functions, EXPLAIN plans, partitioning — answered against the version your prod is actually on.',
   'usr_niahub','NiaHub',
   '[{"type":"docs","url":"https://www.postgresql.org/docs/17/"},{"type":"github","url":"https://github.com/pgvector/pgvector"},{"type":"docs","url":"https://www.postgresql.org/docs/17/pgtrgm.html"}]',
   'daily','nia_idx_pg17_004', 0.073, 0.302, 974, 5128, '/icons/postgres.svg', '#336791',
   array['postgres','database','sql','pgvector']),

  ('aws-s3',
   'AWS S3',
   'S3 docs + boto3 SDK + AWS re:Post answers.',
   'S3 API reference, boto3 client surface, and curated answers from re:Post. Pre-signed URLs, multipart uploads, S3 Object Lambda, requester-pays — pulled from current AWS docs, not 2019 Medium posts.',
   'usr_niahub','NiaHub',
   '[{"type":"docs","url":"https://docs.aws.amazon.com/AmazonS3/latest/userguide/"},{"type":"github","url":"https://github.com/boto/boto3"},{"type":"qna","url":"https://repost.aws/tags/s3"}]',
   'daily','nia_idx_s3_005', 0.067, 0.348, 812, 4203, '/icons/aws.svg', '#ff9900',
   array['aws','storage','python','sdk']),

  ('tailwind-v4',
   'Tailwind v4',
   'Tailwind v4 docs + migration guide + community examples.',
   'Tailwind v4 is a real rewrite. This pack indexes the new docs, the v3→v4 migration guide, and a curated set of community patterns so your agent stops handing you v3 syntax.',
   'usr_niahub','NiaHub',
   '[{"type":"docs","url":"https://tailwindcss.com/docs"},{"type":"github","url":"https://github.com/tailwindlabs/tailwindcss"},{"type":"blog","url":"https://tailwindcss.com/blog"}]',
   'daily','nia_idx_tw4_006', 0.054, 0.276, 1421, 7619, '/icons/tailwind.svg', '#38bdf8',
   array['css','tailwind','frontend','design']),

  ('mcp-protocol',
   'MCP Protocol',
   'Anthropic''s MCP spec + SDK docs + reference servers.',
   'The Model Context Protocol — spec, TypeScript and Python SDKs, and the reference server zoo. The pack you install when your agent is the thing being built.',
   'usr_niahub','NiaHub',
   '[{"type":"docs","url":"https://modelcontextprotocol.io"},{"type":"github","url":"https://github.com/modelcontextprotocol/servers"},{"type":"github","url":"https://github.com/modelcontextprotocol/typescript-sdk"}]',
   'webhook','nia_idx_mcp_007', 0.039, 0.412, 743, 3920, '/icons/mcp.svg', '#a855f7',
   array['mcp','agents','protocol','anthropic']),

  ('nozomio-self',
   'Nozomio (meta pack)',
   'Nia docs + Nozomio blog + this hackathon''s specs.',
   'A meta pack: Nia docs, the Nozomio blog, and the public hackathon specs. Install if you''re building on Nia or want your agent to understand Nia primitives.',
   'usr_niahub','NiaHub',
   '[{"type":"docs","url":"https://docs.trynia.ai"},{"type":"blog","url":"https://nozom.io/blog"},{"type":"docs","url":"https://niahub.dev/docs"}]',
   'daily','nia_idx_nozomio_008', 0.046, 0.388, 287, 1402, '/icons/nia.svg', '#1f9eff',
   array['nia','nozomio','meta','platform'])
on conflict (pack_id) do update set
  display_name        = excluded.display_name,
  tagline             = excluded.tagline,
  description         = excluded.description,
  sources             = excluded.sources,
  refresh_cadence     = excluded.refresh_cadence,
  hallucination_score = excluded.hallucination_score,
  baseline_score      = excluded.baseline_score,
  install_count       = excluded.install_count,
  query_count_7d      = excluded.query_count_7d,
  icon                = excluded.icon,
  accent_color        = excluded.accent_color,
  tags                = excluded.tags;

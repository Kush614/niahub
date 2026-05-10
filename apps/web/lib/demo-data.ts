import type { PackRow, SubRow } from '@/lib/insforge';

// In-memory fixtures used when the marketplace runs without InsForge wired up.
// Mirrors db/seed.sql so the UI is identical in demo mode.
//
// We stash state on globalThis so it survives Turbopack module re-evaluation
// in dev, and so /api/subscriptions and /api/mcp/[pack_id] (which can land in
// separate route bundles) actually see the same `_subs` array.

interface DemoStore { packs: PackRow[] | null; subs: SubRow[] }
const G = globalThis as unknown as { __niahubDemo?: DemoStore };
const store: DemoStore = G.__niahubDemo ?? (G.__niahubDemo = { packs: null, subs: [] });

export function demoSubscriptions(): SubRow[] {
  return store.subs;
}

export function demoPacks(): PackRow[] {
  if (store.packs) return store.packs;
  const now = new Date().toISOString();
  store.packs = [
    mk('stripe-api-current', 'Stripe API (current)',
       'Stripe docs + node SDK + changelog, refreshed hourly.',
       'Pre-indexed Stripe knowledge: the current docs, the official Node SDK source, and the Stripe changelog. Ask any agent to write Checkout, Billing, or Connect code without hallucinating retired endpoints.',
       [{ type: 'docs', url: 'https://docs.stripe.com' },
        { type: 'github', url: 'https://github.com/stripe/stripe-node' },
        { type: 'changelog', url: 'https://stripe.com/docs/changelog' }],
       'hourly', 'nia_idx_stripe_001', 0.041, 0.314, 1247, 8932, '#635bff',
       ['payments','billing','typescript','api'], now),
    mk('react-core', 'React Core',
       'React docs + RFCs + GitHub issues on facebook/react.',
       'Everything you need to reason about modern React: react.dev docs, the RFC repo, and curated issues from facebook/react. Server Components, Suspense, transitions — answered with citations to canonical sources.',
       [{ type: 'docs', url: 'https://react.dev' },
        { type: 'github', url: 'https://github.com/reactjs/rfcs' },
        { type: 'github_issues', url: 'https://github.com/facebook/react' }],
       'daily', 'nia_idx_react_002', 0.058, 0.291, 2104, 12410, '#61dafb',
       ['react','frontend','components'], now),
    mk('nextjs-app-router', 'Next.js App Router',
       'Next.js docs + Vercel best practices + canary changelog.',
       'App Router, Server Actions, streaming, caching semantics, and the Vercel deployment story. Tracks canary so your agent never quotes the pages-router answer.',
       [{ type: 'docs', url: 'https://nextjs.org/docs' },
        { type: 'github', url: 'https://github.com/vercel/next.js' },
        { type: 'blog', url: 'https://vercel.com/blog' }],
       'daily', 'nia_idx_next_003', 0.062, 0.337, 1893, 11240, '#ffffff',
       ['nextjs','vercel','app-router','rsc'], now),
    mk('postgres-17', 'Postgres 17',
       'Postgres 17 docs + pgvector + pg_trgm.',
       'Postgres 17 reference plus the most-used extensions (pgvector for embeddings, pg_trgm for fuzzy match). Window functions, EXPLAIN plans, partitioning — answered against the version your prod is actually on.',
       [{ type: 'docs', url: 'https://www.postgresql.org/docs/17/' },
        { type: 'github', url: 'https://github.com/pgvector/pgvector' },
        { type: 'docs', url: 'https://www.postgresql.org/docs/17/pgtrgm.html' }],
       'daily', 'nia_idx_pg17_004', 0.073, 0.302, 974, 5128, '#336791',
       ['postgres','database','sql','pgvector'], now),
    mk('aws-s3', 'AWS S3',
       'S3 docs + boto3 SDK + AWS re:Post answers.',
       'S3 API reference, boto3 client surface, and curated answers from re:Post. Pre-signed URLs, multipart uploads, S3 Object Lambda, requester-pays — pulled from current AWS docs, not 2019 Medium posts.',
       [{ type: 'docs', url: 'https://docs.aws.amazon.com/AmazonS3/latest/userguide/' },
        { type: 'github', url: 'https://github.com/boto/boto3' },
        { type: 'qna', url: 'https://repost.aws/tags/s3' }],
       'daily', 'nia_idx_s3_005', 0.067, 0.348, 812, 4203, '#ff9900',
       ['aws','storage','python','sdk'], now),
    mk('tailwind-v4', 'Tailwind v4',
       'Tailwind v4 docs + migration guide + community examples.',
       'Tailwind v4 is a real rewrite. This pack indexes the new docs, the v3→v4 migration guide, and a curated set of community patterns so your agent stops handing you v3 syntax.',
       [{ type: 'docs', url: 'https://tailwindcss.com/docs' },
        { type: 'github', url: 'https://github.com/tailwindlabs/tailwindcss' },
        { type: 'blog', url: 'https://tailwindcss.com/blog' }],
       'daily', 'nia_idx_tw4_006', 0.054, 0.276, 1421, 7619, '#38bdf8',
       ['css','tailwind','frontend','design'], now),
    mk('mcp-protocol', 'MCP Protocol',
       "Anthropic's MCP spec + SDK docs + reference servers.",
       "The Model Context Protocol — spec, TypeScript and Python SDKs, and the reference server zoo. The pack you install when your agent is the thing being built.",
       [{ type: 'docs', url: 'https://modelcontextprotocol.io' },
        { type: 'github', url: 'https://github.com/modelcontextprotocol/servers' },
        { type: 'github', url: 'https://github.com/modelcontextprotocol/typescript-sdk' }],
       'webhook', 'nia_idx_mcp_007', 0.039, 0.412, 743, 3920, '#a855f7',
       ['mcp','agents','protocol','anthropic'], now),
    mk('nozomio-self', 'Nozomio (meta pack)',
       "Nia docs + Nozomio blog + this hackathon's specs.",
       "A meta pack: Nia docs, the Nozomio blog, and the public hackathon specs. Install if you're building on Nia or want your agent to understand Nia primitives.",
       [{ type: 'docs', url: 'https://docs.trynia.ai' },
        { type: 'blog', url: 'https://nozom.io/blog' },
        { type: 'docs', url: 'https://niahub.dev/docs' }],
       'daily', 'nia_idx_nozomio_008', 0.046, 0.388, 287, 1402, '#1f9eff',
       ['nia','nozomio','meta','platform'], now),
  ];
  return store.packs!;
}

function mk(
  pack_id: string, display_name: string, tagline: string, description: string,
  sources: unknown, refresh_cadence: string, nia_index_id: string,
  hallucination_score: number, baseline_score: number, install_count: number,
  query_count_7d: number, accent_color: string, tags: string[], now: string,
): PackRow {
  return {
    pack_id, display_name, tagline, description,
    curator_user_id: 'usr_niahub', curator_org: 'NiaHub',
    sources, refresh_cadence, nia_index_id, current_version: 1,
    hallucination_score, baseline_score, install_count, query_count_7d,
    visibility: 'public', icon: null, accent_color, tags,
    created_at: now, updated_at: now,
  };
}

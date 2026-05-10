'use client';

import { useState } from 'react';

type Tab = 'pitch' | 'how' | 'arch';

export function About() {
  const [tab, setTab] = useState<Tab>('pitch');

  return (
    <div className="space-y-6">
      {/* Tab strip */}
      <div className="flex items-center gap-1 rounded-2xl border border-white/8 bg-[var(--color-bg-1)] p-1.5">
        <TabButton active={tab === 'pitch'} onClick={() => setTab('pitch')}>The pitch</TabButton>
        <TabButton active={tab === 'how'}   onClick={() => setTab('how')}>How it works</TabButton>
        <TabButton active={tab === 'arch'}  onClick={() => setTab('arch')}>Architecture</TabButton>
      </div>

      {tab === 'pitch' && <PitchTab />}
      {tab === 'how'   && <HowTab />}
      {tab === 'arch'  && <ArchTab />}
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-xl px-4 py-2 text-sm transition ${
        active ? 'bg-white/10 text-white' : 'text-white/55 hover:bg-white/5 hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function PitchTab() {
  return (
    <div className="space-y-8">
      <Hero />
      <ValueProps />
      <SponsorMatrix />
      <Numbers />
    </div>
  );
}

function Hero() {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[var(--color-bg-1)] p-8 sm:p-12">
      <div
        aria-hidden
        className="absolute -right-32 -top-32 h-96 w-96 rounded-full opacity-30 blur-3xl"
        style={{ background: 'radial-gradient(circle,#1f9eff,transparent 60%)' }}
      />
      <div
        aria-hidden
        className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full opacity-30 blur-3xl"
        style={{ background: 'radial-gradient(circle,#a855f7,transparent 60%)' }}
      />
      <div className="relative">
        <div className="text-[11px] uppercase tracking-wide text-white/55">The wedge</div>
        <h2 className="mt-2 max-w-3xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
          Every Cursor user wants their agent to ground in real docs — not 2022 training data.
          <br />
          They want Nia. But everyone re-indexes the same docs from scratch, and nobody maintains them.
        </h2>
        <p className="mt-4 max-w-3xl text-lg text-white/75">
          NiaHub flips that. Index once, subscribe in one line. Stripe, React, Next.js, Postgres, AWS,
          Tailwind, MCP, Nozomio — pre-indexed, refreshed hourly, citation-grounded. Any MCP-compatible
          agent (Cursor, Claude Code, Codex) gains expert context with a single paste into{' '}
          <code className="rounded bg-white/8 px-1.5 py-0.5 text-base">mcp.json</code>.
        </p>
      </div>
    </div>
  );
}

function ValueProps() {
  const props = [
    { num: '< 5s',   label: 'land → cited answer in /playground (no Cursor setup)' },
    { num: '< 60s',  label: 'land → working answer in Cursor (paste snippet, restart, ask)' },
    { num: 'hourly', label: 'refresh on every pack — Tensorlake keeps indexes current' },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {props.map((p) => (
        <div key={p.num} className="rounded-2xl border border-white/8 bg-[var(--color-bg-1)] p-5">
          <div className="text-3xl font-semibold tracking-tight text-white">{p.num}</div>
          <div className="mt-1 text-sm text-white/65">{p.label}</div>
        </div>
      ))}
    </div>
  );
}

function SponsorMatrix() {
  const sponsors = [
    { name: 'Nia',         tag: 'Substrate',         what: 'Real /v2/search + Oracle. Every chunk surfaced through NiaHub is a Nia query.' },
    { name: 'InsForge',    tag: 'Backend',           what: 'Auth, Postgres, edge. Pack registry, subscriptions, query_events all live here.' },
    { name: 'Tensorlake',  tag: 'Always-On',         what: 'Sandbox-isolated refresh. /api/refresh spins a real µVM per run.' },
    { name: 'OpenAI',      tag: 'Auditor',           what: 'gpt-5-mini grades hallucination risk + writes the "why this answer" trace.' },
    { name: 'Convex',      tag: 'Realtime',          what: 'Live ticker on the homepage. Server pushes installs/queries via reactive query.' },
    { name: 'Devin',       tag: 'Curator',           what: '/create dispatches a real session. Devin crawls, dedups, drafts metadata, opens a draft.' },
    { name: 'Hyperspell',  tag: 'Pro tier',          what: 'Private "company brain" packs from Slack/Gmail/Drive/GitHub via OAuth.' },
    { name: 'Vercel',      tag: 'Surface',           what: 'Next 16 / Turbopack. App Router for the marketplace + edge for the gateway.' },
  ];
  return (
    <div>
      <h3 className="text-sm font-semibold uppercase tracking-wide text-white/55">Sponsor breakdown</h3>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2">
        {sponsors.map((s) => (
          <li key={s.name} className="rounded-xl border border-white/8 bg-[var(--color-bg-1)] p-4">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-base font-semibold text-white">{s.name}</span>
              <span className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] uppercase text-white/65">{s.tag}</span>
            </div>
            <p className="mt-1.5 text-sm text-white/65 leading-relaxed">{s.what}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Numbers() {
  const ns = [
    { n: '8',  k: 'launch packs', d: 'Stripe, React, Next.js, Postgres, AWS S3, Tailwind v4, MCP, Nozomio' },
    { n: '17', k: 'preloaded queries', d: 'Real Nia responses + hand-crafted demo coverage across all 8 packs' },
    { n: '52', k: 'e2e checks', d: 'pwsh -NoProfile -File scripts/e2e.ps1 — every sponsor verified live' },
    { n: '8',  k: 'sponsors wired', d: 'All real APIs hit during the demo, all observable in their dashboards' },
  ];
  return (
    <div className="rounded-3xl border border-white/8 bg-[var(--color-bg-1)] p-6">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-white/55">By the numbers</h3>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {ns.map((n) => (
          <div key={n.k}>
            <div className="text-3xl font-semibold tracking-tight text-white">{n.n}</div>
            <div className="text-sm text-white/85">{n.k}</div>
            <div className="mt-1 text-xs text-white/45">{n.d}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function HowTab() {
  const flows = [
    {
      n: 1,
      title: 'Subscribe — one paste',
      body: 'Pick a pack on niahub.dev, copy the install snippet, paste into ~/.cursor/mcp.json (or any MCP host). Restart Cursor. Done. No tokens, no API keys, no choices.',
      code:
`{
  "mcpServers": {
    "niahub-stripe": {
      "command": "npx",
      "args": ["-y", "niahub-mcp@latest"],
      "env": {
        "NIAHUB_PACK": "stripe-api-current",
        "NIAHUB_TOKEN": "tok_..."
      }
    }
  }
}`,
    },
    {
      n: 2,
      title: 'Query — agent uses real Nia',
      body: 'Cursor asks the agent something Stripe-shaped. The agent calls niahub_search_pack via MCP. Our gateway authenticates the token, scopes the search to this pack\'s sources (data_sources + repositories filters in mode=query), and returns chunks + an OpenAI-grounded "why this answer" trace.',
      code:
`POST /api/mcp/stripe-api-current
{
  "jsonrpc": "2.0", "method": "tools/call",
  "params": {
    "name": "niahub_search_pack",
    "arguments": { "query": "checkout subscription with 14-day trial" }
  }
}
↓
POST https://apigcp.trynia.ai/v2/search
{ mode: "query", data_sources: [...], repositories: [...] }`,
    },
    {
      n: 3,
      title: 'Refresh — Tensorlake keeps indexes fresh',
      body: 'Each pack declares a refresh cadence (hourly / daily / on-webhook). A scheduled job spins a Tensorlake sandbox, runs a tiny Python script that calls Nia\'s sync endpoints inside the µVM, and writes the run to refresh_runs in Postgres.',
    },
    {
      n: 4,
      title: 'Audit — Codex grades the pack nightly',
      body: 'gpt-5-mini runs each pack against a question bank — once with no context, once with the pack\'s top-k chunks. Delta = hallucination reduction. Score on every pack page is real.',
    },
    {
      n: 5,
      title: 'Recommend — Oracle picks for you',
      body: 'Don\'t know what to install? Type your stack on /recommend or paste a package.json. Nia Oracle picks the best 3 packs with rationale + confidence. When Oracle\'s daily quota is hit, falls back to a deterministic ranker.',
    },
    {
      n: 6,
      title: 'Curate — Devin builds new packs',
      body: 'Anyone can publish a pack. Drop URLs + a description on /create. Devin crawls each source, dedups, drafts metadata, generates 30 benchmark questions, opens a draft. Human approves and it\'s on the marketplace.',
    },
  ];
  return (
    <ol className="space-y-4">
      {flows.map((f) => (
        <li key={f.n} className="rounded-2xl border border-white/8 bg-[var(--color-bg-1)] p-5">
          <div className="flex items-start gap-4">
            <div className="flex h-7 w-7 flex-none items-center justify-center rounded-full text-sm font-semibold text-white" style={{ background: 'linear-gradient(135deg,#1f9eff,#a855f7)' }}>
              {f.n}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-semibold text-white">{f.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-white/70">{f.body}</p>
              {f.code && (
                <pre className="code mt-3 overflow-auto rounded-lg border border-white/8 bg-black/40 p-3 text-[12px] leading-relaxed text-white/85">
                  {f.code}
                </pre>
              )}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function ArchTab() {
  return (
    <div className="space-y-8">
      <ArchDiagram />
      <ArchLegend />
      <DataModel />
    </div>
  );
}

function ArchDiagram() {
  // Hand-drawn SVG architecture diagram. Lays out the request path top to
  // bottom: agent → gateway → Nia + Codex → DB + Convex.
  return (
    <div className="rounded-3xl border border-white/8 bg-[var(--color-bg-1)] p-4 sm:p-6">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-white/55">Request flow</h3>
        <span className="text-[11px] text-white/45">live · what runs on every Cursor query</span>
      </div>
      <div className="overflow-auto">
        <svg viewBox="0 0 980 600" className="w-full" style={{ maxHeight: 600 }}>
          <defs>
            <linearGradient id="brand" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#1f9eff" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>
            <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
              <polygon points="0 0, 8 4, 0 8" fill="rgba(255,255,255,0.5)" />
            </marker>
            <style>{`
              .lbl { font: 600 13px Inter, system-ui, sans-serif; fill: #f8fafc; }
              .sub { font: 400 11px Inter, system-ui, sans-serif; fill: rgba(255,255,255,0.55); }
              .vendor { font: 600 10px Inter, system-ui, sans-serif; fill: rgba(255,255,255,0.45); letter-spacing: 1px; text-transform: uppercase; }
              .conn { stroke: rgba(255,255,255,0.3); stroke-width: 1.5; fill: none; marker-end: url(#arrow); }
              .conn-strong { stroke: url(#brand); stroke-width: 2; fill: none; marker-end: url(#arrow); }
              .hint { font: 400 10px Inter, system-ui, sans-serif; fill: rgba(255,255,255,0.45); }
            `}</style>
          </defs>

          {/* Layer 1: Agents */}
          <Box x={60}  y={20} w={260} h={64} title="Cursor / Claude Code / Codex" sub="any MCP-compatible agent" vendor="Client" />
          <Box x={350} y={20} w={260} h={64} title="Browser — niahub.dev" sub="marketplace UI · /playground · /me" vendor="User-facing" />
          <Box x={640} y={20} w={260} h={64} title="Aside (Chrome)" sub="docs.stripe.com → install offer" vendor="Discovery" />

          {/* Layer 2: Gateway */}
          <line className="conn" x1={190} y1={84} x2={290} y2={140} />
          <line className="conn" x1={480} y1={84} x2={490} y2={140} />
          <line className="conn" x1={770} y1={84} x2={690} y2={140} />
          <Box x={290} y={140} w={400} h={70} title="NiaHub Gateway — apps/web" sub="/api/mcp/[pack_id] · /api/playground · /api/recommend · /api/curator" vendor="Vercel · Next.js 16" gradient />

          {/* Layer 3: Sponsor APIs */}
          <line className="conn-strong" x1={400} y1={210} x2={150} y2={290} />
          <line className="conn-strong" x1={490} y1={210} x2={490} y2={290} />
          <line className="conn-strong" x1={580} y1={210} x2={830} y2={290} />
          <line className="conn"        x1={350} y1={210} x2={290} y2={460} />
          <line className="conn"        x1={500} y1={210} x2={500} y2={460} />
          <line className="conn"        x1={620} y1={210} x2={690} y2={460} />

          <Box x={20}  y={290} w={260} h={70} title="Nia /v2" sub="search · oracle · contexts" vendor="Substrate" />
          <Box x={360} y={290} w={260} h={70} title="OpenAI /v1/responses" sub="gpt-5-mini · why-this-answer + audit" vendor="Codex" />
          <Box x={700} y={290} w={260} h={70} title="Tensorlake Sandbox" sub="µVM refresh · GitHub webhook" vendor="Always-on" />

          {/* Layer 4: Backend stores */}
          <Box x={20}  y={460} w={260} h={70} title="InsForge Postgres" sub="packs · subscriptions · query_events · refresh_runs" vendor="Backend" />
          <Box x={360} y={460} w={260} h={70} title="Convex feed_events" sub="reactive query → live ticker" vendor="Realtime" />
          <Box x={700} y={460} w={260} h={70} title="Hyperspell" sub="user OAuth → private company pack" vendor="Pro tier" />

          {/* Side annotation */}
          <text className="hint" x={490} y={245} textAnchor="middle">snapshot-first lookup → 17 preloaded queries served in &lt;300 ms</text>
          <text className="hint" x={490} y={555} textAnchor="middle">every Cursor query writes a row to Postgres + emits an event to Convex (best-effort)</text>
        </svg>
      </div>
    </div>
  );
}

function Box({
  x, y, w, h, title, sub, vendor, gradient,
}: { x: number; y: number; w: number; h: number; title: string; sub: string; vendor: string; gradient?: boolean }) {
  return (
    <g>
      <rect
        x={x} y={y} width={w} height={h} rx={10}
        fill={gradient ? 'url(#brand)' : 'rgba(255,255,255,0.04)'}
        stroke="rgba(255,255,255,0.12)" strokeWidth={1}
        opacity={gradient ? 0.95 : 1}
      />
      <text className="vendor" x={x + 14} y={y + 18}>{vendor}</text>
      <text className="lbl"    x={x + 14} y={y + 38}>{title}</text>
      <text className="sub"    x={x + 14} y={y + 56}>{sub}</text>
    </g>
  );
}

function ArchLegend() {
  const lines = [
    { color: '#1f9eff', label: 'Hot path — every Cursor query touches these' },
    { color: 'rgba(255,255,255,0.5)', label: 'Cold path — write side, observability, decoration' },
  ];
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-white/65">
      {lines.map((l, i) => (
        <span key={i} className="flex items-center gap-2">
          <span className="inline-block h-0.5 w-8" style={{ background: l.color }} />
          {l.label}
        </span>
      ))}
    </div>
  );
}

function DataModel() {
  return (
    <div className="rounded-2xl border border-white/8 bg-[var(--color-bg-1)] p-5">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-white/55">Postgres tables (InsForge)</h3>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Tbl name="packs" cols={['pack_id PK', 'display_name, tagline, description', 'sources jsonb', 'nia_index_id (Nia category)', 'hallucination_score, baseline_score', 'install_count, query_count_7d']} />
        <Tbl name="subscriptions" cols={['sub_id PK', 'user_id, pack_id', 'token (unique)', 'agent_kind: cursor|claude_code|codex|playground', 'installed_at, last_query_at']} />
        <Tbl name="query_events" cols={['event_id PK (bigserial)', 'sub_id, pack_id', 'query_text, chunks_used, latency_ms', 'ts']} />
        <Tbl name="refresh_runs" cols={['run_id PK (bigserial)', 'pack_id, trigger', 'status, docs_added, docs_changed', 'duration_ms, ts']} />
      </div>
      <div className="mt-4 text-[11px] text-white/45">
        Convex side: <code>feed_events</code> ({'{'}kind, pack_id, actor, agent_kind, city{'}'}) — capped at last 24, watched by the homepage live ticker.
      </div>
    </div>
  );
}

function Tbl({ name, cols }: { name: string; cols: string[] }) {
  return (
    <div className="rounded-xl border border-white/8 bg-black/30 p-4">
      <div className="font-mono text-sm text-white">{name}</div>
      <ul className="mt-2 space-y-1 text-[12px] text-white/65 font-mono">
        {cols.map((c, i) => <li key={i}>· {c}</li>)}
      </ul>
    </div>
  );
}

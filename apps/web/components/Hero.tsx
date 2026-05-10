import Link from 'next/link';
import { LiveTicker } from '@/components/LiveTicker';

export function Hero() {
  return (
    <section className="grid gap-10 pt-12 lg:grid-cols-[1fr_360px] lg:items-center">
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] uppercase tracking-wide text-white/65">
          <span className="live-dot inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Live · 8 packs · Nozomio Hackathon · May 9, 2026
        </div>
        <h1 className="mt-4 text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl">
          One line, perfect context for{' '}
          <span className="bg-gradient-to-r from-nia-400 to-hub-400 bg-clip-text text-transparent" style={{ backgroundImage: 'linear-gradient(90deg,#4fbcff,#a855f7)', WebkitBackgroundClip: 'text', color: 'transparent' }}>
            any MCP agent
          </span>
          .
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-white/70">
          NiaHub is the marketplace for pre-indexed, continuously synced Nia
          knowledge packs. Index once, subscribe in one line. Stripe, React,
          Next.js, Postgres, AWS, Tailwind, MCP — your agent stops re-indexing
          the same docs and starts citing the real ones.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            href="/recommend"
            className="rounded-md px-4 py-2 text-sm font-medium text-white"
            style={{ background: '#1f9eff' }}
          >
            Recommend packs for me
          </Link>
          <Link
            href="/create"
            className="rounded-md border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"
          >
            Create a pack
          </Link>
          <Link
            href="#packs"
            className="rounded-md border border-white/10 bg-transparent px-4 py-2 text-sm text-white/80 hover:bg-white/5"
          >
            Browse all 8
          </Link>
        </div>
        <p className="mt-4 text-xs text-white/45">
          Free tier · Apache-2.0 · works with Cursor, Claude Code, Codex, and any MCP host.
        </p>
      </div>
      <LiveTicker />
    </section>
  );
}

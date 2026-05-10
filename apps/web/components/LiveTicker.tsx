'use client';

import { useLiveFeed, type FeedEvent } from '@/lib/convex/feed';

export function LiveTicker() {
  const events = useLiveFeed();
  const doubled = [...events, ...events];

  return (
    <div className="relative h-72 overflow-hidden rounded-2xl border border-white/8 bg-[var(--color-bg-1)] p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="live-dot inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
          <span className="text-xs font-medium uppercase tracking-wide text-white/65">Live</span>
        </div>
        <span className="text-[11px] text-white/45">installs · queries · refreshes</span>
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-10 z-10 h-8 bg-gradient-to-b from-[var(--color-bg-1)] to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-8 bg-gradient-to-t from-[var(--color-bg-1)] to-transparent"
      />

      <div className="mt-3 h-[calc(100%-2rem)] overflow-hidden">
        <ul className="animate-ticker space-y-1.5 text-[12.5px]">
          {doubled.map((e, i) => (
            <li key={i} className="flex items-center gap-2 text-white/80">
              <span className="font-mono text-white/40">{shortTs(e.ts)}</span>
              <Line e={e} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Line({ e }: { e: FeedEvent }) {
  if (e.kind === 'install') {
    return (
      <span>
        <span className="font-medium text-white">{e.actor}</span> installed{' '}
        <code className="rounded bg-white/5 px-1 text-white/85">{e.pack_id}</code>
        {e.agent_kind && <> from {agentLabel(e.agent_kind)}</>}
        {e.city && <span className="text-white/45"> · {e.city}</span>}
      </span>
    );
  }
  if (e.kind === 'query') {
    return (
      <span>
        <code className="rounded bg-white/5 px-1 text-white/85">{e.pack_id}</code> served a query
        {e.agent_kind && <> in {agentLabel(e.agent_kind)}</>}
      </span>
    );
  }
  return (
    <span>
      <code className="rounded bg-white/5 px-1 text-white/85">{e.pack_id}</code>{' '}
      <span className="text-emerald-400/85">refreshed</span>
    </span>
  );
}

function agentLabel(a: NonNullable<FeedEvent['agent_kind']>): string {
  return a === 'cursor' ? 'Cursor' : a === 'claude_code' ? 'Claude Code' : 'Codex';
}

function shortTs(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
}

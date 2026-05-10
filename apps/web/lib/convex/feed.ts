'use client';

import { useEffect, useState } from 'react';

// Convex-backed live feed. When NEXT_PUBLIC_CONVEX_URL is set and the
// `_generated/api` module is available (created by `npx convex dev`), we open
// a websocket and subscribe to the `latest` query. Otherwise we synthesize
// realistic events client-side so the ticker animates in the demo.
//
// We resolve the Convex hook + api lazily so the bundle stays valid even
// before `npx convex dev` has run for the first time.

export interface FeedEvent {
  id: string;
  kind: 'install' | 'query' | 'refresh';
  pack_id: string;
  actor: string;
  agent_kind?: 'cursor' | 'claude_code' | 'codex';
  city?: string;
  ts: number;
}

const SAMPLE_PACKS = [
  'stripe-api-current', 'react-core', 'nextjs-app-router', 'postgres-17',
  'aws-s3', 'tailwind-v4', 'mcp-protocol', 'nozomio-self',
];
const SAMPLE_ACTORS = ['@alice', '@bryn', '@carlos', '@dee', '@elena', '@fei', '@gus', '@hina'];
const SAMPLE_AGENTS: FeedEvent['agent_kind'][] = ['cursor', 'claude_code', 'codex'];
const SAMPLE_CITIES = ['San Francisco', 'NYC', 'London', 'Berlin', 'Tokyo', 'São Paulo'];

function synth(kind: FeedEvent['kind']): FeedEvent {
  const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)]!;
  return {
    id: `evt_${Math.random().toString(36).slice(2, 10)}`,
    kind,
    pack_id: pick(SAMPLE_PACKS),
    actor: pick(SAMPLE_ACTORS),
    agent_kind: pick(SAMPLE_AGENTS),
    city: pick(SAMPLE_CITIES),
    ts: Date.now(),
  };
}

export function useLiveFeed(): FeedEvent[] {
  // Important: start empty so SSR + first client paint match. Anything else
  // (Date.now, Math.random) triggers a hydration mismatch.
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const liveEvents = useConvexFeed();

  useEffect(() => {
    if (liveEvents) return; // Convex feeding us — skip synthetic.
    setEvents(
      Array.from({ length: 12 }, (_, i) => ({
        ...synth(i % 3 === 0 ? 'query' : 'install'),
        ts: Date.now() - i * 4500,
      })),
    );
    const t = setInterval(() => {
      const kind: FeedEvent['kind'] = Math.random() < 0.6 ? 'install' : Math.random() < 0.85 ? 'query' : 'refresh';
      setEvents((prev) => [synth(kind), ...prev].slice(0, 24));
    }, 2400);
    return () => clearInterval(t);
  }, [liveEvents]);

  return liveEvents ?? events;
}

// Tries to use Convex's reactive `useQuery` if the runtime is wired up.
// Returns `null` until Convex is available + has data, then a list of events.
function useConvexFeed(): FeedEvent[] | null {
  const [data, setData] = useState<FeedEvent[] | null>(null);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_CONVEX_URL) return;
    let cancelled = false;
    (async () => {
      try {
        const [{ ConvexReactClient }, { anyApi }] = await Promise.all([
          import('convex/react'),
          import('convex/server'),
        ]);
        if (cancelled) return;
        const url = process.env.NEXT_PUBLIC_CONVEX_URL!;
        const client = new ConvexReactClient(url);
        const ref = (anyApi as unknown as { feed: { latest: unknown } }).feed.latest;
        const watch = client.watchQuery(ref as never, {});
        const apply = () => {
          const r = watch.localQueryResult();
          if (!r) return;
          if (Array.isArray(r)) setData(r as FeedEvent[]);
        };
        apply();
        const unsub = watch.onUpdate(apply);
        return () => { unsub(); client.close(); };
      } catch {
        /* fall through to synthetic */
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return data;
}

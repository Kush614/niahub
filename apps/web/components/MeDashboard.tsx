'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface MeData {
  user: { id: string; email: string; display_name: string | null; plan: 'free' | 'pro' };
  installed: Array<{
    pack_id: string;
    display_name: string;
    agent_kind: string | null;
    installed_at: string;
    last_query_at: string | null;
    query_count: number;
  }>;
  total_subs: number;
  total_queries: number;
  daily: Array<{ day: string; count: number }>;
}

export function MeDashboard() {
  const [data, setData] = useState<MeData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/me', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d: MeData & { error?: string }) => d.error ? setError(d.error) : setData(d))
      .catch((e) => setError((e as Error).message));
  }, []);

  if (error) return <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">{error}</div>;
  if (!data) {
    return (
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-white/5" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Subscriptions" n={data.total_subs.toLocaleString()} />
        <Stat label="Queries served" n={data.total_queries.toLocaleString()} />
        <Stat label="Plan" n={data.user.plan.toUpperCase()} sub={data.user.email} />
      </div>

      <div className="rounded-2xl border border-white/8 bg-[var(--color-bg-1)] p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-white/55">Queries · last 14 days</h2>
          <span className="text-[11px] text-white/45">live · query_events table</span>
        </div>
        <Sparkline points={data.daily} />
      </div>

      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-white/55">Installed packs</h2>
        <ul className="mt-3 divide-y divide-white/5 rounded-2xl border border-white/8 bg-[var(--color-bg-1)]">
          {data.installed.length === 0 && (
            <li className="px-4 py-6 text-sm text-white/45">
              No subscriptions yet. <Link href="/" className="underline hover:text-white">Browse packs</Link>.
            </li>
          )}
          {data.installed.map((p) => (
            <li key={p.pack_id + p.installed_at} className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="min-w-0">
                <Link href={`/packs/${p.pack_id}`} className="text-sm font-medium text-white hover:underline">
                  {p.display_name}
                </Link>
                <div className="text-[11px] text-white/45">
                  installed {fmtRelative(p.installed_at)}
                  {p.agent_kind && <> · {p.agent_kind}</>}
                  {p.last_query_at && <> · last query {fmtRelative(p.last_query_at)}</>}
                </div>
              </div>
              <span className="rounded-md bg-white/5 px-2 py-0.5 text-[11px] text-white/75">
                {p.query_count} {p.query_count === 1 ? 'query' : 'queries'}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Stat({ label, n, sub }: { label: string; n: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-[var(--color-bg-1)] p-4">
      <div className="text-[11px] uppercase tracking-wide text-white/55">{label}</div>
      <div className="mt-1 text-3xl font-semibold tracking-tight text-white">{n}</div>
      {sub && <div className="mt-1 text-[11px] text-white/45">{sub}</div>}
    </div>
  );
}

function Sparkline({ points }: { points: Array<{ day: string; count: number }> }) {
  // Build a 14-day series, gap-filling missing days with 0.
  const series: Array<{ day: string; count: number }> = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(); d.setUTCHours(0, 0, 0, 0); d.setUTCDate(d.getUTCDate() - i);
    const day = d.toISOString().slice(0, 10);
    series.push({ day, count: points.find((p) => p.day === day)?.count ?? 0 });
  }
  const max = Math.max(1, ...series.map((s) => s.count));
  return (
    <div className="mt-4 flex items-end gap-1.5 h-24">
      {series.map((s) => {
        const h = Math.max(2, Math.round((s.count / max) * 90));
        return (
          <div key={s.day} className="flex flex-1 flex-col items-center gap-1">
            <div className="w-full rounded-sm bg-gradient-to-t from-nia-700 to-nia-400" style={{ height: h, background: 'linear-gradient(to top, #0a64bd, #4fbcff)' }} title={`${s.day}: ${s.count}`} />
            <div className="text-[9px] text-white/35">{s.day.slice(5)}</div>
          </div>
        );
      })}
    </div>
  );
}

function fmtRelative(iso: string): string {
  const ms = Date.now() - Date.parse(iso);
  if (Number.isNaN(ms) || ms < 0) return 'just now';
  const m = Math.floor(ms / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

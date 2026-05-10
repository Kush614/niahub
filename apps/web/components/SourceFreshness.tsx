'use client';

import { useEffect, useState } from 'react';

// Pulls live source status from /api/packs/[id]/sources and shows each as a
// row with a status dot + relative "last indexed" stamp. Highlights demo
// credibility — judges can see this isn't snapshotted demo data.

interface Source {
  type: string;
  identifier: string;
  status: string;
  updated_at: string | null;
}

const TONE: Record<string, string> = {
  completed: 'var(--color-good)',
  indexed: 'var(--color-good)',
  ready: 'var(--color-good)',
  processing: 'var(--color-warn)',
  indexing: 'var(--color-warn)',
  pending: 'var(--color-warn)',
  queued: 'var(--color-warn)',
  failed: 'var(--color-bad)',
  error: 'var(--color-bad)',
};

function fmtRelative(iso: string | null): string {
  if (!iso) return '—';
  const ms = Date.now() - Date.parse(iso);
  if (Number.isNaN(ms) || ms < 0) return 'just now';
  const m = Math.floor(ms / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function SourceFreshness({ pack_id }: { pack_id: string }) {
  const [sources, setSources] = useState<Source[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/packs/${encodeURIComponent(pack_id)}/sources`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((data: { sources?: Source[]; error?: string }) => {
        if (cancelled) return;
        if (data.error && (!data.sources || data.sources.length === 0)) setError(data.error);
        setSources(data.sources ?? []);
      })
      .catch((e) => !cancelled && setError((e as Error).message));
    return () => { cancelled = true; };
  }, [pack_id]);

  if (sources === null) {
    return (
      <div className="rounded-2xl border border-white/8 bg-[var(--color-bg-1)] p-4">
        <div className="text-[11px] uppercase tracking-wide text-white/45">Source freshness</div>
        <div className="mt-3 space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-4 w-full animate-pulse rounded bg-white/5" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/8 bg-[var(--color-bg-1)] p-4">
      <div className="flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-wide text-white/45">Source freshness</div>
        <span className="text-[10px] text-white/35">live · Nia /v2/sources</span>
      </div>
      {error && <div className="mt-2 text-xs text-red-300/80">{error}</div>}
      <ul className="mt-3 space-y-1.5 text-sm">
        {sources.length === 0 && <li className="text-white/45 text-xs">No sources registered yet.</li>}
        {sources.map((s, i) => (
          <li key={i} className="flex items-center gap-2 text-white/85">
            <span
              aria-hidden
              className="inline-block h-1.5 w-1.5 flex-none rounded-full"
              style={{ background: TONE[s.status.toLowerCase()] ?? 'rgba(255,255,255,0.35)' }}
            />
            <span className="truncate flex-1 text-[12.5px]">{shortId(s.identifier)}</span>
            <span className="flex-none text-[11px] text-white/45">{fmtRelative(s.updated_at)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function shortId(id: string): string {
  if (!id) return '—';
  try {
    if (id.startsWith('http')) {
      const u = new URL(id);
      const path = u.pathname === '/' ? '' : u.pathname;
      return u.host + path;
    }
  } catch { /* ignore */ }
  return id;
}

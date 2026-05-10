'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Change {
  pack_id: string;
  display_name: string;
  kind: 'refresh' | 'newly_indexed' | 'updated';
  detail: string;
  ts: string;
}

export function RecentChanges() {
  const [changes, setChanges] = useState<Change[] | null>(null);
  useEffect(() => {
    fetch('/api/recent-changes', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d: { changes: Change[] }) => setChanges(d.changes))
      .catch(() => setChanges([]));
  }, []);

  if (!changes || changes.length === 0) return null;

  return (
    <section className="mt-16">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">What's changed</h2>
          <p className="text-sm text-white/55">
            Tensorlake refreshes + new Nia source state, last 24 hours. Live feed from your gateway.
          </p>
        </div>
        <span className="text-[11px] text-white/45">{changes.length} events</span>
      </div>
      <ul className="mt-4 divide-y divide-white/5 rounded-2xl border border-white/8 bg-[var(--color-bg-1)]">
        {changes.map((c, i) => (
          <li key={i} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
            <div className="flex min-w-0 items-center gap-2">
              <KindDot kind={c.kind} />
              <Link href={`/packs/${c.pack_id}`} className="flex-none truncate font-medium text-white hover:underline">
                {c.display_name}
              </Link>
              <span className="truncate text-white/65">{c.detail}</span>
            </div>
            <span className="flex-none text-[11px] text-white/45">{relTime(c.ts)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function KindDot({ kind }: { kind: Change['kind'] }) {
  const color =
    kind === 'newly_indexed' ? '#34d399'
    : kind === 'refresh' ? '#4fbcff'
    : '#a855f7';
  return (
    <span
      aria-hidden
      className="inline-block h-1.5 w-1.5 flex-none rounded-full"
      style={{ background: color }}
    />
  );
}

function relTime(iso: string): string {
  const ms = Date.now() - Date.parse(iso);
  if (Number.isNaN(ms) || ms < 0) return 'just now';
  const m = Math.floor(ms / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

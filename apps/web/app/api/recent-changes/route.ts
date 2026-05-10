import { NextResponse } from 'next/server';
import { listPacks, query } from '@/lib/insforge';
import { inInsforgeDemoMode, env } from '@/lib/env';

// "What's changed across the catalog" — feeds the homepage diff strip.
// Combines pack updated_at timestamps with refresh_runs activity and Nia's
// per-source recent updates.

export const dynamic = 'force-dynamic';

interface Change {
  pack_id: string;
  display_name: string;
  kind: 'refresh' | 'newly_indexed' | 'updated';
  detail: string;
  ts: string;
}

interface RefreshRow { pack_id: string; trigger: string; status: string; docs_added: number; docs_changed: number; ts: string; display_name: string }

interface NiaSource { display_name?: string; identifier?: string; status?: string; updated_at?: string }

export async function GET() {
  const packs = await listPacks();
  const out: Change[] = [];

  // recent refresh_runs (real Postgres)
  if (!inInsforgeDemoMode) {
    const r = await query<RefreshRow>(
      `select r.pack_id, r.trigger, r.status, r.docs_added, r.docs_changed, r.ts, p.display_name
         from refresh_runs r join packs p on p.pack_id = r.pack_id
         where r.ts > now() - interval '24 hours'
         order by r.ts desc limit 10`,
    );
    for (const row of r.rows) {
      const moved = row.docs_added + row.docs_changed;
      out.push({
        pack_id: row.pack_id,
        display_name: row.display_name,
        kind: 'refresh',
        detail: moved > 0
          ? `+${row.docs_added} new · ~${row.docs_changed} changed (Tensorlake ${row.trigger})`
          : `Tensorlake ${row.trigger} — sources steady`,
        ts: row.ts,
      });
    }
  }

  // recent Nia source activity (live)
  if (env.nia.apiKey) {
    try {
      const r = await fetch(`${env.nia.apiBase}/sources?limit=100`, {
        headers: { authorization: `Bearer ${env.nia.apiKey}` },
        cache: 'no-store',
      });
      if (r.ok) {
        const data = (await r.json()) as { items?: NiaSource[] };
        const cutoff = Date.now() - 1000 * 60 * 60 * 24;
        const recent = (data.items ?? [])
          .filter((s) => s.display_name && s.updated_at && Date.parse(s.updated_at) > cutoff)
          .sort((a, b) => Date.parse(b.updated_at!) - Date.parse(a.updated_at!))
          .slice(0, 12);
        for (const s of recent) {
          const pack = packs.find((p) => p.pack_id === s.display_name);
          if (!pack) continue;
          out.push({
            pack_id: pack.pack_id,
            display_name: pack.display_name,
            kind: s.status === 'completed' || s.status === 'indexed' ? 'newly_indexed' : 'updated',
            detail: `${s.identifier ?? '(source)'} · ${s.status ?? 'updated'}`,
            ts: s.updated_at!,
          });
        }
      }
    } catch { /* silent — diff feed is best-effort */ }
  }

  out.sort((a, b) => Date.parse(b.ts) - Date.parse(a.ts));
  return NextResponse.json({ changes: out.slice(0, 16) });
}

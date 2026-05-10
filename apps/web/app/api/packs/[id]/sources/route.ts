import { NextResponse } from 'next/server';
import { getPack } from '@/lib/insforge';
import { env, inNiaDemoMode } from '@/lib/env';

// Per-pack source health endpoint. Returns each source's identifier, status,
// and last-indexed timestamp by querying Nia's /v2/sources and filtering on
// display_name == pack_id. Used by the pack page's freshness badge.

export const dynamic = 'force-dynamic';

interface NiaSource {
  id: string;
  type: string;
  identifier?: string;
  display_name?: string;
  status?: string;
  updated_at?: string;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pack = await getPack(id);
  if (!pack) return NextResponse.json({ error: 'pack not found' }, { status: 404 });

  if (inNiaDemoMode) {
    const fakeSources = (pack.sources as unknown as Array<{ type: string; url: string }>) ?? [];
    return NextResponse.json({
      pack_id: id,
      sources: fakeSources.map((s) => ({
        type: s.type,
        identifier: s.url,
        status: 'completed',
        updated_at: new Date(Date.now() - 1000 * 60 * 14).toISOString(),
      })),
    });
  }

  try {
    const r = await fetch(`${env.nia.apiBase}/sources?limit=100`, {
      headers: { authorization: `Bearer ${env.nia.apiKey}` },
      cache: 'no-store',
    });
    if (!r.ok) {
      return NextResponse.json({ pack_id: id, sources: [], error: `Nia ${r.status}` });
    }
    const data = (await r.json()) as { items?: NiaSource[] };
    const sources = (data.items ?? [])
      .filter((s) => s.display_name === id)
      .map((s) => ({
        type: s.type,
        identifier: s.identifier ?? '',
        status: s.status ?? 'unknown',
        updated_at: s.updated_at ?? null,
      }));
    return NextResponse.json({ pack_id: id, sources });
  } catch (err) {
    return NextResponse.json({ pack_id: id, sources: [], error: (err as Error).message });
  }
}

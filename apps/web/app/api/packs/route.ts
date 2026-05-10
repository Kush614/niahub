import { NextResponse } from 'next/server';
import { listPacks, insertPack, getPack } from '@/lib/insforge';
import { createIndex, type NiaSource } from '@/lib/nia/client';

export const dynamic = 'force-dynamic';

export async function GET() {
  const packs = await listPacks();
  return NextResponse.json({ packs });
}

export async function POST(req: Request) {
  const body = (await req.json()) as {
    pack_id: string;
    display_name: string;
    description: string;
    tagline?: string;
    sources: NiaSource[];
    refresh_cadence?: 'hourly' | 'daily' | 'webhook';
    accent_color?: string;
    tags?: string[];
    visibility?: 'public' | 'private' | 'unlisted';
    curator_org?: string;
  };
  if (!body.pack_id || !body.display_name || !body.sources?.length) {
    return NextResponse.json({ error: 'pack_id, display_name, sources required' }, { status: 400 });
  }
  const existing = await getPack(body.pack_id);
  if (existing) return NextResponse.json({ error: 'pack_id taken' }, { status: 409 });

  const idx = await createIndex({ pack_id: body.pack_id, sources: body.sources });

  await insertPack({
    pack_id: body.pack_id,
    display_name: body.display_name,
    tagline: body.tagline ?? null,
    description: body.description,
    curator_user_id: 'usr_demo',
    curator_org: body.curator_org ?? 'Community',
    sources: body.sources as unknown,
    refresh_cadence: body.refresh_cadence ?? 'daily',
    nia_index_id: idx.index_id,
    current_version: 1,
    hallucination_score: null,
    baseline_score: null,
    install_count: 0,
    query_count_7d: 0,
    visibility: body.visibility ?? 'public',
    icon: null,
    accent_color: body.accent_color ?? '#1f9eff',
    tags: body.tags ?? [],
  });

  return NextResponse.json({ pack_id: body.pack_id, nia_index_id: idx.index_id }, { status: 201 });
}

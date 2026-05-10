import { NextResponse } from 'next/server';
import { listPacks } from '@/lib/insforge';
import { runRefreshNow } from '@/lib/tensorlake/indexer';
import type { NiaSource } from '@/lib/nia/client';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';

// Cron entrypoint hit by Tensorlake / Vercel cron. Walks every pack whose
// cadence is due and triggers a refresh. Public so external schedulers can
// poke it; protected by NIAHUB_GATEWAY_SIGNING_SECRET in the auth header.
export async function POST(req: Request) {
  const auth = req.headers.get('authorization') ?? '';
  if (auth !== `Bearer ${env.app.signingSecret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    pack_id?: string;
    cadence?: 'hourly' | 'daily';
  };
  const packs = await listPacks();
  const targets = packs.filter((p) => {
    if (body.pack_id) return p.pack_id === body.pack_id;
    if (body.cadence) return p.refresh_cadence === body.cadence;
    return true;
  });

  const results = await Promise.all(
    targets.map((p) =>
      runRefreshNow({
        pack_id: p.pack_id,
        nia_index_id: p.nia_index_id,
        sources: p.sources as unknown as NiaSource[],
        trigger: 'schedule',
      }),
    ),
  );
  return NextResponse.json({ runs: results });
}

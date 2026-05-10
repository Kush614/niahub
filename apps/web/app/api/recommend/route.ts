import { NextResponse } from 'next/server';
import { listPacks, getCurrentUser, createSubscription, bumpInstallCount } from '@/lib/insforge';
import { oracleRecommend } from '@/lib/nia/client';
import { buildInstallSnippet } from '@/lib/install-snippet';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const body = (await req.json()) as { user_intent: string; auto_install?: boolean };
  if (!body.user_intent || body.user_intent.trim().length < 4) {
    return NextResponse.json({ error: 'user_intent required' }, { status: 400 });
  }
  const packs = await listPacks();
  const picks = await oracleRecommend({
    user_intent: body.user_intent,
    candidate_pack_ids: packs.map((p) => p.pack_id),
    k: 3,
  });

  const user = (await getCurrentUser()) ?? { id: 'usr_demo' };
  const subs: Array<{ pack_id: string; token: string }> = [];
  for (const rec of picks) {
    const sub = await createSubscription({ user_id: user.id, pack_id: rec.pack_id });
    if (body.auto_install) await bumpInstallCount(rec.pack_id);
    subs.push({ pack_id: sub.pack_id, token: sub.token });
  }
  const [first, ...rest] = subs;
  const combined_snippet = first
    ? buildInstallSnippet({ pack_id: first.pack_id, token: first.token, extra: rest })
    : '';
  const tokens = Object.fromEntries(subs.map((s) => [s.pack_id, s.token]));
  return NextResponse.json({ picks, combined_snippet, tokens });
}

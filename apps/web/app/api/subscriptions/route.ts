import { NextResponse } from 'next/server';
import { getCurrentUser, getPack, createSubscription, bumpInstallCount } from '@/lib/insforge';
import { buildInstallSnippet } from '@/lib/install-snippet';
import { pushFeedEvent } from '@/lib/convex/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const body = (await req.json()) as {
    pack_ids: string[];
    agent_kind?: 'cursor' | 'claude_code' | 'codex';
  };
  if (!body.pack_ids?.length) {
    return NextResponse.json({ error: 'pack_ids required' }, { status: 400 });
  }
  const user = (await getCurrentUser()) ?? { id: 'usr_demo' };

  const subs: Array<{ pack_id: string; token: string }> = [];
  for (const pid of body.pack_ids) {
    const pack = await getPack(pid);
    if (!pack) return NextResponse.json({ error: `unknown pack ${pid}` }, { status: 404 });
    const sub = await createSubscription({
      user_id: user.id,
      pack_id: pid,
      agent_kind: body.agent_kind,
    });
    await bumpInstallCount(pid);
    const actor = !user.id ? '@guest' : user.id === 'usr_demo' ? '@demo' : `@${user.id.slice(0, 8)}`;
    void pushFeedEvent({
      kind: 'install',
      pack_id: pid,
      actor,
      agent_kind: body.agent_kind,
    });
    subs.push({ pack_id: sub.pack_id, token: sub.token });
  }
  const [first, ...rest] = subs;
  if (!first) return NextResponse.json({ error: 'no subs created' }, { status: 500 });
  const snippet = buildInstallSnippet({
    pack_id: first.pack_id,
    token: first.token,
    agent_kind: body.agent_kind,
    extra: rest,
  });
  const tokens = Object.fromEntries(subs.map((s) => [s.pack_id, s.token]));
  return NextResponse.json({ snippet, tokens });
}

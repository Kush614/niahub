import { NextResponse } from 'next/server';
import { createCompanyPack, listWorkspaces } from '@/lib/hyperspell';
import { getCurrentUser, insertPack } from '@/lib/insforge';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = (await getCurrentUser()) ?? { id: 'usr_demo' };
  const workspaces = await listWorkspaces(user.id);
  return NextResponse.json({ workspaces });
}

export async function POST(req: Request) {
  const user = (await getCurrentUser()) ?? { id: 'usr_demo' };
  const body = (await req.json()) as { workspace_id: string; pack_name: string };
  if (!body.workspace_id || !body.pack_name) {
    return NextResponse.json({ error: 'workspace_id and pack_name required' }, { status: 400 });
  }
  const result = await createCompanyPack({
    user_id: user.id,
    workspace_id: body.workspace_id,
    pack_name: body.pack_name,
  });
  await insertPack({
    pack_id: result.pack_id,
    display_name: body.pack_name,
    tagline: 'Private company brain — Slack + Gmail + Drive + GitHub via Hyperspell.',
    description:
      `A private pack indexed from your Hyperspell workspace "${result.workspace.display_name}". ` +
      `Connected sources: ${result.workspace.connected_sources.join(', ')}. ` +
      `${result.workspace.doc_count.toLocaleString()} documents. Only your subscriptions can read this pack.`,
    curator_user_id: user.id,
    curator_org: 'You (Hyperspell)',
    sources: result.workspace.connected_sources.map((kind) => ({ type: 'hyperspell', url: `hyperspell://${kind}` })),
    refresh_cadence: 'daily',
    nia_index_id: result.nia_index_id,
    current_version: 1,
    hallucination_score: null,
    baseline_score: null,
    install_count: 1,
    query_count_7d: 0,
    visibility: 'private',
    icon: null,
    accent_color: '#a855f7',
    tags: ['private', 'company', 'hyperspell'],
  });
  return NextResponse.json(result, { status: 201 });
}

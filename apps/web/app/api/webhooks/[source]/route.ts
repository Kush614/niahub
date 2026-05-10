import { NextResponse } from 'next/server';
import { listPacks } from '@/lib/insforge';
import { handleGithubPush, type GithubPushHook } from '@/lib/tensorlake/indexer';
import type { NiaSource } from '@/lib/nia/client';

export const dynamic = 'force-dynamic';

// Source-specific webhook landings. Today: github only. Stripe & vercel are
// next — same shape: parse → packLookup → Tensorlake refresh.
export async function POST(
  req: Request,
  { params }: { params: Promise<{ source: string }> },
) {
  const { source } = await params;
  if (source !== 'github') {
    return NextResponse.json({ error: `unsupported source: ${source}` }, { status: 400 });
  }
  const hook = (await req.json()) as GithubPushHook;
  const packs = await listPacks();
  const result = await handleGithubPush(hook, (repo) => {
    const pack = packs.find((p) => {
      const sources = (p.sources as unknown as Array<{ type: string; url: string }>) ?? [];
      return sources.some((s) => s.type.startsWith('github') && s.url.includes(repo));
    });
    if (!pack) return null;
    return {
      pack_id: pack.pack_id,
      nia_index_id: pack.nia_index_id,
      sources: pack.sources as unknown as NiaSource[],
      trigger: 'webhook',
    };
  });
  if (!result) return NextResponse.json({ skipped: true, reason: 'no pack tracks this repo' });
  return NextResponse.json(result);
}

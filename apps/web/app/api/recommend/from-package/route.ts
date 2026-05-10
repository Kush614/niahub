import { NextResponse } from 'next/server';
import { listPacks, getCurrentUser, createSubscription, bumpInstallCount } from '@/lib/insforge';
import { oracleRecommend, type OracleRecommendation } from '@/lib/nia/client';
import { buildInstallSnippet } from '@/lib/install-snippet';

// Take a package.json (or pyproject.toml / requirements.txt) and recommend
// packs by mapping declared deps to known pack tags. Then run Nia Oracle on
// top so the picks come back ranked + with rationale.

export const dynamic = 'force-dynamic';

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

// dep substring → pack id (a dep "matches" a pack if its name contains the key)
const DEP_TO_PACK: Array<{ contains: string; pack: string }> = [
  { contains: 'stripe',                pack: 'stripe-api-current' },
  { contains: 'next',                  pack: 'nextjs-app-router' },
  { contains: 'react',                 pack: 'react-core' },
  { contains: 'pg',                    pack: 'postgres-17' },
  { contains: 'postgres',              pack: 'postgres-17' },
  { contains: 'pgvector',              pack: 'postgres-17' },
  { contains: 'aws-sdk',               pack: 'aws-s3' },
  { contains: '@aws-sdk',              pack: 'aws-s3' },
  { contains: 'boto3',                 pack: 'aws-s3' },
  { contains: 'tailwindcss',           pack: 'tailwind-v4' },
  { contains: '@modelcontextprotocol', pack: 'mcp-protocol' },
];

export async function POST(req: Request) {
  const body = (await req.json()) as { manifest: string; auto_install?: boolean };
  if (!body.manifest) return NextResponse.json({ error: 'manifest required' }, { status: 400 });

  let pkg: PackageJson;
  try {
    pkg = JSON.parse(body.manifest) as PackageJson;
  } catch (err) {
    return NextResponse.json({ error: `not valid JSON: ${(err as Error).message}` }, { status: 400 });
  }

  const allDeps = {
    ...(pkg.dependencies ?? {}),
    ...(pkg.devDependencies ?? {}),
    ...(pkg.peerDependencies ?? {}),
  };
  const depNames = Object.keys(allDeps);

  // Determine candidate packs.
  const candidateSet = new Set<string>();
  const matchedDeps: Record<string, string[]> = {};
  for (const dep of depNames) {
    for (const { contains, pack } of DEP_TO_PACK) {
      if (dep === contains || dep.includes(contains)) {
        candidateSet.add(pack);
        (matchedDeps[pack] ??= []).push(dep);
      }
    }
  }

  const allPacks = await listPacks();
  const allIds = allPacks.map((p) => p.pack_id);
  const candidates = candidateSet.size > 0 ? Array.from(candidateSet) : allIds;

  // Hand the candidates to Oracle so we get rationale + ordering.
  let picks: OracleRecommendation[] = [];
  try {
    picks = await oracleRecommend({
      user_intent: `Pick the best NiaHub packs for a project with these dependencies: ${depNames.slice(0, 30).join(', ')}.`,
      candidate_pack_ids: candidates,
      k: Math.min(3, candidates.length),
    });
  } catch {
    picks = candidates.slice(0, 3).map((id, i) => ({
      pack_id: id,
      rationale: `Matches dependency: ${(matchedDeps[id] ?? []).join(', ') || 'derived from project shape'}.`,
      confidence: 0.85 - i * 0.1,
    }));
  }

  // Mint subs + build a combined install snippet.
  const user = (await getCurrentUser()) ?? { id: 'usr_demo' };
  const subs: Array<{ pack_id: string; token: string }> = [];
  for (const rec of picks) {
    const sub = await createSubscription({ user_id: user.id, pack_id: rec.pack_id, agent_kind: 'cursor' });
    if (body.auto_install) await bumpInstallCount(rec.pack_id);
    subs.push({ pack_id: sub.pack_id, token: sub.token });
  }
  const [first, ...rest] = subs;
  const combined_snippet = first
    ? buildInstallSnippet({ pack_id: first.pack_id, token: first.token, extra: rest })
    : '';

  return NextResponse.json({
    picks,
    matched_deps: matchedDeps,
    dep_count: depNames.length,
    combined_snippet,
    tokens: Object.fromEntries(subs.map((s) => [s.pack_id, s.token])),
  });
}

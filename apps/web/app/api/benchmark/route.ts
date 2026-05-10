import { NextResponse } from 'next/server';
import { getPack } from '@/lib/insforge';
import { runBenchmark } from '@/lib/codex/auditor';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';

// Nightly Codex auditor. Hit by Tensorlake on a schedule with the pack id and
// a list of expected-topic questions. Returns the benchmark result so the
// pack page can display the up-to-date hallucination score.
export async function POST(req: Request) {
  const auth = req.headers.get('authorization') ?? '';
  if (auth !== `Bearer ${env.app.signingSecret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const body = (await req.json()) as {
    pack_id: string;
    questions: Array<{ question: string; expected_topic: string }>;
  };
  const pack = await getPack(body.pack_id);
  if (!pack) return NextResponse.json({ error: 'pack not found' }, { status: 404 });
  const result = await runBenchmark({
    pack_id: pack.pack_id,
    nia_index_id: pack.nia_index_id,
    questions: body.questions,
  });
  return NextResponse.json(result);
}

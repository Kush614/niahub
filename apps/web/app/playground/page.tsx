import { listPacks } from '@/lib/insforge';
import { Playground } from '@/components/Playground';

export const dynamic = 'force-dynamic';

export default async function PlaygroundPage() {
  const packs = await listPacks();
  return (
    <section className="pt-12">
      <div className="max-w-3xl">
        <h1 className="text-3xl font-semibold tracking-tight">Playground</h1>
        <p className="mt-2 text-white/70">
          Talk to any NiaHub pack right here — no Cursor setup, no token paste, no agent install.
          Pick a pack, type a question, and watch real Nia chunks plus the Codex trace come back.
        </p>
      </div>
      <div className="mt-6 max-w-4xl">
        <Playground packs={packs} />
      </div>
    </section>
  );
}

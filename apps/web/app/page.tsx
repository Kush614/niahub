import { listPacks } from '@/lib/insforge';
import { Hero } from '@/components/Hero';
import { PackGrid } from '@/components/PackGrid';
import { RecentChanges } from '@/components/RecentChanges';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const packs = await listPacks();

  return (
    <>
      <Hero />

      <section id="packs" className="mt-16">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">All packs</h2>
            <p className="text-sm text-white/55">
              Pre-indexed, continuously synced. Click any pack to install.
            </p>
          </div>
          <div className="text-xs text-white/45">
            {packs.length} packs · {packs.reduce((s, p) => s + p.install_count, 0).toLocaleString()} installs
          </div>
        </div>

        <div className="mt-5">
          <PackGrid packs={packs} />
        </div>
      </section>

      <RecentChanges />

      <section className="mt-20 grid gap-4 rounded-3xl border border-white/8 bg-[var(--color-bg-1)] p-6 sm:grid-cols-3">
        <Stat n="< 5s"   label="land → cited answer in /playground (no Cursor setup)" />
        <Stat n="< 60s"  label="land → working answer in Cursor (paste snippet, restart, ask)" />
        <Stat n="hourly" label="refresh on every pack — Tensorlake keeps indexes current" />
      </section>
    </>
  );
}

function Stat({ n, label }: { n: string; label: string }) {
  return (
    <div>
      <div className="text-3xl font-semibold tracking-tight text-white">{n}</div>
      <div className="mt-1 text-sm text-white/65">{label}</div>
    </div>
  );
}

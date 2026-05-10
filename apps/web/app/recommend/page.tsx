import { listPacks } from '@/lib/insforge';
import { OracleSearch } from '@/components/OracleSearch';

export const dynamic = 'force-dynamic';

export default async function RecommendPage() {
  const packs = await listPacks();
  return (
    <section className="pt-12">
      <div className="max-w-3xl">
        <h1 className="text-3xl font-semibold tracking-tight">Recommend packs for me</h1>
        <p className="mt-2 text-white/70">
          Tell Nia Oracle what you're building. It picks the best 3 packs from the
          marketplace and gives you a single combined install snippet.
        </p>
      </div>
      <div className="mt-6 max-w-3xl">
        <OracleSearch packs={packs} />
      </div>
    </section>
  );
}

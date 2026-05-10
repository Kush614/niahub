import { MeDashboard } from '@/components/MeDashboard';

export const dynamic = 'force-dynamic';

export default function MePage() {
  return (
    <section className="pt-12">
      <div className="max-w-3xl">
        <h1 className="text-3xl font-semibold tracking-tight">Your packs</h1>
        <p className="mt-2 text-white/70">
          Live view of every NiaHub pack you've installed plus the queries each one has served — straight from the
          query_events table in your InsForge Postgres.
        </p>
      </div>
      <div className="mt-6 max-w-5xl">
        <MeDashboard />
      </div>
    </section>
  );
}

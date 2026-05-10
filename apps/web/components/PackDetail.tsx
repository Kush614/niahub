import type { PackRow } from '@/lib/insforge';
import { HallucinationScore } from '@/components/HallucinationScore';
import { InstallSnippet } from '@/components/InstallSnippet';
import { SourceFreshness } from '@/components/SourceFreshness';
import { TryIt } from '@/components/TryIt';
import { promptsFor } from '@/lib/demo-prompts';

export function PackDetail({ pack, sources }: { pack: PackRow; sources: Source[] }) {
  return (
    <article className="grid grid-cols-1 gap-8 pt-10 lg:grid-cols-[1fr_360px]">
      <div className="space-y-8">
        <header>
          <div className="flex items-center gap-2 text-xs text-white/55">
            <span className="rounded-md bg-white/5 px-2 py-0.5">{pack.curator_org ?? 'Community'}</span>
            <span>·</span>
            <span>refresh: {pack.refresh_cadence}</span>
            <span>·</span>
            <span>v{pack.current_version}</span>
          </div>
          <h1 className="mt-3 flex items-center gap-3 text-3xl font-semibold tracking-tight">
            <span
              aria-hidden
              className="inline-block h-3 w-3 rounded-full"
              style={{ background: pack.accent_color ?? '#1f9eff' }}
            />
            {pack.display_name}
          </h1>
          <p className="mt-2 max-w-2xl text-white/70">{pack.tagline}</p>
        </header>

        <section className="rounded-2xl border border-white/8 bg-[var(--color-bg-1)] p-5 leading-relaxed text-white/80">
          {pack.description}
        </section>

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-white/55">Try it</h2>
          <div className="mt-3">
            <TryIt packId={pack.pack_id} prompts={promptsFor(pack.pack_id)} />
          </div>
        </section>

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-white/55">Sources indexed</h2>
          <ul className="mt-3 divide-y divide-white/5 rounded-2xl border border-white/8 bg-[var(--color-bg-1)]">
            {sources.map((s, i) => (
              <li key={i} className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] uppercase text-white/65">
                      {s.type}
                    </span>
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener"
                      className="truncate text-white hover:underline"
                    >
                      {s.url}
                    </a>
                  </div>
                  {s.note && <div className="text-[11px] text-white/45">{s.note}</div>}
                </div>
                <span className="text-[11px] text-white/45">indexed</span>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-white/55">Recent queries</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {RECENT_QUERIES_FOR_DEMO.map((q, i) => (
              <li key={i} className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-white/75">
                <span className="text-white/45">{q.actor}</span> — {q.text}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
        <HallucinationScore
          score={pack.hallucination_score ?? null}
          baseline={pack.baseline_score ?? null}
        />
        <SourceFreshness pack_id={pack.pack_id} />
        <InstallSnippet initialPackIds={[pack.pack_id]} />
        <div className="rounded-2xl border border-white/8 bg-[var(--color-bg-1)] p-4 text-sm text-white/65">
          <div className="text-[11px] uppercase tracking-wide text-white/45">Pack stats</div>
          <dl className="mt-2 space-y-1.5">
            <Row k="Installs" v={pack.install_count.toLocaleString()} />
            <Row k="Queries · 7d" v={pack.query_count_7d.toLocaleString()} />
            <Row k="Refresh" v={pack.refresh_cadence} />
            <Row k="Index" v={pack.nia_index_id} mono />
          </dl>
        </div>
      </aside>
    </article>
  );
}

interface Source { type: string; url: string; note?: string }

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex justify-between">
      <dt className="text-white/55">{k}</dt>
      <dd className={mono ? 'code text-white/85' : 'text-white/85'}>{v}</dd>
    </div>
  );
}

const RECENT_QUERIES_FOR_DEMO = [
  { actor: '@alice', text: '"How do I create a Stripe checkout session for a subscription with a 14-day trial?"' },
  { actor: '@bryn',  text: '"Verify a Stripe webhook signature using the latest Node SDK."' },
  { actor: '@carlos', text: '"Charge a SetupIntent later when the user upgrades."' },
];

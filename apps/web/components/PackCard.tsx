import Link from 'next/link';
import type { PackRow } from '@/lib/insforge';
import { HallucinationScore } from '@/components/HallucinationScore';

export function PackCard({ pack }: { pack: PackRow }) {
  return (
    <Link
      href={`/packs/${pack.pack_id}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/8 bg-[var(--color-bg-1)] p-5 transition hover:border-white/20 hover:bg-[var(--color-bg-2)]"
    >
      <span
        aria-hidden
        className="absolute -right-12 -top-12 h-32 w-32 rounded-full opacity-25 blur-3xl transition group-hover:opacity-50"
        style={{ background: pack.accent_color ?? '#1f9eff' }}
      />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ background: pack.accent_color ?? '#1f9eff' }}
            />
            <h3 className="truncate text-base font-semibold text-white">{pack.display_name}</h3>
          </div>
          <p className="mt-1 line-clamp-2 text-sm text-white/65">{pack.tagline}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {(pack.tags ?? []).slice(0, 4).map((t) => (
          <span key={t} className="rounded-md bg-white/5 px-2 py-0.5 text-[11px] text-white/65">
            {t}
          </span>
        ))}
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-white/5 pt-3 text-xs text-white/55">
        <span>{pack.install_count.toLocaleString()} installs · {pack.refresh_cadence}</span>
        <HallucinationScore
          score={pack.hallucination_score ?? null}
          baseline={pack.baseline_score ?? null}
          compact
        />
      </div>
    </Link>
  );
}

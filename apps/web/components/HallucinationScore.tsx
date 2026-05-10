interface Props {
  score: number | null;          // 0..1, lower is better (with-pack hallucination rate)
  baseline: number | null;        // 0..1, baseline (no pack) hallucination rate
  compact?: boolean;
}

export function HallucinationScore({ score, baseline, compact }: Props) {
  if (score == null) return <span className="text-white/40">no benchmark yet</span>;
  const delta = baseline != null ? baseline - score : null;
  const tone = score < 0.06 ? 'good' : score < 0.12 ? 'warn' : 'bad';
  const toneColor = tone === 'good' ? 'var(--color-good)' : tone === 'warn' ? 'var(--color-warn)' : 'var(--color-bad)';

  if (compact) {
    return (
      <span className="flex items-center gap-1.5">
        <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: toneColor }} />
        <span style={{ color: toneColor }}>{(score * 100).toFixed(1)}%</span>
        {delta != null && delta > 0 && (
          <span className="text-white/45">↓ {(delta * 100).toFixed(0)}pp</span>
        )}
      </span>
    );
  }

  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
      <div className="text-[11px] uppercase tracking-wide text-white/55">Hallucination rate</div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-3xl font-semibold" style={{ color: toneColor }}>
          {(score * 100).toFixed(1)}%
        </span>
        <span className="text-sm text-white/50">with this pack installed</span>
      </div>
      {baseline != null && (
        <div className="mt-2 text-sm text-white/65">
          Baseline (no pack):{' '}
          <span className="text-white/85">{(baseline * 100).toFixed(1)}%</span>
          {delta != null && delta > 0 && (
            <span className="ml-2 rounded-md bg-white/5 px-1.5 py-0.5 text-[11px] text-white/70">
              −{(delta * 100).toFixed(0)} percentage points
            </span>
          )}
        </div>
      )}
      <Bar score={score} baseline={baseline} toneColor={toneColor} />
      <p className="mt-3 text-[11px] text-white/45">
        Audited nightly by Codex over 50 hard questions per pack. Lower is better.
      </p>
    </div>
  );
}

function Bar({ score, baseline, toneColor }: { score: number; baseline: number | null; toneColor: string }) {
  return (
    <div className="mt-4 space-y-2">
      <Row label="With pack" value={score} color={toneColor} />
      {baseline != null && <Row label="Baseline" value={baseline} color="rgba(255,255,255,0.35)" />}
    </div>
  );
}

function Row({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between text-[11px] text-white/55">
        <span>{label}</span>
        <span>{(value * 100).toFixed(1)}%</span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
        <div className="h-full rounded-full" style={{ width: `${Math.max(2, value * 100)}%`, background: color }} />
      </div>
    </div>
  );
}

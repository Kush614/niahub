'use client';

import { useMemo, useState } from 'react';
import type { PackRow } from '@/lib/insforge';
import { promptsFor } from '@/lib/demo-prompts';

// Standalone chat UI for the marketplace. Pick a pack, ask a question, see
// real chunks + Codex trace + side-by-side comparison. Same backend as the
// pack-page TryIt component (/api/playground).

interface AnswerDiff {
  improvements: string[];
  avoided: string[];
  verdict: string;
}

interface Turn {
  id: string;
  query: string;
  pack_id: string;
  pending: boolean;
  answer?: string;
  baseline?: string | null;
  diff?: AnswerDiff | null;
  citations?: string[];
  why?: string;
  latency_ms?: number;
  chunks_used?: number;
  error?: string;
  compare?: boolean;
}

export function Playground({ packs }: { packs: PackRow[] }) {
  const [packId, setPackId] = useState<string>(packs[0]?.pack_id ?? '');
  const [query, setQuery] = useState('');
  const [compare, setCompare] = useState(true);
  const [turns, setTurns] = useState<Turn[]>([]);

  const activePack = useMemo(
    () => packs.find((p) => p.pack_id === packId) ?? packs[0],
    [packs, packId],
  );
  const suggestions = useMemo(() => (activePack ? promptsFor(activePack.pack_id) : []), [activePack]);

  async function ask(q: string) {
    if (!q.trim() || !activePack) return;
    const turnId = `t_${Math.random().toString(36).slice(2, 10)}`;
    const turn: Turn = { id: turnId, query: q, pack_id: activePack.pack_id, pending: true, compare };
    setTurns((prev) => [turn, ...prev]);
    setQuery('');
    try {
      const r = await fetch('/api/playground', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ pack_id: activePack.pack_id, query: q, compare, k: 5 }),
      });
      if (!r.ok) throw new Error(await r.text());
      const data = (await r.json()) as Omit<Turn, 'id' | 'query' | 'pack_id' | 'pending'>;
      setTurns((prev) => prev.map((t) => (t.id === turnId ? { ...t, ...data, pending: false } : t)));
    } catch (e) {
      setTurns((prev) =>
        prev.map((t) => (t.id === turnId ? { ...t, pending: false, error: (e as Error).message } : t)),
      );
    }
  }

  return (
    <div className="space-y-5">
      {/* Pack picker */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {packs.map((p) => (
          <button
            key={p.pack_id}
            onClick={() => setPackId(p.pack_id)}
            className={`rounded-xl border px-3 py-2 text-left text-xs ${
              p.pack_id === packId
                ? 'border-white/25 bg-white/8 text-white'
                : 'border-white/10 bg-white/[0.02] text-white/65 hover:border-white/20 hover:bg-white/5 hover:text-white'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: p.accent_color ?? '#1f9eff' }} />
              <span className="truncate">{p.display_name}</span>
            </span>
          </button>
        ))}
      </div>

      {/* Compose box */}
      <div className="rounded-2xl border border-white/8 bg-[var(--color-bg-1)] p-4">
        <div className="flex items-center justify-between text-[11px]">
          <div className="text-white/55">
            asking{' '}
            <span className="rounded bg-white/5 px-1.5 py-0.5 text-white/85">
              {activePack?.display_name ?? '—'}
            </span>
          </div>
          <label className="flex items-center gap-2 text-white/55">
            <input
              type="checkbox"
              checked={compare}
              onChange={(e) => setCompare(e.target.checked)}
              className="h-3 w-3 accent-[#a855f7]"
            />
            side-by-side (with vs without pack)
          </label>
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); void ask(query); }}
          className="mt-3 flex items-center gap-2"
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask a question…"
            className="flex-1 rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-white/30 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!query.trim() || !activePack}
            className="rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            style={{ background: '#1f9eff' }}
          >
            Ask
          </button>
        </form>

        {suggestions.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
            <span className="text-white/45 mr-1">Try:</span>
            {suggestions.map((p) => (
              <button
                key={p.label}
                onClick={() => void ask(p.query)}
                className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-white/75 hover:bg-white/10 hover:text-white"
              >
                {p.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Conversation */}
      <ul className="space-y-4">
        {turns.length === 0 && (
          <li className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-white/45">
            Pick a pack above, click a "Try" pill, and the answer will land here in ~2 seconds.
          </li>
        )}
        {turns.map((t) => (
          <li key={t.id} className="rounded-2xl border border-white/8 bg-[var(--color-bg-1)]">
            <div className="flex items-center justify-between border-b border-white/5 px-4 py-2.5">
              <div className="flex items-center gap-2 text-[12.5px] text-white/85">
                <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] uppercase text-white/65">{t.pack_id}</span>
                <span className="truncate">{t.query}</span>
              </div>
              {!t.pending && (
                <span className="text-[11px] text-white/45">
                  {t.chunks_used ?? 0} chunks · {t.latency_ms ?? 0} ms
                </span>
              )}
            </div>

            {t.pending && (
              <div className="px-4 py-5 text-sm text-white/55">
                <span className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-nia-400" style={{ background: '#4fbcff' }} />
                  Querying real Nia → real Codex trace…
                </span>
              </div>
            )}

            {t.error && <div className="px-4 py-4 text-sm text-red-300/80">{t.error}</div>}

            {!t.pending && !t.error && (
              <>
                {t.compare && t.baseline ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 divide-x divide-white/5">
                    <Column label="without NiaHub" tone="bad" body={t.baseline} footer="raw gpt-5-mini · no grounding" />
                    <Column label="with NiaHub" tone="good" body={t.answer ?? ''} citations={t.citations} footer="real Nia chunks" />
                  </div>
                ) : (
                  <div className="px-4 py-4">
                    <Column body={t.answer ?? ''} citations={t.citations} />
                  </div>
                )}
                {t.compare && t.diff && <DiffSummary diff={t.diff} />}
                {t.why && (
                  <div className="border-t border-white/5 px-4 py-3 text-[11px] text-white/55">
                    <span className="text-white/35">why:</span> {t.why}
                  </div>
                )}
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Column({
  label, tone, body, citations, footer,
}: { label?: string; tone?: 'good' | 'bad'; body: string; citations?: string[]; footer?: string }) {
  const labelColor = tone === 'bad' ? 'text-red-300' : tone === 'good' ? 'text-emerald-300' : 'text-white/65';
  return (
    <div className="px-4 py-4">
      {label && (
        <div className={`mb-2 flex items-center gap-1.5 text-[11px] uppercase tracking-wide ${labelColor}`}>
          <span className={`inline-block h-1.5 w-1.5 rounded-full ${tone === 'bad' ? 'bg-red-400' : 'bg-emerald-400'}`} />
          {label}
        </div>
      )}
      <div className="code overflow-auto whitespace-pre-wrap text-[12.5px] leading-relaxed text-white/85 max-h-[420px]">
        {body}
      </div>
      {citations && citations.length > 0 && (
        <div className="mt-3 space-y-1">
          <div className="text-[11px] uppercase tracking-wide text-white/45">Citations</div>
          {citations.slice(0, 4).map((u, i) => (
            <a key={i} href={u} target="_blank" rel="noopener" className="block truncate text-[12.5px] hover:underline" style={{ color: '#88d4ff' }}>
              {u}
            </a>
          ))}
        </div>
      )}
      {footer && <div className="mt-2 text-[11px] text-white/40">{footer}</div>}
    </div>
  );
}

function DiffSummary({ diff }: { diff: AnswerDiff }) {
  const empty = diff.improvements.length === 0 && diff.avoided.length === 0;
  if (empty && !diff.verdict) return null;
  return (
    <div className="border-t border-white/5 bg-gradient-to-br from-emerald-500/[0.04] to-fuchsia-500/[0.04] px-4 py-4">
      <div className="flex items-center gap-2">
        <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: 'linear-gradient(90deg,#34d399,#a855f7)' }} />
        <span className="text-[11px] uppercase tracking-wide text-white/65">What NiaHub improved</span>
      </div>
      {diff.verdict && <p className="mt-2 text-sm text-white/85">{diff.verdict}</p>}
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {diff.improvements.length > 0 && (
          <div>
            <div className="text-[11px] uppercase tracking-wide text-emerald-300/85">Added by grounding</div>
            <ul className="mt-1.5 space-y-1">
              {diff.improvements.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-[12.5px] text-white/85">
                  <span className="mt-1.5 inline-block h-1 w-1 flex-none rounded-full bg-emerald-400" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {diff.avoided.length > 0 && (
          <div>
            <div className="text-[11px] uppercase tracking-wide text-red-300/85">Hallucinations avoided</div>
            <ul className="mt-1.5 space-y-1">
              {diff.avoided.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-[12.5px] text-white/85">
                  <span className="mt-1.5 inline-block h-1 w-1 flex-none rounded-full bg-red-400" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

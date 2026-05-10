'use client';

import { useState } from 'react';
import type { DemoPrompt } from '@/lib/demo-prompts';

// Inline mini-chat on the pack page. Pre-populated with this pack's canonical
// demo prompts; click → real answer streams in (well, returns) below. Doubles
// as the "Side-by-side: with vs without NiaHub" toggle.

interface PlaygroundResp {
  answer: string;
  citations: string[];
  why: string;
  baseline: string | null;
  latency_ms: number;
  chunks_used: number;
}

export function TryIt({ packId, prompts }: { packId: string; prompts: DemoPrompt[] }) {
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [resp, setResp] = useState<PlaygroundResp | null>(null);
  const [compare, setCompare] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ask(q: string) {
    setBusy(true); setError(null); setResp(null);
    setQuery(q);
    try {
      const r = await fetch('/api/playground', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ pack_id: packId, query: q, compare, k: 5 }),
      });
      if (!r.ok) throw new Error(await r.text());
      setResp((await r.json()) as PlaygroundResp);
    } catch (e) {
      setError((e as Error).message);
    } finally { setBusy(false); }
  }

  return (
    <div className="rounded-2xl border border-white/8 bg-[var(--color-bg-1)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 px-4 py-2.5">
        <div className="text-sm font-medium text-white">Try this pack right here</div>
        <label className="flex items-center gap-2 text-[11px] text-white/65 cursor-pointer">
          <input
            type="checkbox"
            checked={compare}
            onChange={(e) => setCompare(e.target.checked)}
            className="h-3 w-3 accent-[#a855f7]"
          />
          show side-by-side (with vs without pack)
        </label>
      </div>

      {prompts.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-b border-white/5 px-4 py-3">
          <span className="text-[11px] text-white/45 mr-1">Suggested:</span>
          {prompts.map((p) => (
            <button
              key={p.label}
              onClick={() => void ask(p.query)}
              disabled={busy}
              className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] text-white/75 hover:bg-white/10 hover:text-white disabled:opacity-50"
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => { e.preventDefault(); if (query.trim()) void ask(query); }}
        className="flex items-center gap-2 px-4 py-3"
      >
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ask anything this pack would know…"
          className="flex-1 rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-white/30 focus:outline-none"
        />
        <button
          type="submit"
          disabled={busy || !query.trim()}
          className="rounded-md px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          style={{ background: '#1f9eff' }}
        >
          {busy ? '…' : 'Ask'}
        </button>
      </form>

      {error && (
        <div className="border-t border-white/5 px-4 py-3 text-sm text-red-300/80">{error}</div>
      )}

      {resp && (
        <div className="border-t border-white/5">
          {compare && resp.baseline ? (
            <div className="grid grid-cols-1 md:grid-cols-2 divide-x divide-white/5">
              <Column
                label="without NiaHub"
                tone="bad"
                body={resp.baseline}
                footer="raw gpt-5-mini · no grounding"
              />
              <Column
                label="with NiaHub"
                tone="good"
                body={resp.answer}
                citations={resp.citations}
                footer={`${resp.chunks_used} chunks · ${resp.latency_ms} ms`}
              />
            </div>
          ) : (
            <div className="px-4 py-4">
              <Column body={resp.answer} citations={resp.citations} footer={`${resp.chunks_used} chunks · ${resp.latency_ms} ms`} />
            </div>
          )}
          <div className="border-t border-white/5 px-4 py-3 text-[11px] text-white/55">
            <span className="text-white/35">why:</span> {resp.why}
          </div>
        </div>
      )}
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
            <a key={i} href={u} target="_blank" rel="noopener" className="block truncate text-[12.5px] text-nia-300 hover:underline" style={{ color: '#88d4ff' }}>
              {u}
            </a>
          ))}
        </div>
      )}
      {footer && <div className="mt-2 text-[11px] text-white/40">{footer}</div>}
    </div>
  );
}

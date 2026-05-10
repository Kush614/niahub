'use client';

import { useState } from 'react';
import type { OracleRecommendation } from '@/lib/nia/client';
import type { PackRow } from '@/lib/insforge';

interface Props {
  packs: PackRow[];
}

interface OracleResp {
  picks: OracleRecommendation[];
  combined_snippet: string;
  tokens: Record<string, string>;
  matched_deps?: Record<string, string[]>;
  dep_count?: number;
}

type Mode = 'intent' | 'package';

export function OracleSearch({ packs }: Props) {
  const [mode, setMode] = useState<Mode>('intent');
  const [q, setQ] = useState('');
  const [pkg, setPkg] = useState('');
  const [busy, setBusy] = useState(false);
  const [resp, setResp] = useState<OracleResp | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function ask(intent: string) {
    setBusy(true);
    setError(null);
    setResp(null);
    try {
      const res = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ user_intent: intent }),
      });
      if (!res.ok) throw new Error(await res.text());
      setResp((await res.json()) as OracleResp);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function fromPackage(manifest: string) {
    setBusy(true);
    setError(null);
    setResp(null);
    try {
      const res = await fetch('/api/recommend/from-package', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ manifest }),
      });
      if (!res.ok) throw new Error(await res.text());
      setResp((await res.json()) as OracleResp);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setPkg(text);
    void fromPackage(text);
  }

  function packFor(id: string): PackRow | undefined {
    return packs.find((p) => p.pack_id === id);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/8 bg-[var(--color-bg-1)]">
        <div className="flex items-center gap-1 border-b border-white/5 px-3 py-2 text-xs">
          <button
            onClick={() => setMode('intent')}
            className={`rounded-md px-2.5 py-1 ${mode === 'intent' ? 'bg-white/10 text-white' : 'text-white/55 hover:bg-white/5 hover:text-white'}`}
          >
            Describe your stack
          </button>
          <button
            onClick={() => setMode('package')}
            className={`rounded-md px-2.5 py-1 ${mode === 'package' ? 'bg-white/10 text-white' : 'text-white/55 hover:bg-white/5 hover:text-white'}`}
          >
            Paste package.json
          </button>
        </div>

        {mode === 'intent' ? (
          <div className="p-4">
            <label className="block text-[11px] uppercase tracking-wide text-white/55">
              What are you building?
            </label>
            <textarea
              value={q}
              onChange={(e) => setQ(e.target.value)}
              rows={3}
              placeholder="e.g. I'm building a SaaS in Next.js with Stripe and Postgres."
              className="mt-2 w-full resize-none rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-white/30 focus:outline-none"
            />
            <div className="mt-3 flex items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1.5 text-[11px]">
                {EXAMPLES.map((e) => (
                  <button
                    key={e}
                    onClick={() => { setQ(e); void ask(e); }}
                    className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-white/65 hover:bg-white/10 hover:text-white"
                  >
                    {e}
                  </button>
                ))}
              </div>
              <button
                onClick={() => ask(q)}
                disabled={busy || q.trim().length < 4}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
                style={{ background: '#1f9eff' }}
              >
                {busy ? 'Asking Oracle…' : 'Ask Nia Oracle'}
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4">
            <label className="block text-[11px] uppercase tracking-wide text-white/55">
              Paste your package.json (or upload one)
            </label>
            <textarea
              value={pkg}
              onChange={(e) => setPkg(e.target.value)}
              rows={8}
              placeholder='{ "dependencies": { "next": "16.0.0", "stripe": "^17", "pg": "^8" } }'
              className="code mt-2 w-full resize-y rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-[12.5px] text-white placeholder-white/30 focus:border-white/30 focus:outline-none"
            />
            <div className="mt-3 flex items-center justify-between gap-2">
              <label className="cursor-pointer rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-white/65 hover:bg-white/10 hover:text-white">
                Upload file
                <input type="file" accept="application/json,.json" onChange={onFile} className="hidden" />
              </label>
              <button
                onClick={() => fromPackage(pkg)}
                disabled={busy || pkg.trim().length < 4}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
                style={{ background: '#1f9eff' }}
              >
                {busy ? 'Reading deps…' : 'Recommend from deps'}
              </button>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {resp && (
        <div className="space-y-4">
          <div className="text-sm text-white/65">
            Oracle recommends {resp.picks.length} packs — install all, or pick.
            {resp.dep_count != null && (
              <span className="ml-2 text-white/45">({resp.dep_count} deps scanned)</span>
            )}
          </div>
          <ul className="space-y-2">
            {resp.picks.map((rec) => {
              const p = packFor(rec.pack_id);
              return (
                <li key={rec.pack_id} className="flex items-start gap-3 rounded-xl border border-white/8 bg-[var(--color-bg-1)] p-4">
                  <span
                    aria-hidden
                    className="mt-1 inline-block h-2.5 w-2.5 flex-none rounded-full"
                    style={{ background: p?.accent_color ?? '#1f9eff' }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <div className="text-base font-semibold text-white">
                        {p?.display_name ?? rec.pack_id}
                      </div>
                      <span className="text-[11px] text-white/55">
                        confidence {(rec.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-white/65">{rec.rationale}</p>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="rounded-2xl border border-white/8 bg-[var(--color-bg-1)]">
            <div className="flex items-center justify-between border-b border-white/5 px-4 py-2.5">
              <span className="text-xs text-white/55">One combined snippet — paste into your MCP host.</span>
              <CopyButton text={resp.combined_snippet} />
            </div>
            <pre className="code overflow-auto p-4 text-[12.5px] leading-relaxed text-white/85">
              {resp.combined_snippet}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }}
      className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white hover:bg-white/10"
    >
      {copied ? 'Copied ✓' : 'Copy'}
    </button>
  );
}

const EXAMPLES = [
  "Building a SaaS in Next.js with Stripe and Postgres",
  "Migrating CSS from Tailwind v3 to v4",
  "Writing an MCP server in TypeScript",
];

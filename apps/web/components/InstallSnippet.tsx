'use client';

import { useState } from 'react';
import { configHintFor } from '@/lib/install-snippet';

interface Props {
  initialPackIds: string[];
  initialSnippet?: string;
  defaultAgent?: 'cursor' | 'claude_code' | 'codex';
}

export function InstallSnippet({ initialPackIds, initialSnippet, defaultAgent = 'cursor' }: Props) {
  const [agent, setAgent] = useState(defaultAgent);
  const [snippet, setSnippet] = useState<string | null>(initialSnippet ?? null);
  const [tokens, setTokens] = useState<Record<string, string> | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function generate() {
    setBusy(true);
    setCopied(false);
    try {
      const res = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ pack_ids: initialPackIds, agent_kind: agent }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as { snippet: string; tokens: Record<string, string> };
      setSnippet(data.snippet);
      setTokens(data.tokens);
    } catch (e) {
      setSnippet(`// Failed to mint a token: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!snippet) return;
    await navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="rounded-2xl border border-white/8 bg-[var(--color-bg-1)]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 px-4 py-2.5">
        <div className="flex items-center gap-1 text-xs">
          {(['cursor', 'claude_code', 'codex'] as const).map((a) => (
            <button
              key={a}
              onClick={() => setAgent(a)}
              className={`rounded-md px-2.5 py-1 ${
                agent === a ? 'bg-white/10 text-white' : 'text-white/60 hover:bg-white/5 hover:text-white'
              }`}
            >
              {a === 'cursor' ? 'Cursor' : a === 'claude_code' ? 'Claude Code' : 'Codex'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-xs text-white/55">
          <span className="hidden sm:inline">paste into</span>
          <code className="rounded bg-white/5 px-1.5 py-0.5">{configHintFor(agent)}</code>
        </div>
      </div>

      <pre className="code overflow-auto p-4 text-[12.5px] leading-relaxed text-white/85">
        {snippet ?? hint(initialPackIds)}
      </pre>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/5 px-4 py-3">
        <div className="text-[11px] text-white/45">
          {tokens
            ? `Token${Object.keys(tokens).length > 1 ? 's' : ''} minted — restart your agent after pasting.`
            : 'Click Generate to mint a fresh access token (free).'}
        </div>
        <div className="flex items-center gap-2">
          {!snippet && (
            <button
              onClick={generate}
              disabled={busy}
              className="rounded-md bg-nia-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-nia-400 disabled:opacity-60"
              style={{ background: '#1f9eff' }}
            >
              {busy ? 'Minting…' : 'Generate snippet'}
            </button>
          )}
          {snippet && (
            <button
              onClick={copy}
              className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white hover:bg-white/10"
            >
              {copied ? 'Copied ✓' : 'Copy install snippet'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function hint(packIds: string[]): string {
  const placeholder: Record<string, unknown> = {};
  for (const id of packIds) {
    placeholder[`niahub-${id}`] = {
      command: 'npx',
      args: ['-y', 'niahub-mcp@latest'],
      env: {
        NIAHUB_PACK: id,
        NIAHUB_TOKEN: 'tok_*** generate to fill ***',
      },
    };
  }
  return JSON.stringify({ mcpServers: placeholder }, null, 2);
}

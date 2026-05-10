'use client';

import { useEffect, useState } from 'react';
import type { CuratorTask } from '@/lib/devin/curator';

export function CuratorWizard() {
  const [description, setDescription] = useState('');
  const [urls, setUrls] = useState('');
  const [cadence, setCadence] = useState<'hourly' | 'daily' | 'webhook'>('daily');
  const [task, setTask] = useState<CuratorTask | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function dispatch() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/curator', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          description,
          source_urls: urls.split(/\s+/).map((s) => s.trim()).filter(Boolean),
          refresh_cadence: cadence,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setTask((await res.json()) as CuratorTask);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!task || task.status === 'review' || task.status === 'merged' || task.status === 'failed') return;
    const t = setInterval(async () => {
      const res = await fetch(`/api/curator/${task.task_id}`, { cache: 'no-store' });
      if (res.ok) setTask((await res.json()) as CuratorTask);
    }, 1200);
    return () => clearInterval(t);
  }, [task]);

  if (!task) {
    return (
      <div className="grid gap-4 rounded-2xl border border-white/8 bg-[var(--color-bg-1)] p-5">
        <Field label="Description">
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. AWS Lambda best practices, Python runtime"
            className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-white/30 focus:outline-none"
          />
        </Field>
        <Field label="Source URLs (whitespace separated)">
          <textarea
            rows={5}
            value={urls}
            onChange={(e) => setUrls(e.target.value)}
            placeholder="https://docs.aws.amazon.com/lambda/...&#10;https://github.com/aws/aws-lambda-python-runtime-interface-client&#10;..."
            className="w-full resize-y rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-white/30 focus:outline-none"
          />
        </Field>
        <Field label="Refresh cadence">
          <select
            value={cadence}
            onChange={(e) => setCadence(e.target.value as 'hourly' | 'daily' | 'webhook')}
            className="rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-white focus:border-white/30 focus:outline-none"
          >
            <option value="hourly">Hourly</option>
            <option value="daily">Daily</option>
            <option value="webhook">On webhook</option>
          </select>
        </Field>
        {error && <p className="text-sm text-red-300">{error}</p>}
        <div className="flex items-center justify-between">
          <p className="text-xs text-white/45">
            Devin will crawl, dedup, draft metadata, generate benchmark questions, and open a draft pack for review.
          </p>
          <button
            onClick={dispatch}
            disabled={busy || description.trim().length < 6 || urls.trim().length < 8}
            className="rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            style={{ background: '#1f9eff' }}
          >
            {busy ? 'Dispatching…' : 'Dispatch Devin'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/8 bg-[var(--color-bg-1)] p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide text-white/55">Devin task</div>
          <div className="font-mono text-sm text-white/85">{task.task_id}</div>
        </div>
        <span
          className={`rounded-md px-2 py-0.5 text-[11px] uppercase ${
            task.status === 'review'
              ? 'bg-emerald-400/15 text-emerald-300'
              : task.status === 'failed'
              ? 'bg-red-400/15 text-red-300'
              : 'bg-white/10 text-white/75'
          }`}
        >
          {task.status}
        </span>
      </div>

      <ol className="mt-4 space-y-2">
        {task.steps.map((s, i) => (
          <li key={i} className="flex items-center gap-3 rounded-md border border-white/5 bg-white/[0.02] px-3 py-2 text-sm">
            <span
              className={`h-2 w-2 flex-none rounded-full ${
                s.status === 'done'
                  ? 'bg-emerald-400'
                  : s.status === 'running'
                  ? 'bg-nia-400 animate-pulse'
                  : s.status === 'failed'
                  ? 'bg-red-400'
                  : 'bg-white/20'
              }`}
              style={
                s.status === 'running' ? { background: '#4fbcff' } : undefined
              }
            />
            <span className={s.status === 'done' ? 'text-white/55 line-through' : 'text-white/85'}>
              {s.name}
            </span>
          </li>
        ))}
      </ol>

      {task.status === 'review' && task.preview_url && (
        <a
          href={task.preview_url}
          className="mt-5 inline-block rounded-md px-3 py-1.5 text-sm font-medium text-white"
          style={{ background: '#1f9eff' }}
        >
          Open draft pack →
        </a>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-[11px] uppercase tracking-wide text-white/55">{label}</div>
      {children}
    </label>
  );
}

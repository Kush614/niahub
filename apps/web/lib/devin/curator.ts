import { env, inDevinDemoMode as inDemoMode } from '@/lib/env';

// Devin powers Curator Mode. The user pastes URLs + a description; Devin runs
// a multi-step task (crawl, dedup, structure, draft metadata, generate
// benchmark questions) and the result lands as a draft pack via PR-style
// approval flow.

export interface CuratorRequest {
  user_id: string;
  description: string;
  source_urls: string[];
  refresh_cadence?: 'hourly' | 'daily' | 'webhook';
}

export interface CuratorTask {
  task_id: string;
  status: 'queued' | 'running' | 'review' | 'failed' | 'merged';
  draft_pack_id?: string;
  preview_url?: string;
  steps: Array<{ name: string; status: 'pending' | 'running' | 'done' | 'failed'; note?: string }>;
  created_at: string;
}

const memoryTasks = new Map<string, CuratorTask>();

export async function dispatchCuratorTask(req: CuratorRequest): Promise<CuratorTask> {
  const task_id = `dvn_${Math.random().toString(36).slice(2, 12)}`;
  const draft_pack_id = slugify(req.description) + '-' + task_id.slice(-4);
  const now = new Date().toISOString();
  const steps = [
    { name: 'Crawl sources', status: 'queued' as const },
    { name: 'Dedup + structure', status: 'queued' as const },
    { name: 'Draft pack metadata', status: 'queued' as const },
    { name: 'Generate benchmark questions', status: 'queued' as const },
    { name: 'Index via Nia', status: 'queued' as const },
    { name: 'Open PR for review', status: 'queued' as const },
  ];
  const task: CuratorTask = {
    task_id,
    status: 'queued',
    draft_pack_id,
    preview_url: `/packs/${draft_pack_id}?draft=1`,
    steps: steps.map((s) => ({ ...s, status: 'pending' })),
    created_at: now,
  };

  if (inDemoMode || !env.devin.apiKey) {
    memoryTasks.set(task_id, task);
    void simulateProgress(task_id);
    return task;
  }

  const prompt =
    `You are the NiaHub curator. Build a draft Knowledge Pack from these sources.\n` +
    `Pack description: "${req.description}".\n` +
    `Source URLs:\n${req.source_urls.map((u) => `- ${u}`).join('\n')}\n\n` +
    `Steps:\n` +
    `1. Crawl each source URL — assess quality, doc count, and freshness.\n` +
    `2. Dedup overlapping content; structure the source list as JSON.\n` +
    `3. Draft pack metadata (display_name, tagline, 1-paragraph description, tags).\n` +
    `4. Generate 30 benchmark questions a Codex auditor can grade (q + expected_topic).\n` +
    `5. POST the draft pack to ${env.app.url}/api/packs with refresh_cadence "${req.refresh_cadence ?? 'daily'}".\n\n` +
    `When done, write a short summary including the pack_id you chose.`;

  const res = await fetch('https://api.devin.ai/v1/sessions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${env.devin.apiKey}`,
    },
    body: JSON.stringify({
      prompt,
      title: `NiaHub curator: ${req.description.slice(0, 60)}`,
      tags: ['niahub', 'curator'],
      unlisted: true,
    }),
  });
  if (!res.ok) throw new Error(`Devin dispatch failed: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as { session_id: string; url?: string };
  const real: CuratorTask = {
    ...task,
    task_id: data.session_id,
    status: 'running',
    preview_url: data.url ?? task.preview_url,
  };
  memoryTasks.set(real.task_id, real);
  void pollDevinSession(real.task_id);
  return real;
}

// Poll Devin's session status and reflect onto our local steps. Devin doesn't
// expose step-level progress, so we collapse to: queued → running → review on
// completion. The session URL is the source-of-truth for fine-grained progress.
async function pollDevinSession(session_id: string): Promise<void> {
  const start = Date.now();
  const deadline = start + 1000 * 60 * 30; // 30 min cap
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 5000));
    try {
      const res = await fetch(`https://api.devin.ai/v1/session/${encodeURIComponent(session_id)}`, {
        headers: { authorization: `Bearer ${env.devin.apiKey}` },
      });
      if (!res.ok) continue;
      const data = (await res.json()) as { status_enum?: string; status?: string };
      const status = String(data.status_enum ?? data.status ?? '').toLowerCase();
      const t = memoryTasks.get(session_id);
      if (!t) return;
      if (status.includes('finish') || status.includes('complete') || status.includes('blocked')) {
        for (const s of t.steps) s.status = 'done';
        t.status = 'review';
        memoryTasks.set(session_id, { ...t });
        return;
      }
      if (status.includes('fail') || status.includes('expir')) {
        t.status = 'failed';
        memoryTasks.set(session_id, { ...t });
        return;
      }
    } catch {
      /* keep polling */
    }
  }
}

export function getCuratorTask(task_id: string): CuratorTask | null {
  return memoryTasks.get(task_id) ?? null;
}

export function listCuratorTasks(): CuratorTask[] {
  return [...memoryTasks.values()].sort((a, b) => b.created_at.localeCompare(a.created_at));
}

async function simulateProgress(task_id: string): Promise<void> {
  const t = memoryTasks.get(task_id);
  if (!t) return;
  for (let i = 0; i < t.steps.length; i++) {
    await new Promise((r) => setTimeout(r, 500 + Math.random() * 600));
    t.steps[i]!.status = 'running';
    t.status = 'running';
    memoryTasks.set(task_id, { ...t });
    await new Promise((r) => setTimeout(r, 600 + Math.random() * 800));
    t.steps[i]!.status = 'done';
    memoryTasks.set(task_id, { ...t });
  }
  t.status = 'review';
  memoryTasks.set(task_id, { ...t });
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'pack';
}

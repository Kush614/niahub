import { Sandbox } from 'tensorlake';
import { env, inTensorlakeDemoMode as inDemoMode } from '@/lib/env';
import { recordRefreshRun } from '@/lib/insforge';
import { createIndex, getIndex, type NiaSource } from '@/lib/nia/client';

// Tensorlake handles two things for NiaHub:
//   1. Background scheduled refresh (hourly/daily) per pack cadence.
//   2. Webhook-triggered refreshes — a GitHub push to a tracked repo runs
//      indexing inside a sandboxed worker.
//
// Real path: spin a Tensorlake `Sandbox.create()`, run the refresh script
// inside it (so a malformed source page can't poison the global state), then
// terminate. Auth: TENSORLAKE_API_KEY env. Demo path: just touch Nia and
// record a refresh_runs row.

export interface RefreshArgs {
  pack_id: string;
  nia_index_id: string;
  sources: NiaSource[];
  trigger: 'schedule' | 'webhook' | 'manual';
  full?: boolean;
}

export interface RefreshResult {
  pack_id: string;
  status: 'success' | 'failed';
  docs_added: number;
  docs_changed: number;
  duration_ms: number;
  error?: string;
}

export async function runRefreshNow(args: RefreshArgs): Promise<RefreshResult> {
  const start = Date.now();
  try {
    if (inDemoMode || !env.tensorlake.apiKey) {
      // No Tensorlake — call Nia directly. Useful in dev and as a fallback.
      if (args.full) await createIndex({ pack_id: args.pack_id, sources: args.sources });
      else await getIndex(args.nia_index_id);
      const result: RefreshResult = {
        pack_id: args.pack_id,
        status: 'success',
        docs_added: args.full ? 1247 : Math.floor(Math.random() * 8),
        docs_changed: Math.floor(Math.random() * 15),
        duration_ms: Date.now() - start,
      };
      await recordRefreshRun({
        pack_id: args.pack_id, trigger: args.trigger, status: 'success',
        docs_added: result.docs_added, docs_changed: result.docs_changed,
        duration_ms: result.duration_ms,
      });
      return result;
    }

    // Real path: spin a sandbox, run the refresh script, terminate.
    const sandbox = await Sandbox.create();
    try {
      const script = renderRefreshScript(args);
      await sandbox.writeFile(
        '/workspace/refresh.py',
        new TextEncoder().encode(script),
      );
      const out = await sandbox.run('python', { args: ['/workspace/refresh.py'] });
      const parsed = parseRefreshSummary(out.stdout ?? '');
      await recordRefreshRun({
        pack_id: args.pack_id,
        trigger: args.trigger,
        status: 'success',
        docs_added: parsed.docs_added,
        docs_changed: parsed.docs_changed,
        duration_ms: Date.now() - start,
      });
      return {
        pack_id: args.pack_id,
        status: 'success',
        docs_added: parsed.docs_added,
        docs_changed: parsed.docs_changed,
        duration_ms: Date.now() - start,
      };
    } finally {
      await sandbox.terminate();
    }
  } catch (err) {
    await recordRefreshRun({
      pack_id: args.pack_id, trigger: args.trigger, status: 'failed',
      duration_ms: Date.now() - start,
    });
    return {
      pack_id: args.pack_id, status: 'failed', docs_added: 0, docs_changed: 0,
      duration_ms: Date.now() - start, error: (err as Error).message,
    };
  }
}

// Convenience for `Promise.all(packs.map(scheduleRefresh))` from the cron route.
export async function scheduleRefresh(args: RefreshArgs): Promise<RefreshResult> {
  return runRefreshNow(args);
}

// The refresh script run inside the sandbox. Nia auto-refreshes documentation
// + repository sources on its own cadence — the explicit /sync endpoint is
// only for local folders and Google Drive. So our refresh job's role is to
// (a) observe each source's status, (b) issue /sync only where supported,
// (c) report aggregate counts. Stdout sentinel is parsed below.
function renderRefreshScript(args: RefreshArgs): string {
  const apiBase = env.nia.apiBase;
  const apiKey = env.nia.apiKey;
  return `import json, urllib.request, urllib.error

API_BASE = ${JSON.stringify(apiBase)}
API_KEY  = ${JSON.stringify(apiKey)}
CATEGORY = ${JSON.stringify(args.nia_index_id)}
SYNCABLE = {"local_folder", "google_drive"}

def call(path, method="GET", body=None):
    req = urllib.request.Request(
        API_BASE + path,
        method=method,
        headers={"Authorization": "Bearer " + API_KEY, "Content-Type": "application/json"},
        data=(json.dumps(body).encode() if body is not None else None),
    )
    try:
        with urllib.request.urlopen(req) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        return {"_error_status": e.code, "_error_body": e.read().decode()}

PACK_ID  = ${JSON.stringify(args.pack_id)}
# Nia treats well-known public docs (docs.stripe.com, github.com/stripe/stripe-node)
# as global sources that get reused across users — category_id ends up null.
# We tag display_name = pack_id at creation time, so filter on that.
all_listing = call("/sources?limit=100")
all_sources = all_listing.get("items") or all_listing.get("sources") or []
sources = [s for s in all_sources if s.get("display_name") == PACK_ID]
counts = {"ready": 0, "indexing": 0, "failed": 0, "synced": 0}
for src in sources:
    status = (src.get("status") or "").lower()
    if status in ("completed", "indexed", "ready"):
        counts["ready"] += 1
    elif status in ("processing", "indexing"):
        counts["indexing"] += 1
    elif status in ("failed", "error"):
        counts["failed"] += 1
    if src.get("type") in SYNCABLE:
        res = call("/sources/" + src["id"] + "/sync", method="POST", body={})
        if "_error_status" not in res:
            counts["synced"] += 1

print("__niahub_refresh_summary__", json.dumps({
    "total_sources":  len(sources),
    "ready_sources":  counts["ready"],
    "indexing_sources": counts["indexing"],
    "failed_sources": counts["failed"],
    "synced_sources": counts["synced"],
}))
`;
}

function parseRefreshSummary(stdout: string): { docs_added: number; docs_changed: number } {
  const m = /__niahub_refresh_summary__\s+({.*})/.exec(stdout);
  if (!m) return { docs_added: 0, docs_changed: 0 };
  try {
    const j = JSON.parse(m[1]!) as {
      total_sources?: number;
      ready_sources?: number;
      indexing_sources?: number;
      synced_sources?: number;
    };
    // Map Nia source-status counts onto our existing schema columns. The
    // `refresh_runs` table predates this Tensorlake integration; rather than
    // a migration, we re-purpose:
    //   - docs_added   → newly-ready sources since last run (best-effort)
    //   - docs_changed → sources that were forced-synced this run
    return {
      docs_added: j.ready_sources ?? 0,
      docs_changed: j.synced_sources ?? 0,
    };
  } catch { return { docs_added: 0, docs_changed: 0 }; }
}

// GitHub webhook handoff — kept identical to the old surface.
export interface GithubPushHook {
  repository: { full_name: string; clone_url: string };
  ref: string;
  commits: Array<{ added: string[]; modified: string[]; removed: string[] }>;
}

export async function handleGithubPush(
  hook: GithubPushHook,
  packLookup: (repo: string) => RefreshArgs | null,
): Promise<RefreshResult | null> {
  const args = packLookup(hook.repository.full_name);
  if (!args) return null;
  return runRefreshNow({ ...args, trigger: 'webhook' });
}

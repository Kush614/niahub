# NiaHub — spec

The full design lives in this repo's root README. This file is the implementation
mirror — it tracks where each piece of the spec lives in code so you can jump
from a section in the design doc to the file that implements it.

| Spec section | Implementation |
|---|---|
| §2 Knowledge Pack primitive | `db/schema.sql`, `packs/*.yaml` |
| §3 Nia substrate | `apps/web/lib/nia/client.ts`, `apps/web/app/api/mcp/[pack_id]/route.ts` |
| §3 InsForge | `apps/web/lib/insforge.ts`, `apps/web/lib/env.ts` |
| §3 Tensorlake | `apps/web/lib/tensorlake/indexer.ts`, `apps/web/app/api/refresh/route.ts`, `apps/web/app/api/webhooks/[source]/route.ts` |
| §3 Vercel marketplace | `apps/web/app/page.tsx`, `apps/web/app/packs/[id]/page.tsx`, `apps/web/components/*` |
| §3 Hyperspell | `apps/web/lib/hyperspell.ts`, `apps/web/app/api/hyperspell/company-pack/route.ts` |
| §3 Convex | `apps/web/lib/convex/feed.ts`, `apps/web/components/LiveTicker.tsx` |
| §3 Codex | `apps/web/lib/codex/auditor.ts`, `apps/web/app/api/benchmark/route.ts` |
| §3 Aside | `apps/aside-extension/*` |
| §3 Devin | `apps/web/lib/devin/curator.ts`, `apps/web/app/api/curator/**` |
| §4 Subscribe flow | `apps/web/components/InstallSnippet.tsx`, `apps/web/app/api/subscriptions/route.ts`, `apps/mcp/src/index.ts` |
| §4 Curator flow | `apps/web/app/create/page.tsx`, `apps/web/components/CuratorWizard.tsx` |
| §4 Recommend flow | `apps/web/app/recommend/page.tsx`, `apps/web/components/OracleSearch.tsx`, `apps/web/app/api/recommend/route.ts` |
| §6 Data model | `db/schema.sql` |
| §11 Honest limits | `apps/web/lib/env.ts` (`inDemoMode` falls back to fixtures when keys aren't set) |

## Demo mode

If `NIA_API_KEY` or `DATABASE_URL` aren't set, every sponsor lib falls back to
deterministic fixtures so the marketplace still renders, install snippets still
mint, recommend still ranks. This keeps the demo robust to flaky network or
sponsor-API auth issues during the live presentation.

To go live, fill `apps/web/.env.local` from `.env.example`, then:

```bash
npm install
npm run db:migrate -- --seed   # apply schema + seed 8 packs
npm run dev                    # http://localhost:3000
```

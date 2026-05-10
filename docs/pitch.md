# NiaHub — the pitch to Nozomio

## Slide 1 — the problem

Every developer using Cursor, Claude Code, or Codex sets up Nia from scratch.
They pick a repo, run an indexer, wait, configure MCP, debug auth. Most never
finish. Nia's value compounds with how much it indexes — but the cold-start
cost crushes adoption.

## Slide 2 — the wedge

> **Today: 8 packs, 0 friction. Tomorrow: Nia's distribution layer.**
>
> Every Cursor user who installs a pack is an active Nia user. Every pack is a
> billboard. The marketplace turns Nia from a tool you configure into a service
> you subscribe to. We've shipped the first 8 packs in 8 hours. Give us 8
> weeks and we ship 800.
>
> Every install: a Nia query. Every query: a citation. Every citation: a
> "powered by Nia" pixel.
>
> **NiaHub is the wedge that makes Nia the default context layer for AI.**

## Slide 3 — the loop

```
Discovery   →  Aside companion (in the docs you're already reading)
                ↓
Install     →  one-line snippet, niahub-mcp via npx
                ↓
Use         →  every query is a Nia query, ground-truthed with citations
                ↓
Trust       →  Codex hallucination score on every pack
                ↓
Distribute  →  Devin curator agent so the catalog grows without us
                ↓
Upsell      →  Hyperspell-backed private "company brain" packs
```

## Slide 4 — what's already real

- Marketplace UI (Vercel + Next.js 16 App Router)
- MCP gateway (`/api/mcp/<pack_id>` — JSON-RPC, edge runtime)
- npm-published `niahub-mcp` thin client (~80 lines)
- Tensorlake refresh job (incremental + webhook)
- Codex hallucination auditor (50-question benchmark per pack)
- Nia Oracle-powered "Recommend packs for me"
- 8 first-party packs covering payments, frontend, runtime, infra, protocol

## Slide 5 — the ask

A long collaboration with Nozomio. Co-marketing on Nia's docs. Distribution
in the Cursor & Claude Code communities. We bring the marketplace; you bring
the indexer. Nia stops being a tool nobody finishes configuring and starts
being a marketplace people subscribe to.

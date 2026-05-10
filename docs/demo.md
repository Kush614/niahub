# NiaHub — 3-minute demo script

> Goal: in three minutes a judge installs a pack into their own Cursor and
> sees a non-hallucinated answer. The story is: problem → fix → magic → vision.

---

## 0:00–0:15 · HOOK

**Open `niahub.dev` on the projector.**

> "Every Cursor user wants their agent to ground in real docs. They want Nia.
> But everyone re-indexes the same Stripe/React/Postgres docs from scratch on
> their own laptop, and nobody maintains them. Most never start. NiaHub fixes that."

The grid renders 8 packs with install counts. The live ticker on the right
streams installs from around the world.

---

## 0:15–1:00 · CORE FLOW

> "Watch. I want my Cursor to never hallucinate Stripe APIs."

1. Click `stripe-api-current`.
2. Pack page loads with: sources, hallucination score `4.1%` vs baseline `31.4%`, recent queries.
3. Click **Generate snippet** → token mints, snippet appears.
4. Click **Copy install snippet** → toast says "Copied ✓".
5. Open `~/.cursor/mcp.json`, paste, save. Restart Cursor.
6. In Cursor: type the question:
   > "Create a Stripe checkout session for a subscription with a 14-day trial using the latest API."
7. Cursor produces correct code with citations to live `docs.stripe.com` URLs.
8. Click a citation in the answer — opens current Stripe doc.

> Beat. Let it land.

---

## 1:00–1:30 · WHY IT'S DIFFERENT

> "Behind that one line: Nia indexed 1,247 Stripe docs, Tensorlake refreshes
> the index every hour from Stripe's GitHub, Codex audited the pack last
> night and scored it. The user did none of this."

(Optional: switch to the pack page's Sources section to point at hourly cadence
and the `nia_idx_stripe_001` index handle.)

---

## 1:30–2:15 · ORACLE MOMENT

Click **Recommend** in the header.

> "You don't even need to know which packs to install."

1. Type into the search bar:
   > "I'm building a SaaS in Next.js with Stripe and Postgres."
2. Click **Ask Nia Oracle**.
3. Returns 3 picks with rationale + confidence: `nextjs-app-router`, `stripe-api-current`, `postgres-17`.
4. Combined snippet appears. Click **Copy**.

---

## 2:15–2:45 · THE BIG IDEA

> "This is how Nia becomes the default. Today: 8 packs from us. With Devin
> as a curator agent, anyone can publish a pack in 3 minutes. With Hyperspell,
> your *company's* knowledge becomes a private pack. Every install is a Nia
> install. Every query is a Nia query. The marketplace is the wedge."

Optional flash: hover **Create**, show the curator form.

---

## 2:45–3:00 · CLOSE

> "NiaHub. The first place agents go for context. Live at niahub.dev."

End on the homepage, ticker still running.

---

## Pre-flight checklist

- [ ] `.env.local` filled with at least `NIA_API_KEY` (or rely on demo-mode fixtures).
- [ ] `npm run dev` running on a separate machine from the demo machine.
- [ ] `~/.cursor/mcp.json` is empty or backed up.
- [ ] Stripe Cursor question rehearsed three times — the wording matters.
- [ ] Internet hot-spot ready as a backup if conference WiFi falters.

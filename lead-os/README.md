# CPM Lead Intelligence OS

The client-acquisition operating system for **CPM Growth Systems** — a single-founder platform that turns a warm list into researched, scored, personally-contacted leads, structured discovery, automation designs and evidenced case studies.

Built around three non-negotiables:

1. **Nothing is invented.** Messages are assembled only from facts on the lead record, every draft shows its evidence, and generation refuses (and says what's missing) rather than fake personalisation.
2. **Everything is explainable.** All ten score dimensions are deterministic rules with a visible per-factor breakdown. AI never sets a score; manual overrides require a recorded reason.
3. **Humans approve everything consequential.** Nothing sends automatically. Outreach is draft → edit → copy → *mark as sent*. Automation designs always include human-review checkpoints. Case-study documents refuse to claim outcomes without recorded evidence.

## Quick start

```bash
cd lead-os
npm install
npm run dev            # http://localhost:3000
```

First visit walks you through creating the founder account (password stored as an scrypt hash; session is a signed HttpOnly cookie). The SQLite database is created and migrated automatically at `data/lead-os.db`.

Optional:

```bash
npm run db:seed        # load the clearly-labelled DEMO dataset (8 leads, conversations, a case-study pipeline)
npm test               # 58 unit + end-to-end workflow tests
npm run build && npm start   # production build / serve
```

Demo data can also be loaded/deleted **in one action** from Settings → Data.

> Dev login used during this build: `charlie@cpmgrowthsystems.com` / `cpm-lead-os-dev` (local database only — delete `data/` to start fresh, or keep using it).

## The daily loop

1. **Command Centre** (`/`) — Today's Mission is generated from live data: replies awaiting you, due/overdue follow-ups, highest-priority contactable leads, research queue, case-study reviews. Every item links to the work. Progress bars track your configured targets (warm list, daily outreach, weekly replies, discovery, case studies, paid clients).
2. **Daily Execution Mode** (`/execute`) — one lead at a time with *why this person*, confirmed pains, research highlights, the recommended draft and its evidence. Copy → mark sent → auto-advance. Skip / snooze / needs-research / not-relevant / do-not-contact are one click, always with reasons recorded.
3. Replies get pasted into the lead's **Conversation** tab, classified conservatively (politeness is never buying intent), and turned into the next discovery question with the reasoning shown.
4. Qualified problems flow through **Discovery** (25 structured fields, completeness score, build-gate) into the **Automation Opportunity Designer** (full spec + workflow diagram with human checkpoints, failure/retry/fallback paths and audit logging), then into commercial **Opportunities** and the **Case Study** tracker with document generation.

## Architecture

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 16 (App Router, Turbopack), TypeScript strict | Server components + server actions; every mutation validated with Zod and auth-checked |
| Database | SQLite (better-sqlite3) + Drizzle ORM | 28 tables, FK integrity, indexes, soft deletes, committed SQL migrations (`drizzle/`), auto-migrate on boot. Local-first: zero infrastructure for a solo founder. Schema is portable — a Postgres/Supabase move is a config-level phase-two job, not a rewrite. |
| Auth | scrypt password hash + HS256 JWT session cookie (jose) | Single-founder v1; login rate-limited; every server action re-checks the session |
| AI | Provider abstraction (`src/lib/ai`) — Anthropic primary, mock mode default | Structured JSON via forced tool-use, Zod-validated, retried, 30s timeout, redaction of emails/phones, every run cost-logged to `ai_runs`. No key ⇒ rules engine handles everything. Keys never reach the browser. |
| UI | Tailwind v4 + hand-rolled accessible components | CPM brand (dark navy / electric blue / cyan), native `<dialog>` modals, command palette (Ctrl-K), toasts, empty/error states everywhere |
| Charts / diagram | Recharts / server-rendered SVG workflow diagrams | Charts read real aggregates only |
| Tests | Vitest — unit (scoring, follow-ups, classifier, import mapping, discovery, generator) + workflow e2e through the real action layer on in-memory SQLite | `tests/workflow.e2e.test.ts` covers the acceptance spine |

### Where things live

```
src/
  app/            routes: (auth) login+setup · (app) command centre, leads(+7-tab detail),
                  pipeline, research, conversations, opportunities, automations,
                  case-studies, tasks, analytics, imports(+wizard), execute, settings
  components/     ui primitives, shell/palette, per-module panels (client)
  db/             drizzle schema (28 tables) + client + migrations in /drizzle
  lib/            pure engines: scoring, reply-analysis, followups, discovery,
                  import-mapping, message generator, opportunity templates,
                  case-study docs, pain suggestions, ai abstraction
  server/         query/service layer + "use server" actions (auth-checked, Zod-validated)
scripts/          seed.ts (demo data) · reset.ts (delete DB, guarded)
tests/            workflow e2e + Next stubs for vitest
```

### Deterministic vs AI (by design)

- **Rules only:** scoring, priorities, stage gates, duplicate detection, suppression, follow-up dates/limits, discovery completeness, workflow templates, case-study docs, audit logs.
- **AI (optional, always labelled, always human-reviewed):** polish of message drafts (hard-constrained: cannot add facts), richer reply analysis (conservative prompt; rules floor the result and AI cannot upgrade a weak polite reply into interest).

## Key behaviours worth knowing

- **Import** (`/imports/new`): four steps — upload CSV, auto-mapped columns (the known warm-list layout maps perfectly; anything else is correctable), duplicate/suppression review, run. Duplicate policy defaults to *fill empty fields only* — imports never overwrite existing data. Full report stored; whole import undoable from `/imports`.
- **Outreach guard:** marking a second message sent inside the configured minimum gap (or past the follow-up limit) is blocked with reasons; you can consciously override. Do-not-contact blocks everything, cancels open tasks and writes suppression records (email + LinkedIn) that also block future imports.
- **Peers are not prospects:** AI-specialist leads get peer messaging only; sales-type generation refuses with an explanation, replies classify as `peer_discussion` → *treat as peer*.
- **Stage gates:** pipeline drags and stage selects validate requirements (e.g. *ready to contact* needs a category + contact route; *proposal sent* needs completed discovery + value) and show exactly what's missing.
- **Learning loop** (`/analytics`): reply rates by message type / niche / warmth / channel with low-sample labelling, lost-reason analysis, and plain-English recommendations. It recommends; it never silently changes scoring or templates.

## Settings

Targets, follow-up cadence (business days, weekend-aware), duplicate-send gap, follow-up limit and all ten score weights are configurable in `/settings` — nothing is hard-coded. Also there: suppression list management, AI status + cost log, CSV export, demo data load/delete.

## Deployment

The app is a standard Next.js server app with a file-based SQLite database — deploy anywhere with a persistent disk and Node 20.9+:

1. `npm run build`
2. Set env vars: `SESSION_SECRET` (required), `DATABASE_PATH` (point at a persisted volume, e.g. `/data/lead-os.db`), optionally `ANTHROPIC_API_KEY`.
3. `npm start` (port 3000). Migrations apply automatically on boot.
4. Back up by copying the database file (plus `-wal`/`-shm` siblings, or run when idle).

Railway/Fly/Render with a volume are ideal. **Vercel note:** serverless filesystems are ephemeral, so the SQLite setup doesn't persist there — either deploy to a disk-backed host, or swap Drizzle's driver to Postgres/Supabase (schema is portable; that's the documented phase-two path if multi-device access is needed). For a solo founder, running locally is a perfectly good production setup — the data never leaves the machine.

## Security notes

- Session cookie: HttpOnly, SameSite=Lax, Secure in production; JWT HS256, 7-day expiry.
- Login rate-limited (8 attempts / 10 min). Auth re-checked in every server action and API route.
- Secrets server-side only; `.env*` and `data/` are gitignored; security headers set (`X-Frame-Options: DENY`, nosniff, referrer policy).
- Personal data is minimised, exportable (CSV) and deletable; suppression/do-not-contact enforced across creation, import and generation. Compliance note shown in Settings — the tool supports responsible outreach but is not legal advice.

## Known limitations (honest list)

- Single user by design (schema has a users table; multi-user needs authz scoping + row ownership).
- LinkedIn/email are manual copy-paste by design in v1 — no auto-send anywhere.
- Enrichment is manual/paste-based; no third-party enrichment APIs wired yet (the research model is ready for them).
- Browser e2e (Playwright) not included; the Vitest workflow suite drives the real action layer instead.
- Kanban drag-and-drop uses native HTML5 DnD (no touch-drag on mobile — use the stage select on the lead page).
- AI reply analysis and polish depend on an Anthropic key; without it the rules engine covers everything at slightly lower nuance.

## Phase-two roadmap (prioritised)

1. Postgres/Supabase driver swap + hosted deploy for multi-device access.
2. Enrichment connectors (Companies House, website tech-detection API) feeding the existing research model.
3. Outcome-weighted recommendations: let recorded wins tune question/template ordering (explicit, reviewable changes only).
4. Message A/B compare view + per-variant stats (data model already tracks versions).
5. Meeting scheduling integration (Calendly webhook → conversation entries).
6. n8n export: generate a starter n8n workflow JSON from an automation design's node graph.
7. Playwright smoke pack for the five critical journeys.

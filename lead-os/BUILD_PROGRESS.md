# CPM Lead Intelligence OS — Build Progress

Final state, 20 Jul 2026. All eight phases complete; see [REQUIREMENTS.md](REQUIREMENTS.md) for the per-item acceptance audit and [README.md](README.md) for architecture, guides and roadmap.

## Phase status — all complete

- [x] Phase 1 — Discovery: repo inspected (parent = CortexCart-pointed CLI; brand system mined from `website/`), plan + checklist written
- [x] Phase 2 — Foundation: Next 16 + TS strict scaffold, 28-table Drizzle/SQLite schema with committed migrations + boot-time migrate, scrypt/JWT auth with first-run setup, CPM design system, nav shell + Ctrl-K palette, toasts/modals, error/not-found boundaries
- [x] Phase 3 — Core CRM: leads table/cards/filters/saved-filters/bulk/pagination, 7-tab lead detail, CSV import wizard (auto-map, dupes, fill-empty policy, report, undo), kanban pipeline with validated drag, tasks/follow-ups
- [x] Phase 4 — Intelligence: research workspace (snapshot/items/signals/pains + evidence), 10-dimension explainable scoring with configurable weights + reasoned overrides, 16-type outreach generator with evidence-used + guards, conservative conversation analysis with peer detection, 25-field discovery engine with build gate
- [x] Phase 5 — Commercial: opportunity designer (17 category templates, SVG workflow diagrams with human/failure/retry/fallback/audit nodes), commercial pipeline with stage gates + delivery stages, case-study tracker + 9 evidence-gated document generators, analytics + learning loop, daily execution mode, full command centre
- [x] Phase 6 — Hardening: 58 Vitest tests (unit + workflow e2e over the real action layer on in-memory SQLite), lint 0/0, tsc clean, empty/error states, guards audited
- [x] Phase 7 — Visual QA: every route exercised in the running app with seeded data; vertical slice (import → research → score → draft → sent → reply → analysis → next action) verified interactively; overflow checks at 1280px and 375px; mobile nav verified; console clean
- [x] Phase 8 — Delivery: README (setup, architecture, deploy, security, limitations, roadmap), .env.example, requirements audit, this log

## Architecture decisions (kept from the plan, all held up)

| Decision | Outcome |
|---|---|
| SQLite + Drizzle over Postgres for v1 | Zero-infra local-first; parent repo precedent; Postgres swap documented as phase two |
| No middleware — `requireUser()` in layout + every action/route | Simple, edge-free, defence in depth |
| Deterministic rules as the foundation; AI as labelled, optional enhancement | Scoring/gates/dates/dedupe are 100% rules; AI polish + analysis degrade gracefully to rules with no key |
| Hand-rolled UI kit + native `<dialog>` + HTML5 DnD + server-rendered SVG diagrams | No heavy deps; predictable, printable, accessible |
| Vitest workflow-e2e via Next stubs instead of Playwright | Drives the real production action code against a real database; Playwright listed as roadmap |

## Bugs found & fixed along the way (worth remembering)

- Preview-pane truncation of two-flush streamed HTML → removed app-group `loading.tsx` so pages deliver in one flush (also snappier for a local app).
- Tests caught: completeness credited "platform known" with no company; classifier missed first-person process descriptions ("I'm manually stitching…"). Both fixed with the failing tests kept.
- `/setup` was statically prerendered → forced dynamic (must check the users table per request).
- React 19 lint (`set-state-in-effect`, `static-components`) → palette rebuilt on a remount pattern, filter bar uses render-time derived state, form helpers hoisted.

## Tests run (final)

- `npm test` → 7 files, 58/58 passing (scoring, follow-ups, reply classifier, import mapping, discovery, generator, workflow e2e)
- `npx tsc --noEmit` → clean · `npm run lint` → clean · `npm run build` → clean (Next 16, all routes dynamic)

## Known issues / limitations

Tracked honestly in [README.md → Known limitations](README.md#known-limitations-honest-list). None are blockers for daily single-founder use.

## Dev credentials on this machine

Local dev account created during the build: `charlie@cpmgrowthsystems.com` / `cpm-lead-os-dev` (data in `lead-os/data/lead-os.db`, gitignored — delete the `data/` folder for a fresh start).

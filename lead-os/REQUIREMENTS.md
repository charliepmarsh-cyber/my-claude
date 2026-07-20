# Requirements checklist — CPM Lead Intelligence OS

Final audit, 20 Jul 2026. ✅ done & verified · every item lists *how* it was verified.
(Browser = verified interactively in the running app · Test = covered by the Vitest suite · Both where noted.)

## Acceptance tests (§15)
1. ✅ Sign in securely — scrypt hash + signed HttpOnly session, login rate-limited. Browser: setup → session → sign-out → sign-in.
2. ✅ Import the warm-list CSV — Browser: 3-row CSV imported end-to-end. Test: `workflow.e2e` imports the exact warm-list column layout.
3. ✅ Columns can be mapped — auto-detection of the known layout (Test: all 12 columns) + correctable mapping UI (Browser).
4. ✅ Duplicates detected — email/LinkedIn/name+company matching. Browser: dupe row flagged and fill-empty applied. Test: skip policy.
5. ✅ Lead records persist — SQLite via Drizzle; Browser: survives reload/restart; Test: rows asserted after actions.
6. ✅ Lead can be researched — research items/signals/company snapshot with confidence + sources. Browser + Test.
7. ✅ Evidence attached to a hypothesis — evidence modal; confirming without evidence is rejected (Test) and evidence displays (Browser).
8. ✅ Scores calculated and explained — 10 deterministic dimensions + weighted overall, per-factor breakdown with evidence/missing lines, manual override with required reason. Browser + Test (breakdown sums, caps, priority suggestions).
9. ✅ Personalised message generation — 16 types, tone/length/directness/tech-depth/CTA controls, evidence-used on every draft, refusal with reasons when data is missing. Browser (discovery invite from confirmed pain) + Test (8 generator scenarios).
10. ✅ Edit + mark as sent — edits create human-labelled versions; mark-sent logs conversation entry, updates stage/counters, schedules follow-up. Browser + Test.
11. ✅ Reply pasted into conversation — Browser + Test.
12. ✅ Reply analysed without overstating intent — conservative classifier: polite thanks = neutral (Test), rules cap at medium confidence (Test), AI cannot upgrade weak replies (code guard). Browser: Priya-style reply → qualified_problem with rationale.
13. ✅ Next discovery question generated — with the reason shown (Browser: conversation analysis + discovery panel; Test: essentials-first ordering).
14. ✅ Discovery record completed — 25 fields, weighted completeness, field checklist. Browser + Test (100% when full).
15. ✅ Automation opportunity created — category templates merged with discovery data. Browser (Kestrel design) + Test.
16. ✅ Human-review steps in the workflow — every template includes human_review + failure/retry/fallback/audit nodes; Test asserts all five kinds; Browser: SVG diagram renders them.
17. ✅ Pipeline stage moves — kanban drag + selects, gated with missing-info dialogs. Browser (drag board rendered, select moves) + Test (premature move blocked with named gaps).
18. ✅ Follow-up task scheduled — business-day cadence from settings, weekend-safe (Test); auto-created on mark-sent (Browser: "Follow-up 1: Priya Nair").
19. ✅ Dashboard from real data — every tile/mission item is a live query; verified empty state → seeded state change in Browser.
20. ✅ Execution mode selects genuine priorities — replies > overdue follow-ups > due today > P1 contactable (to daily target) > research; each item carries its reason + evidence. Browser.
21. ✅ Case-study tracked — full field set, doc generation gated on recorded fields, publish gated on permission, outcomes require after-evidence (action guard). Browser.
22. ✅ Analytics reflect activity — all aggregates computed from tables; low-sample labelling; learning insights recomputed each load. Browser (charts populated post-activity).
23. ✅ Workflows survive refresh — all state server-side; hard-reload verified across pages after each mutation.
24. ✅ Error and empty states — every list/page has designed empty states; app-level error boundary + not-found; action errors surface as toasts/inline. Browser.
25. ✅ Core end-to-end tests pass — 58/58 (unit + `tests/workflow.e2e.test.ts` driving the real action layer over the acceptance spine).
26. ✅ No critical button nonfunctional — every button wires to a server action or navigation; verified per-module during Browser QA; zero placeholder routes (all 22 routes render real data).
27. ✅ Production build succeeds — `npm run build` clean, zero TypeScript errors, ESLint clean.
28. ✅ Deployment instructions accurate — README covers local prod, disk-backed hosts, env vars, backups, and the honest Vercel/Postgres caveat.

## Modules (§5) — all shipped
- ✅ 5.1 Command Centre — live counts, Today's Mission (data-generated, linked), 6 progress targets, recent outcomes
- ✅ 5.2 Lead database — table/cards + kanban, search, 8 filters, saved filters, sort, pagination, bulk actions (stage/priority/delete with validation), CSV export/import
- ✅ 5.3 Warm-list import — auto-map, preview, dupes, suppression check, report, undo, fill-empty-only default
- ✅ 5.4 Research — company snapshot, research items with kinds/confidence/sources, buying signals, pain hypotheses with evidence + rules-based suggestions per ICP
- ✅ 5.5 Explainable scoring — 10 dimensions + configurable weighted overall, breakdowns, missing-info, manual override with reason, recompute
- ✅ 5.6 Outreach intelligence — 16 types, 5 controls, evidence-used, versions, edit/copy/mark-sent, guards, optional labelled AI polish, no auto-send
- ✅ 5.7 Conversation intelligence — timeline, paste reply, conservative classification incl. peer detection, extracted fields, next question + why, reclassify with reason
- ✅ 5.8 Discovery engine — 25 sections, completeness, next-best-question with reason, build gate (7 minimums)
- ✅ 5.9 Opportunity designer — full 26-field spec per category, node/edge diagram with human checkpoints + failure/retry/fallback/audit, estimates, commercial model
- ✅ 5.10 Case-study builder — full tracking + 9 generated documents, evidence-gated claims, publish permission gate
- ✅ 5.11 Pipeline & CRM — 4 connected stage sets (lead/conversation/opportunity/delivery), validated drag-and-drop, stage history
- ✅ 5.12 Follow-up engine — configurable cadence, business days, duplicate-send guard, limits, snooze, DNC auto-stop, escalation of overdue
- ✅ 5.13 Analytics & learning — outreach/pipeline/quality metrics, conversion by type/niche/warmth/channel, lost reasons, honest learning loop (recommend-only)
- ✅ 5.14 Daily execution mode — one-at-a-time, why-this-lead, draft + evidence, 9 action buttons, auto-advance, target/completed/remaining/timer

## Cross-cutting
- ✅ §3 Autism-aware UX — stable layouts, explicit labels, status pills everywhere, predictable nav, step-by-step wizards, explanations on every recommendation
- ✅ §6 Category strategies — per-ICP question banks + pain suggestion banks + peer handling for AI specialists
- ✅ §7 AI architecture — abstraction layer, structured output, Zod validation, retries, timeout, cost logging, redaction, prompt versions, mock mode; deterministic logic for everything §7 requires; human approval on all sends/proposals/publishing
- ✅ §9 DB design — 28 tables, FK integrity, indexes, unique constraints, soft deletes, stage history + activity audit, committed migrations, seed data
- ✅ §10 Security/privacy — auth, per-action authz, validation, rate limiting, secure cookies, no secrets client-side, audit logs, export/delete, suppression, compliance note
- ✅ §11 UX chrome — nav, Ctrl-K palette with search, toasts, accessible native-dialog modals, empty/error states, responsive (mobile checked at 375px)
- ✅ §12 Demo data — 8 representative leads incl. the two modelled conversations (fictional identities), DEMO-badged, one-action load + delete
- ✅ §14 Quality bar — no dead buttons, no fake stats, no TODOs in core flows, no localStorage-only state, evidence-gated claims throughout

# CortexCart Lead Intelligence Engine

The lead-gen brain of CortexCart OS: find ecommerce stores likely to buy CortexCart,
qualify them with buying signals, analyse fit with AI, and manage them through a CRM
funnel — all human-in-the-loop, nothing sends automatically.

This doc maps the full vision against what's **live now**, what each **API key or paid
data source unlocks**, and what's deliberately **staged for later**. The guiding rule:
CortexCart has zero customers, so every build hour goes to whatever produces the next
conversation with a store owner — not to infrastructure.

## What's live now

| Capability | How |
|---|---|
| Discovery | Apollo (people/company search), BuiltWith (tech stack), job-signal scraping — `outreach discover` or the OS Discover button |
| Manual import | Excel (.xlsx/.xls) / CSV upload in the OS, flexible headers, dedup by domain, template download |
| Buying signals | Deterministic scorer: paid-ads pixels, Klaviyo/email stack, subscription tooling, **analytics gap** (marketing stack but no attribution tool — the "why gap"), hiring marketing/CRO roles, social activity, replatforming |
| Tech extraction | Known tools (Klaviyo, Meta Ads, Recharge, Triple Whale…) auto-detected from spreadsheet notes and seeded into the tech stack |
| AI enrichment | Claude: signal extraction + pain-point hypotheses + **fit analysis** (likelihood-to-buy 0–100, best sales angle, likely objections, recommended offer) — mock mode without an API key |
| Scoring | Weighted fit/opportunity/urgency/personalization → 0–100 + tier A–D, every score explained |
| Outreach | Per-channel drafts (email A/B, LinkedIn, X, follow-ups) using the AI sales angle; quality/spam validation; human review queue |
| CRM | Stages: contacted → meeting → demo → proposal → won/lost, hot/warm/cold temperature, follow-up queue, audit trail |
| Search | Natural-language search ("A-tier stores running Meta ads with no attribution") → structured filter; keyword fallback in mock mode |
| Dashboard | CortexCart OS: hub (top opportunities, score distribution, follow-up queue), Sales, Marketing, Finance |

## Unlocks — set a key, get a capability

| Env var | Unlocks | Cost |
|---|---|---|
| `ANTHROPIC_API_KEY` | Real enrichment, fit analysis, drafting, NL search (currently smart mock) | ~£0.01–0.03/lead with Sonnet |
| `APOLLO_API_KEY` | Live contact + company discovery | free tier, then from ~$49/mo |
| `BUILTWITH_API_KEY` | Real tech-stack detection (pixels, Klaviyo, attribution tools) — powers the why-gap signal at scale | from ~$295/mo (batch alternative: one-off lookups) |
| `HUNTER_API_KEY` | Email finding + verification | free tier, then from ~$34/mo |
| `WEBHOOK_AUTH_TOKEN` | Locks the API/dashboard for deployed use | — |

## Deliberately not built (and why)

- **Next.js/Supabase/Redis/vector-DB rewrite** — the Hono + SQLite stack handles
  thousands of leads on a laptop or Railway. Rebuild cost: months. Extra trials: zero.
  Revisit only if this becomes a multi-tenant product (V3).
- **LinkedIn/Glassdoor/Instagram scraping** — no compliant API; account-ban and ToS
  risk. Hiring signals come from job boards instead; social handles are stored for
  manual warm-up.
- **23 data sources** — Apollo + BuiltWith + Hunter + manual import cover
  discovery, tech, and contact. Each extra source adds cost and dedup noise before it
  adds conversations.
- **Automated sending** — drafts export to clipboard/CSV/n8n. A human presses send.
  This is both compliance (CAN-SPAM/GDPR, see COMPLIANCE.md) and deliverability sense
  at cold-start volume.

## V2 — when there are >1,000 leads and real trials (roughly days 30–90)

1. **StoreLeads** (~$75/mo) — the one paid source worth adding first: revenue-ranked
   Shopify store lists with app data; plugs into the existing connector interface.
2. **Signal monitor** — scheduled re-check of A/B-tier leads (BuiltWith re-scan diff,
   job postings, product launches) writing change events to the audit log +
   follow-up queue. The `n8n-templates/daily-discovery.json` flow is the scheduler.
3. **Reply tracking** — IMAP/webhook inbound so `replied` sets itself.
4. **Meta Ad Library checks** — free API, per-lead "is running ads right now"
   verification before drafting.
5. **Draft A/B outcome loop** — track which sales angles get replies; feed winners
   back into the fit-analysis prompt.

## V3 — only if CortexCart wants this as a product

Multi-tenant version of this engine sold to agencies/SaaS ("lead intelligence for
your ICP"): that's when Postgres, queues, auth, per-tenant ICP config, and the
enterprise architecture become the right build. The module boundaries here
(connectors / scoring / enrichment / crm / server) are already shaped for that lift.

## Signal taxonomy reference

Scored deterministically in `src/scoring/` (no LLM):

- **Fit**: Shopify confirmed, catalog size, email-marketing stack, subscription tooling, review volume
- **Opportunity**: running paid ads, **analytics gap**, fragmented app stack, manual processes, multi-channel
- **Urgency**: hiring marketing/CRO/ecommerce roles, recent growth/funding, social activity, replatforming
- **Negative**: brand-new store, single product, already has attribution tooling (lower likelihood, not exclusion)

AI-assessed in `src/prompts/fit-analysis.ts` (LLM): likelihood-to-buy, growth stage,
marketing sophistication, pain points, sales angle, objections, recommended offer.

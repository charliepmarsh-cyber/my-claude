# CortexCart OS

A single dashboard over the lead engine that runs CortexCart's go-to-market as departments: **Sales** (the lead-gen pipeline), **Marketing** (campaign assets + content generation), and **Finance** (targets, burn, pipeline value). Everything is served by the existing webhook server — no new infrastructure.

## Run it

```bash
npm run serve          # starts server + dashboard on port 3847
# open http://localhost:3847/
```

No `ANTHROPIC_API_KEY`? Everything still works — enrichment, drafting, and marketing generation fall back to the smart mock LLM so the whole OS is demoable offline. Set the key in `.env` for real Claude output.

If `WEBHOOK_AUTH_TOKEN` is set (e.g. on Railway), paste the same token into the field in the dashboard header — it's stored in localStorage and sent as a Bearer token on every API call. The dashboard HTML itself is public; all data endpoints are behind the token.

## Departments

### Hub (`/`)
Campaign banner (positioning, offer, ICP) + one card per department with its key number. Cards click through to the department.

### Sales
The core. Backed by the full existing pipeline (Apollo / BuiltWith / job-signal discovery → LLM enrichment → deterministic ICP scoring → per-channel drafting → review queue).

- **Discover leads** — runs connector discovery for a segment, then the full pipeline, as a background job.
- **Import Excel/CSV** — upload a spreadsheet of leads (flexible headers: "Company", "Email", "Notes"…); tools mentioned in notes ("uses Klaviyo, running Meta ads") are auto-detected into the tech stack so buying signals fire. Dedup by domain; optional auto-process.
- **Process pipeline** — enriches `new` leads (incl. AI fit analysis), scores `enriched`, drafts `scored` (≥30), queues `drafted` for review.
- **Ask (natural-language search)** — "A-tier stores running Meta ads with no attribution" → interpreted filter over the lead base.
- **Funnel** — live counts per pipeline status, plus a CRM row (contacted → meeting → demo → proposal → won/lost).
- **Lead table** — filter by status/tier/search; Buy % column from the AI fit analysis; click a row for the detail drawer: AI fit card (likelihood, sales angle, objections, offer), temperature (hot/warm/cold), CRM stage buttons, score explanation, all drafts (copy buttons), audit trail, and review actions.

Nothing is ever auto-sent. Approval marks a lead ready for export (`/webhook/export` or CSV) — sending stays manual or via n8n; "Mark sent" then tracks it through the CRM funnel.

See **[LEAD-INTELLIGENCE.md](LEAD-INTELLIGENCE.md)** for the full signal taxonomy, data-source strategy, and V2/V3 roadmap.

### Marketing
- **Asset index** — lists the shipped campaign assets (hero film, cuts, stills, VO) from `CAMPAIGN_ASSETS_DIR` (default: `C:/Users/charl/Desktop/cortexcart-campaign`).
- **Content generator** — Claude-generated, stored in SQLite:
  - `social_post` — LinkedIn/X posts on the "Stop Guessing. Start Growing." angle
  - `outreach_angle` — reusable cold-open patterns for the sales pipeline
  - `higgsfield_prompts` — kling b-roll shot prompts extending the three-beat brand film

### Finance
Pipeline-value model over live lead tiers: `projected trials = Σ tier count × tier trial rate`, then trial→paid rate × £29/mo → projected MRR/ARR. Targets, actuals, tool costs, and all model assumptions are editable in the UI and persisted in the `os_kv` table.

## API (`/api/os/*`, bearer-auth like `/webhook/*`)

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/os/overview` | GET | Hub numbers: campaign, sales funnel, marketing counts, finance summary, recent jobs |
| `/api/os/leads` | GET | Lead summaries; `?status=&tier=&q=` |
| `/api/os/leads/:id` | GET | Full lead + audit trail |
| `/api/os/leads/:id/review` | POST | `{action: approve\|edit\|reject\|snooze\|not_a_fit, notes?}` |
| `/api/os/leads/:id/stage` | POST | CRM move: `{stage: sent\|contacted\|meeting_booked\|demo\|proposal\|won\|lost, notes?}` |
| `/api/os/leads/:id/temperature` | POST | `{temperature: hot\|warm\|cold}` |
| `/api/os/search` | POST | Natural-language search: `{query}` → interpreted filter + matching leads |
| `/api/os/import` | POST | Multipart Excel/CSV upload: `file`, `segment?`, `runPipeline?` |
| `/api/os/import/template` | GET | Downloadable CSV template (Excel-friendly) |
| `/api/os/run/discover` | POST | `{segment, maxLeads}` → background discovery job |
| `/api/os/run/process` | POST | Background job: enrich → score → draft → queue |
| `/api/os/jobs` | GET | Job history |
| `/api/os/marketing` | GET | Asset index + content library |
| `/api/os/marketing/generate` | POST | `{kind, topic?, count}` → Claude-generated content |
| `/api/os/marketing/content/:id` | DELETE | Remove content item |
| `/api/os/finance` | GET | Full finance summary |
| `/api/os/finance` | PUT | Save targets/actuals/costs/assumptions |

## Files

- `src/os/campaign.ts` — active campaign definition (product, positioning, ICP) — single source of truth for the OS
- `src/os/os-store.ts` — `os_kv` + `marketing_content` tables (created lazily in the existing SQLite DB)
- `src/os/marketing.ts` — asset indexer + content generators
- `src/os/finance.ts` — settings schema + pipeline-value model
- `src/server/routes/os.ts` — the API above
- `public/index.html` — the dashboard (single file, no build step)

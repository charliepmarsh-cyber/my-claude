# Outreach Agent — Architecture

## System Overview

A modular, CLI-first lead discovery and outreach drafting system built with TypeScript. Designed for a human-in-the-loop workflow where Claude Code handles enrichment and drafting, while a human reviews and approves all messages before sending.

```
CSV/JSON Input
     │
     ▼
┌─────────────┐
│   Ingest     │  Parse, normalize, deduplicate
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Enrich     │  LLM-powered signal extraction (Claude API)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│    Score     │  Deterministic ICP-based scoring (no LLM)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│    Draft     │  LLM-powered message generation (Claude API)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Validate   │  Spam/quality/length checks (no LLM)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Review     │  Human approval queue
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Send/Log    │  Export or send via integrations
└─────────────┘
```

## Module Responsibilities

| Module | Path | Uses LLM? | Purpose |
|--------|------|-----------|---------|
| Types | `src/types/` | No | Zod schemas and TypeScript types |
| Connectors | `src/connectors/` | No | CSV/JSON import/export |
| Storage | `src/storage/` | No | SQLite persistence + audit log |
| Scoring | `src/scoring/` | No | ICP definitions + deterministic scoring |
| Enrichment | `src/enrichment/` | **Yes** | LLM-powered signal extraction |
| Personalization | `src/personalization/` | No | Signal→pain point mapping (rule-based) |
| Outreach | `src/outreach/` | **Yes** | LLM-powered message drafting |
| Quality | `src/quality/` | No | Validation rules, spam detection |
| Review | `src/review/` | No | Status management, approval workflow |
| Prompts | `src/prompts/` | — | Prompt templates for LLM calls |
| Pipelines | `src/pipelines/` | — | Orchestration of the full flow |
| Lib | `src/lib/` | — | Shared utilities (logging, rate limiting, dedup, LLM client) |
| CLI | `src/cli.ts` | — | Command-line interface |

## What Claude Code Handles Directly

- **Enrichment**: Analyzing company data to extract structured signals
- **Pain point inference**: Identifying likely automation opportunities
- **Message drafting**: Generating personalized outreach per channel
- **Follow-up generation**: Creating follow-up sequences

## Where n8n Plugs In (Optional)

- **Scheduled imports**: Trigger `outreach ingest` on a schedule
- **Webhook listener**: Accept leads from external sources
- **CRM sync**: Push approved leads to CRM
- **Notifications**: Alert when review queue has items
- **Sending**: Dispatch approved messages via email/LinkedIn APIs
- **Enrichment triggers**: Watch for new leads and trigger enrichment

## Key Design Decisions

1. **Scoring is deterministic** — no LLM needed. Pure functions that map signals to scores. Testable, predictable, fast.
2. **LLM calls are isolated** — only enrichment and drafting use the API. Everything else is rule-based.
3. **Human-in-the-loop by default** — messages are drafted, never auto-sent. Review queue enforces this.
4. **Modular pipeline** — each step can run independently (`enrich`, `score`, `draft`) or as a full pipeline.
5. **SQLite for MVP** — simple, embedded, no server needed. The schema supports migration to Postgres later.

## Data Flow

```
Lead CSV/JSON → Ingest → SQLite (status: "new")
                           │
                    Enrich (LLM) → SQLite (status: "enriched")
                           │
                    Score (deterministic) → SQLite (status: "scored")
                           │
               ┌───────────┴───────────┐
               │  Score < threshold?    │
               │  Yes → skip drafting   │
               │  No  → continue        │
               └───────────┬───────────┘
                           │
                    Draft (LLM) → SQLite (status: "drafted")
                           │
                    Validate (rules) → quality scores on each draft
                           │
                    Queue → SQLite (status: "review_pending")
                           │
                    Human Review → approve / edit / reject / snooze
                           │
                    Export → CSV/JSON for sending
```

## Rate Limiting

- Token-bucket rate limiter for LLM calls (default: 20/min)
- Configurable via `LLM_RATE_LIMIT` env var
- Each enrichment = 2 LLM calls (enrichment + pain points)
- Each drafting = up to 5 LLM calls (depending on channels)
- For 100 leads at 20/min: ~50 minutes for full pipeline

## Audit Trail

Every lead status change is logged in the `audit_log` table:
- lead_id, action, details, timestamp
- Enables traceability for compliance review

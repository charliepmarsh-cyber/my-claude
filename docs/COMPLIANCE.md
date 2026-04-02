# Safety, Compliance & Platform-Aware Design

## Core Principles

1. **Public data only** — All enrichment uses publicly available information or data the user provides directly.
2. **No unauthorized scraping** — No automated scraping of LinkedIn, X, or other platforms that prohibit it.
3. **Human-in-the-loop** — All messages are drafts until explicitly approved by a human.
4. **Audit trail** — Every action is logged with timestamps.
5. **Rate limiting** — Built-in rate limits for LLM calls; platform-specific sending limits are the user's responsibility.

## Data Sources

| Source | Compliance Status | Notes |
|--------|-------------------|-------|
| CSV imports from user | Compliant | User provides and is responsible for data origin |
| Public company websites | Compliant | Publicly accessible information |
| Job postings | Compliant | Publicly listed positions |
| LLM enrichment of provided data | Compliant | Analysis of user-provided info, no external data fetched |
| LinkedIn scraping | **Not supported** | Would violate ToS — use manual research or Sales Navigator exports |
| Email verification services | **User's responsibility** | If used, ensure the service is CAN-SPAM/GDPR compliant |

## Platform-Specific Rules

### LinkedIn
- Connection notes: max 300 characters
- Messages: keep under 1,000 characters
- Don't automate sending — use the drafts for manual outreach
- Respect connection limits (typically ~100/week)

### X (Twitter)
- DMs: respect character limits
- Don't mass-DM — engagement-first strategy
- X DMs should be reserved for warm connections
- Use engagement ideas as a pre-DM warming strategy

### Email
- Include unsubscribe mechanism in production sends
- Comply with CAN-SPAM (US), GDPR (EU), CASL (Canada)
- Don't send from domains without proper DNS records (SPF, DKIM, DMARC)
- Keep initial sends low-volume and monitor deliverability

## Data Handling

- No PII is stored beyond what the user provides in lead imports
- Database is local SQLite — no cloud storage by default
- Export files should be treated as confidential business data
- No data is sent to third parties except the Claude API for enrichment/drafting

## What the System Does NOT Do

- Does NOT scrape websites, LinkedIn, or social media
- Does NOT send messages automatically
- Does NOT verify email addresses (use a separate tool if needed)
- Does NOT bypass platform access controls
- Does NOT collect or store passwords or authentication tokens
- Does NOT make claims about having used or purchased from prospects
- Does NOT use manipulative urgency tactics in messages

## Quality Controls

The validation system catches:
- Spammy language ("10x growth", "game-changer", etc.)
- Generic non-personalized messages
- Unverifiable claims ("I've used your product")
- Messages that exceed platform character limits
- Missing personalization signals
- Duplicate/near-duplicate messages across leads

## Recommendations for Users

1. **Warm up email domains** before sending outreach at volume
2. **Start with LinkedIn** engagement before DMs
3. **Send manually** for the first 50-100 messages to calibrate
4. **Review every draft** before sending — the AI provides drafts, not final copy
5. **Track responses** and feed learnings back into scoring/personalization
6. **Respect opt-outs** immediately and permanently

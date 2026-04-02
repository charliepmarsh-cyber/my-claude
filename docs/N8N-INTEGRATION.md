# n8n Integration Guide

The outreach agent is designed to work standalone via CLI, but n8n can optionally orchestrate scheduling, notifications, and sending.

## Integration Points

### 1. Scheduled Lead Import
```
[Schedule Trigger] → [HTTP Request: fetch CSV from Google Sheets/Airtable]
                   → [Execute Command: outreach pipeline <file>]
                   → [IF: new leads queued] → [Slack/Email notification]
```

### 2. Webhook Lead Ingestion
```
[Webhook Trigger] → [Write JSON to /data/incoming/]
                   → [Execute Command: outreach ingest <file>]
                   → [Execute Command: outreach pipeline --skip-enrich <file>]
```

### 3. Review Notifications
```
[Schedule Trigger: every hour] → [Execute Command: outreach review]
                                → [IF: pending > 0] → [Slack message with count]
```

### 4. CRM Sync (Post-Approval)
```
[Schedule Trigger] → [Execute Command: outreach export --status approved /tmp/approved.json]
                   → [Read JSON] → [For each lead]
                   → [HubSpot/Airtable/Notion: create/update contact]
```

### 5. Email Sending (Post-Approval)
```
[Webhook: approve event] → [Read lead JSON]
                          → [Extract email draft]
                          → [SendGrid/Resend: send email]
                          → [Execute Command: outreach review --mark-sent <id>]
```

### 6. LinkedIn Prep (Post-Approval)
```
[Schedule: daily 9am] → [Export approved LinkedIn drafts]
                       → [Google Sheets: append rows for manual sending]
                       → [Slack: "5 LinkedIn messages ready to send"]
```

## Example n8n Flow JSON

```json
{
  "name": "Outreach Agent - Daily Pipeline",
  "nodes": [
    {
      "name": "Schedule",
      "type": "n8n-nodes-base.scheduleTrigger",
      "parameters": {
        "rule": { "interval": [{ "field": "hours", "hoursInterval": 24 }] }
      }
    },
    {
      "name": "Run Pipeline",
      "type": "n8n-nodes-base.executeCommand",
      "parameters": {
        "command": "cd /path/to/outreach-agent && npx tsx src/cli.ts pipeline data/samples/sample-leads.csv"
      }
    },
    {
      "name": "Check Queue",
      "type": "n8n-nodes-base.executeCommand",
      "parameters": {
        "command": "cd /path/to/outreach-agent && npx tsx src/cli.ts stats"
      }
    },
    {
      "name": "Notify Slack",
      "type": "n8n-nodes-base.slack",
      "parameters": {
        "channel": "#outreach",
        "text": "Outreach pipeline complete. Check review queue."
      }
    }
  ]
}
```

## Webhook Endpoint for n8n

To receive leads from n8n via webhook, the agent can watch a directory:

```bash
# n8n sends POST to a simple Express endpoint (future V2 feature)
# For MVP: n8n writes JSON files to data/incoming/ and triggers CLI
```

## Key Principle

**Claude Code is the brain. n8n is the scheduler and connector.**

- All enrichment, scoring, drafting logic stays in the TypeScript codebase
- n8n handles timing, external API calls, notifications
- This keeps the core logic testable and the orchestration configurable

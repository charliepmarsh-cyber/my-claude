# Iteration Plan

## MVP (v0.1) — Current
- [x] TypeScript project with Zod-validated data models
- [x] CSV/JSON ingestion
- [x] LLM-powered enrichment (signal extraction + pain point inference)
- [x] Deterministic ICP scoring (Shopify, ecommerce, enterprise)
- [x] LLM-powered outreach drafting (LinkedIn, X, email)
- [x] Rule-based personalization engine
- [x] Quality validation (spam, generic, unverifiable checks)
- [x] Human review queue with status management
- [x] SQLite storage with audit logging
- [x] CLI interface
- [x] Sample data with 3 demo leads
- [x] Unit tests for scoring, validation, personalization

## V2 — Signal Depth & Workflow
- [ ] Web enrichment: fetch and analyze public company pages
- [ ] LinkedIn profile parsing (from manual exports)
- [ ] Follow-up sequence generation (email #2, #3)
- [ ] Snooze scheduler: resurface snoozed leads on target date
- [ ] Airtable/Google Sheets sync connector
- [ ] n8n webhook endpoint for real-time lead ingestion
- [ ] Batch processing with progress tracking
- [ ] HTML email template rendering
- [ ] A/B variant generation for email subject lines
- [ ] Export to LinkedIn connection import format

## V3 — Intelligence & Scale
- [ ] Reply tracking and outcome logging
- [ ] Scoring model tuning based on reply/conversion data
- [ ] Multi-sequence campaigns with conditional branching
- [ ] CRM integration (HubSpot, Pipedrive)
- [ ] Dashboard / web UI for review queue
- [ ] Team collaboration: assign leads to team members
- [ ] Analytics: conversion rates by segment, channel, message type
- [ ] Improved enrichment: competitor analysis, tech stack detection
- [ ] Lead source scoring: track which sources produce best leads
- [ ] Postgres migration for multi-user support

## V4 — Platform
- [ ] REST API for external integrations
- [ ] Real-time enrichment on lead ingest
- [ ] Custom ICP builder UI
- [ ] Prompt optimization based on reply quality
- [ ] Multi-language outreach support
- [ ] Territory/account management
- [ ] Compliance dashboard with data source audit trail

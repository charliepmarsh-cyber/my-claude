# PulseCommerce Business Operating System

Complete playbook for running PulseCommerce as a productised Upwork service generating GBP10k+/month.

---

## 1. PRODUCTISED OFFER STRUCTURE

### Tier Breakdown

#### STARTER - GBP1,500 one-time + GBP200/mo retainer

**Included:**
- Shopify data ingestion (orders, products, revenue)
- 1 additional channel (pick one: Google Ads OR Mailchimp OR Social)
- Revenue Overview dashboard (KPI cards + 30-day revenue chart)
- Channel Performance page (revenue/orders by channel + device split)
- Basic white-label (client logo + brand colors)
- Docker deployment on client's VPS (Railway/Render/DigitalOcean)

**NOT included:**
- SKU-level analytics
- Attribution tracking
- AI referral detection
- AI assistant
- Amazon integration
- Custom reporting

**Time to deliver:** 5-7 calendar days (8-12 actual hours of work)

**Reuse ratio:** 95% template, 5% custom (API keys + branding)

---

#### GROWTH - GBP3,500 one-time + GBP400/mo retainer

**Included:**
- Everything in Starter
- Shopify + 3 channels (Google Ads + Mailchimp + Social)
- SKU-level product analytics (views, ATC, sales, revenue, conv rate)
- Multi-touch attribution with visitor journey timeline
- Basic AI assistant (3 pre-built queries: revenue, top product, ad performance)
- Email campaign performance cards
- Google Ads deep-dive (ROAS, CTR, CPC)

**NOT included:**
- AI referral tracking
- Full conversational AI (unlimited queries)
- Amazon SP-API integration
- Custom attribution models
- API access for client's dev team

**Time to deliver:** 10-14 calendar days (20-30 actual hours)

**Reuse ratio:** 85% template, 15% custom (channel configs + data mapping)

---

#### ENTERPRISE - GBP6,000 one-time + GBP800/mo retainer

**Included:**
- Everything in Growth
- All 5 channels (Shopify + Amazon + Google Ads + Mailchimp + Social)
- Full conversational AI assistant (unlimited queries, all data modules)
- AI referral tracking (ChatGPT, Perplexity, Claude, Gemini, Copilot)
- Full attribution engine with journey visualization
- White-label with custom domain
- Priority support (48hr response)
- Monthly insights report (AI-generated)

**Time to deliver:** 3-4 weeks (40-60 actual hours)

**Reuse ratio:** 80% template, 20% custom (Amazon SP-API mapping, custom onboarding)

---

### Scope Boundaries (Anti-Scope-Creep Rules)

| Request | Response |
|---------|----------|
| "Can you add a custom report?" | "Custom reporting is a GBP500 add-on. I can scope it separately." |
| "Can you connect to [random tool]?" | "Additional integrations are GBP800-1,500 each. Let's discuss after v1 is live." |
| "Can you change the dashboard layout?" | "Layout customization is included in the retainer. I'll handle it in the next monthly cycle." |
| "Can you build a mobile app?" | "That's a separate project. PulseCommerce is web-first with responsive design." |
| "Can you add user management for my team?" | "Multi-user is Enterprise only. Upgrade path available." |

### Fast Delivery (MVP) vs Premium

**MVP (what ships on day 1):**
- Working dashboard with real data flowing
- All included pages functional
- Demo data pre-loaded for instant wow factor
- Basic branding applied

**Premium (what ships in retainer month 1-2):**
- Fine-tuned AI assistant prompts based on client's actual data
- Custom KPI thresholds and alerts
- Historical data backfill
- Performance optimization

---

## 2. SYSTEM ARCHITECTURE (REUSABLE vs CUSTOM)

### Base Template System

```
pulsecommerce-template/
|
|-- database/
|   |-- schema.sql              # 100% REUSABLE - never changes
|   |-- seed-demo.sql           # REUSABLE - used for demos/sales calls
|   |-- migrations/             # REUSABLE - versioned schema updates
|
|-- n8n-workflows/
|   |-- shopify-ingestion.json      # 100% REUSABLE (tenant_id parameterized)
|   |-- ai-referral-detection.json  # 100% REUSABLE
|   |-- attribution-engine.json     # 100% REUSABLE
|   |-- google-ads-ingestion.json   # 100% REUSABLE
|   |-- mailchimp-ingestion.json    # 100% REUSABLE
|   |-- dashboard-api.json          # 100% REUSABLE
|   |-- ai-assistant.json           # 95% REUSABLE (system prompt tweaked per client)
|   |-- tenant-onboarding.json      # 100% REUSABLE
|
|-- frontend/
|   |-- src/
|   |   |-- components/         # 100% REUSABLE
|   |   |-- pages/              # 100% REUSABLE
|   |   |-- hooks/              # 100% REUSABLE
|   |   |-- api/                # 100% REUSABLE
|   |   |-- auth/               # 100% REUSABLE
|   |-- public/
|   |   |-- assets/             # CUSTOM per client (logo, favicon)
|
|-- config/
|   |-- whitelabel.json         # CUSTOM per client (colors, name, logo)
|   |-- feature-flags.json      # Controls tier features (starter/growth/enterprise)
|
|-- scripts/
|   |-- onboard-client.sh       # 100% REUSABLE
|   |-- deploy.sh               # 95% REUSABLE
|
|-- docker-compose.yml          # 95% REUSABLE (env vars change)
|-- .env.example                # Template - CUSTOM values per client
```

### What Gets Parameterized Per Client

```json
{
  "tenant": {
    "name": "ClientBrand",
    "slug": "clientbrand",
    "plan": "growth",
    "currency": "GBP"
  },
  "api_keys": {
    "shopify_store_url": "clientbrand.myshopify.com",
    "shopify_access_token": "shpat_xxx",
    "google_ads_client_id": "xxx",
    "mailchimp_api_key": "xxx-usXX",
    "mailchimp_list_id": "xxx"
  },
  "branding": {
    "appName": "ClientBrand Analytics",
    "primaryColor": "#3b82f6",
    "sidebarColor": "#1a1f36",
    "logoPath": "/assets/client-logo.svg"
  },
  "features": {
    "sku_analytics": true,
    "attribution": true,
    "ai_assistant": true,
    "ai_referrals": false,
    "amazon": false
  }
}
```

### New Client Deployment in Under 2 Hours

**Step 1 (5 min):** Clone template repo
```bash
git clone pulsecommerce-template client-clientbrand
cd client-clientbrand
```

**Step 2 (10 min):** Run onboarding script
```bash
./scripts/onboard-client.sh
# Prompts for: brand name, Shopify URL, API keys, plan tier
# Auto-generates: .env, whitelabel.json, feature-flags.json
```

**Step 3 (15 min):** Deploy infrastructure
```bash
docker-compose up -d
# Postgres boots with schema
# n8n starts and auto-imports workflows
# Frontend builds with client branding
```

**Step 4 (10 min):** Import n8n workflows + activate
```bash
./scripts/import-workflows.sh
# Imports all workflow JSONs into n8n
# Activates workflows based on plan tier
# Triggers initial Shopify data sync
```

**Step 5 (15 min):** Verify data flow
- Check n8n execution log
- Verify orders appearing in database
- Load dashboard and confirm KPIs populate

**Step 6 (5 min):** Send client credentials
- Dashboard URL
- Login email + temporary password
- Quick-start guide PDF

**Total: ~60 minutes for Starter, ~90 minutes for Growth**

---

## 3. CLIENT ONBOARDING SYSTEM

### Pre-Onboarding Questionnaire (Send Before Discovery Call)

**Required from client:**
1. Shopify store URL (e.g., yourbrand.myshopify.com)
2. Which channels are you actively selling on? (checkboxes: Amazon, Google Ads, Mailchimp/Email, Social)
3. Monthly revenue range (helps set expectations)
4. Current analytics tools (GA4, Triple Whale, etc.)
5. Biggest analytics frustration (open text)

**Auto-detected (no client input needed):**
- Shopify store theme/platform version (from store URL)
- Whether store has custom domain
- Active sales channels visible in Shopify admin
- Approximate traffic level (from SimilarWeb/free tools during discovery)
- Social media presence (Instagram/Facebook/TikTok links from store footer)

### API Key Collection Process

**Shopify (required for all tiers):**
1. Send client Loom video: "How to create a Shopify Custom App in 3 minutes"
2. Required scopes: `read_orders`, `read_products`, `read_analytics`, `read_customers`
3. Client sends back: Store URL + Access Token
4. You validate: Hit `GET /admin/api/2024-01/shop.json` - if 200, good to go

**Google Ads (Growth + Enterprise):**
1. Send client doc: "How to grant Google Ads API access"
2. Client shares: Customer ID, grants your MCC access
3. You validate: Pull yesterday's campaign data - if rows returned, good

**Mailchimp (Growth + Enterprise):**
1. Client generates API key in Mailchimp > Account > API Keys
2. Client sends: API key + primary list ID
3. You validate: Hit `GET /lists/{list_id}` - if 200 with subscriber count, good

**Amazon SP-API (Enterprise only):**
1. Most complex - budget 30 min for this
2. Client registers as SP-API developer
3. OAuth flow to grant your app access
4. You validate: Pull recent orders

### Validation Automation (n8n workflow)

```
Trigger: POST /api/validate-keys

For each provided API key:
  1. Make test API call
  2. Check response status
  3. Return: { "shopify": "valid", "google_ads": "invalid - check permissions", ... }
```

### Onboarding Timeline by Tier

**Starter (5-7 days):**
- Day 1: Receive API keys, validate, deploy infrastructure
- Day 2-3: Shopify data sync + verify data accuracy
- Day 4: Connect second channel + verify
- Day 5: Apply branding, test dashboard end-to-end
- Day 6: Client demo call (30 min)
- Day 7: Go live + send documentation

**Growth (10-14 days):**
- Day 1-2: Receive + validate all API keys, deploy infrastructure
- Day 3-5: All channel data syncing + verify accuracy
- Day 6-7: SKU analytics + attribution engine live
- Day 8-9: AI assistant setup + prompt tuning
- Day 10: Client demo call (45 min)
- Day 11-12: Feedback round + adjustments
- Day 13-14: Go live + documentation + training video

**Enterprise (3-4 weeks):**
- Week 1: Full infrastructure + all channels connected
- Week 2: Attribution + AI referral tracking live + AI assistant tuned
- Week 3: Testing, optimization, historical backfill
- Week 4: Client training + go live + handover documentation

---

## 4. UPWORK SALES ENGINE

### ICP Targeting Rules

**ACCEPT (high-conversion signals):**
- Shopify brand mentioning "analytics" or "reporting" in job post
- Revenue GBP50k-500k/mo (sweet spot for perceived value)
- Multi-channel sellers (Shopify + Amazon, or Shopify + Ads)
- Posts mentioning: "dashboard", "data", "attribution", "ROAS", "KPIs"
- DTC brands with 5+ employees (has budget)
- Posts with budget GBP1,000-10,000

**REJECT (time wasters):**
- Dropshipping stores under GBP10k/mo (can't afford retainer)
- "I need a simple Shopify report" (too small)
- Price-focused buyers ("cheapest option")
- Vague requirements with no budget mentioned
- Clients wanting hourly rate under GBP30/hr
- "I need someone to fix my Google Analytics" (wrong service)

### Proposal Template 1: Fast Pitch (60 words)

```
Hi [Name],

I build PulseCommerce -- a custom analytics dashboard that unifies your 
Shopify + [their channels] data into one view with an AI assistant 
that answers questions about your business.

I have a live demo I can show you in 15 minutes.

No templates. Custom-built for your brand. Working system in 7 days.

Want me to send the demo link?
```

### Proposal Template 2: Authority Pitch (150 words)

```
Hi [Name],

I noticed you're running [Shopify + channels they mentioned]. I built 
PulseCommerce specifically for brands like yours -- it connects all 
your sales channels into one intelligent dashboard.

Here's what makes it different from GA4 or Triple Whale:

- AI referral tracking: I can show you exactly how much revenue 
  ChatGPT and Perplexity are driving to your store. No other tool 
  does this.
- Conversational AI: Ask "How are my ads performing?" and get an 
  instant answer with real numbers from your data.
- Full attribution: See every touchpoint from first click to purchase.

I deployed this for a brand doing GBP[X]k/mo and within the first week 
they discovered 12% of their traffic was coming from AI sources they 
weren't tracking.

I have a working demo with real data. 15-minute call?

[Your name]
```

### Proposal Template 3: Premium Pitch (200 words, GBP3k-6k positioning)

```
Hi [Name],

You're leaving money on the table.

I've been building analytics systems for Shopify brands doing 
GBP50k-500k/month, and every single one had the same problem: they 
were making decisions based on incomplete data scattered across 6 
different dashboards.

I built PulseCommerce to fix this. It's not a template or a plugin -- 
it's a custom intelligence system that:

1. Unifies every revenue source (Shopify, Amazon, Google Ads, 
   Mailchimp, Social) into real-time KPIs
2. Tracks the FULL buyer journey with multi-touch attribution
3. Has an AI assistant that answers business questions using YOUR live 
   data
4. Tracks AI referral revenue (ChatGPT, Perplexity, Claude) -- a 
   channel growing 300%+ YoY that nobody else is measuring

The system deploys in 2-4 weeks. You own the infrastructure. No 
vendor lock-in. No monthly SaaS fees beyond hosting.

Brands I've deployed this for have:
- Found 8-15% of revenue was mis-attributed
- Discovered AI traffic they didn't know existed
- Cut reporting time from hours/week to seconds

I'll show you a live demo with real data on a 15-minute call.

[Your name]
```

### First Reply After They Respond

```
Great to hear from you, [Name].

Here's what I suggest:

1. I'll send you a link to the live PulseCommerce demo so you can 
   click around before we talk (no commitment needed)
2. We hop on a 15-min call where I ask about your current channels 
   and data setup
3. I'll scope out exactly what your build would include and send a 
   fixed-price proposal

What works better for you -- [Day] or [Day]?

Demo link: [your demo URL]
```

### Call Booking Script (15-min Discovery)

**Agenda:**
1. (2 min) "Tell me about your brand and what channels you sell on"
2. (3 min) "What are you using for analytics right now? What's frustrating about it?"
3. (5 min) Share screen of demo dashboard, highlight their pain points
4. (3 min) "Based on what you've told me, here's what I'd recommend: [Starter/Growth/Enterprise]"
5. (2 min) "I can have this live in [X] days. Want me to send the proposal?"

**Key objection handling during call:**
- "That's expensive" -> "It's a one-time build. Triple Whale costs GBP300-600/month forever. This pays for itself in 3-6 months."
- "I'll think about it" -> "Totally fair. I'll send the proposal with the demo link so you can review when ready."
- "Can you do it cheaper?" -> "I can offer the Starter tier at GBP1,500 which gets you the core dashboard in 7 days."

---

## 5. DELIVERY PLAYBOOK

### 7-Day Plan (Starter Tier)

| Day | Task | Hours | Deliverable |
|-----|------|-------|-------------|
| 1 | Validate API keys, clone template, deploy Docker stack | 2h | Infrastructure live |
| 2 | Configure Shopify ingestion, run first sync | 1.5h | Real data flowing |
| 3 | Connect second channel, verify data accuracy | 1.5h | All channels live |
| 4 | Apply branding (logo, colors, app name) | 1h | Branded dashboard |
| 5 | End-to-end testing, fix any data discrepancies | 1.5h | QA complete |
| 6 | Client demo call + collect feedback | 1h | Client approval |
| 7 | Apply feedback, go live, send docs | 1.5h | DELIVERED |
| **Total** | | **10h** | |

### 14-Day Plan (Growth Tier)

| Day | Task | Hours | Deliverable |
|-----|------|-------|-------------|
| 1-2 | Deploy infrastructure, validate all API keys | 3h | Stack live |
| 3-4 | Shopify + Google Ads + Mailchimp ingestion running | 4h | Data flowing |
| 5-6 | Verify all data, fix channel mapping | 3h | Clean data |
| 7-8 | SKU analytics + product metrics populating | 3h | Products page live |
| 9-10 | Attribution engine + visitor journeys | 4h | Attribution page live |
| 11 | AI assistant setup + 3 pre-built queries | 2h | AI working |
| 12 | Branding + end-to-end QA | 2h | Polished |
| 13 | Client demo call (45 min) + feedback | 1.5h | Approval |
| 14 | Apply feedback, go live, send docs + training | 2.5h | DELIVERED |
| **Total** | | **25h** | |

### 30-Day Plan (Enterprise Tier)

| Week | Task | Hours | Deliverable |
|------|------|-------|-------------|
| 1 | Deploy, all 5 channels connected, data verified | 12h | Full data pipeline |
| 2 | Attribution + AI referrals + AI assistant tuned | 15h | All features live |
| 3 | Historical backfill, optimization, edge cases | 10h | Production-ready |
| 4 | Client training, documentation, go live | 8h | DELIVERED |
| **Total** | | **45h** | |

### Highest Leverage Actions (Do First)

1. **Get Shopify data flowing** -- client sees real numbers immediately = instant trust
2. **Apply branding** -- makes it feel "theirs" even if data is still populating
3. **Demo with real data** -- never demo with demo data if real data is available

### What to Delay

- Historical backfill (nice-to-have, do in retainer period)
- Fine-tuning AI assistant prompts (iterate based on what client actually asks)
- Social media metrics (lowest value, most API headaches)
- Mobile optimization (desktop-first for analytics dashboards)

---

## 6. PROFIT EXPANSION

### Monthly Retainer Breakdown

**GBP200/mo (Starter):**
- Infrastructure monitoring (automated alerts)
- Bug fixes
- Minor dashboard tweaks (1-2 per month)
- Data sync monitoring
- ~1 hour of actual work/month (90% margin)

**GBP400/mo (Growth):**
- Everything in Starter
- AI assistant prompt optimization
- Monthly performance review (15-min call)
- Channel additions/modifications
- ~2 hours of actual work/month (85% margin)

**GBP800/mo (Enterprise):**
- Everything in Growth
- Monthly AI insights report (auto-generated, you review + send)
- Priority support (48hr response)
- Quarterly strategy call (30 min)
- Attribution model tuning
- ~3-4 hours of actual work/month (80% margin)

### Upsell Menu (After Initial Delivery)

| Add-On | Price | Effort | When to Pitch |
|--------|-------|--------|---------------|
| Additional channel integration | GBP800 | 4-6h | Month 1 retainer call |
| AI referral tracking (for Growth clients) | GBP1,200 | 6-8h | When they mention AI traffic |
| Full AI assistant upgrade (for Starter) | GBP1,000 | 5-7h | When they ask data questions manually |
| Custom report/dashboard page | GBP500-800 | 3-5h | When they request specific views |
| Historical data backfill (6-12 months) | GBP600 | 4-6h | Month 1 |
| Multi-touch attribution (for Starter) | GBP1,500 | 8-10h | When they question ad spend ROI |
| Monthly CRO recommendations report | GBP300/mo | 1-2h/mo | Month 2+ |
| Competitor tracking integration | GBP1,200 | 8h | Enterprise clients |

### Revenue Model at Scale

**Target: 10 active clients**

| Client Mix | Setup Revenue | Monthly Retainer |
|-----------|---------------|-----------------|
| 4x Starter @ GBP1,500 | GBP6,000 | GBP800/mo |
| 4x Growth @ GBP3,500 | GBP14,000 | GBP1,600/mo |
| 2x Enterprise @ GBP6,000 | GBP12,000 | GBP1,600/mo |
| **Total** | **GBP32,000 setup** | **GBP4,000/mo recurring** |

Add upsells (avg GBP800/client/quarter) = additional GBP2,600/quarter

**Annual projection:** GBP32k setup + GBP48k retainers + GBP10.4k upsells = **GBP90,400/year**

**At 15 clients:** GBP135k+/year = **GBP11k+/month average**

**Time investment:** 10-20 hrs/week once template is mature

### LTV Maximization Tactics

1. **Lock in annual retainers** with 2-month discount (GBP200/mo -> GBP2,000/year instead of GBP2,400)
2. **Quarterly business reviews** -- show value delivered, pitch next tier upgrade
3. **Auto-generated insights emails** -- weekly summary email builds dependency
4. **Referral program** -- 10% of first project for referred clients

---

## 7. POSITIONING & DIFFERENTIATION

### Why PulseCommerce vs Competitors

| Feature | PulseCommerce | Triple Whale | GA4 | Shopify Analytics |
|---------|--------------|-------------|-----|-------------------|
| AI referral tracking | YES (unique) | No | No | No |
| Conversational AI assistant | YES | No | No | No |
| Multi-channel unified view | YES | Partial | Partial | No |
| Full visitor journey | YES | Partial | Complex setup | No |
| Client owns infrastructure | YES | No (SaaS) | N/A | N/A |
| No monthly SaaS fee | YES | GBP300-600/mo | Free but limited | Free but basic |
| Amazon + Shopify unified | YES | Partial | Manual | No |
| White-label ready | YES | No | No | No |

### 3 Killer Positioning Statements

1. **"PulseCommerce tracks revenue from ChatGPT, Perplexity, and Claude -- a channel growing 300% year-over-year that your current analytics completely ignores."**

2. **"Stop paying GBP500/month for Triple Whale. PulseCommerce is a one-time build that you own forever -- with features Triple Whale doesn't even have."**

3. **"Ask your dashboard 'How are my ads performing?' and get an instant, data-backed answer. PulseCommerce is the first analytics system with a built-in AI analyst."**

### 5 Objection Responses

**1. "We already use GA4"**
> "GA4 tells you what happened. PulseCommerce tells you why. Plus, GA4 can't track AI referral traffic, doesn't unify Amazon revenue, and definitely can't answer your questions in plain English. Most of my clients keep GA4 running alongside PulseCommerce -- they're complementary, not competing."

**2. "Triple Whale does this"**
> "Triple Whale is great but it's GBP300-600/month forever with no AI referral tracking and no conversational AI. PulseCommerce is a one-time build at a fraction of the annual cost, you own the infrastructure, and it tracks revenue sources Triple Whale completely misses."

**3. "We'll build it ourselves"**
> "Absolutely you can. It took me 6 months to build the template system. The database schema alone has 12 tables with row-level security. The AI referral detection engine handles 5 different AI sources. You're looking at 200+ engineering hours. Or I can deploy a proven, tested version in 1-2 weeks."

**4. "GBP3,500 is too expensive"**
> "Let's break it down: Triple Whale at GBP300/mo = GBP3,600/year. PulseCommerce is GBP3,500 one-time + GBP200-400/mo maintenance. You break even in year one and save GBP2,000+/year after that. Plus you get AI referral tracking and a conversational AI assistant that Triple Whale doesn't offer at any price."

**5. "How do I know this actually works?"**
> "I'll show you a live demo right now with real data. You can click through every page, ask the AI assistant questions, and see the AI referral tracking in action. If it doesn't do what I've described, you pay nothing."

---

## APPENDIX A: Feature Flag System

```json
// config/feature-flags.json
{
  "starter": {
    "pages": ["dashboard", "channels"],
    "ai_assistant": false,
    "ai_referrals": false,
    "attribution": false,
    "sku_analytics": false,
    "max_channels": 2,
    "data_retention_days": 90
  },
  "growth": {
    "pages": ["dashboard", "channels", "products", "attribution"],
    "ai_assistant": "limited",
    "ai_referrals": false,
    "attribution": true,
    "sku_analytics": true,
    "max_channels": 4,
    "data_retention_days": 365
  },
  "enterprise": {
    "pages": ["dashboard", "channels", "products", "attribution", "ai-referrals", "ai-assistant"],
    "ai_assistant": "full",
    "ai_referrals": true,
    "attribution": true,
    "sku_analytics": true,
    "max_channels": -1,
    "data_retention_days": -1
  }
}
```

## APPENDIX B: Client Communication Templates

### Welcome Email (After Payment)

```
Subject: PulseCommerce -- Let's Get You Set Up

Hi [Name],

Welcome to PulseCommerce!

Here's what happens next:

1. I need a few things from you (takes 10 minutes):
   - Shopify Custom App credentials (video guide attached)
   - [Channel] API key (doc attached)
   - Your logo file (SVG or PNG, transparent background)
   - Brand colors (hex codes or "match our website")

2. Once I have these, I'll deploy your dashboard within [X] days.

3. I'll send you a demo link to preview before we go live.

Reply to this email with your credentials and I'll get started 
immediately.

[Your name]
```

### Go-Live Email

```
Subject: Your PulseCommerce Dashboard is LIVE

Hi [Name],

Your dashboard is ready!

Login: [URL]
Email: [their email]
Password: [temp password] (please change on first login)

Quick start:
- Dashboard shows the last 30 days of data
- Click "Channels" to see per-channel breakdown
- [If Growth+] Click "Products" for SKU-level analytics
- [If Enterprise] Try the AI Assistant -- ask it anything about 
  your data

I've attached a 3-minute walkthrough video.

Let's schedule a 15-minute call this week to walk through it 
together and answer any questions.

[Your name]
```

## APPENDIX C: Monthly Retainer SOP

### Weekly (15 min total):
- Check n8n execution logs for failures
- Verify data sync is running (spot check latest orders match Shopify)
- Review error alerts (set up n8n error workflow to email you)

### Monthly (1-2 hours total):
1. Run data accuracy check (compare PulseCommerce totals to Shopify admin)
2. Check for any new AI referral sources to add detection for
3. Review and optimize slow database queries
4. Update n8n/postgres if security patches available
5. Send monthly summary to client (can be AI-generated from dashboard data)

### Quarterly:
1. Review client's channel mix -- any new channels to add?
2. Pitch relevant upsells based on their usage patterns
3. Update AI assistant prompts based on common questions they ask
4. Performance audit -- database size, query speeds, API rate limits

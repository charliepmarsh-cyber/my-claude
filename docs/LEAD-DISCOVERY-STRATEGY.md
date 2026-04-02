# Lead Discovery Strategy

Compliant approaches to finding leads across all three segments.

## Source Matrix

| Source | Signal | Segment Fit | Pros | Cons |
|--------|--------|-------------|------|------|
| Shopify App Store reviews | Store owners expressing pain points publicly | Shopify | High-signal, public | Manual, time-intensive |
| Ecommerce directories (BuiltWith, Store Leads) | Technology usage, platform data | Shopify, Ecommerce | Structured data, bulk | Requires paid access |
| Job postings (LinkedIn, Indeed) | Hiring ops/CX/automation roles = operational need | All | Strong intent signal | Not always current |
| LinkedIn Sales Navigator | Company size, industry, role filters | All | Good targeting | Requires subscription |
| X/Twitter search | Founders discussing operational challenges | Shopify, Ecommerce | Real-time, authentic | Noisy, low volume |
| Industry newsletters/podcasts | Featured companies, guest speakers | All | Pre-qualified exposure | Manual, sporadic |
| Shopify Partner Network | Agencies refer clients needing automation | Shopify | Warm intros | Relationship-dependent |
| Public company websites | About pages, team pages, job boards | All | Free, always available | Shallow signal |
| Community forums (Reddit, Slack, Discord) | People asking about automation tools | All | High intent | Must respect community rules |
| Product Hunt / G2 reviews | Companies reviewing operations tools | Ecommerce, Enterprise | Intent signal | Indirect |
| CRM imports (existing lists) | Previously identified prospects | All | Pre-qualified | May be stale |
| Referrals | Word of mouth from existing clients | All | Highest quality | Low volume |
| Google search patterns | "[industry] + hiring + operations" | All | Free, targetable | Requires manual filtering |

## Per-Source Usage Guide

### Job Postings (Highest Signal)
- **Search for**: "operations manager", "fulfillment coordinator", "ecommerce operations", "automation engineer", "CX manager"
- **Signal**: Company is investing in operations = has complexity worth automating
- **Normalize**: Extract company name, role, location, and requirements → map to pain points
- **Rate**: Don't scrape — use job board APIs or manual research

### Shopify App Store
- **Search for**: Stores using 5+ apps, stores reviewing fulfillment/inventory apps
- **Signal**: App fragmentation = integration/automation opportunity
- **Normalize**: Extract store domain, app list, review content
- **Rate**: Public data, but don't automate scraping

### LinkedIn (Manual or Sales Navigator)
- **Search for**: Founders/ops leads at ecommerce companies, 10-500 employees
- **Signal**: Title + company + industry alignment
- **Normalize**: Extract name, role, company, LinkedIn URL
- **Rate**: Respect LinkedIn limits — manual export only

### Search Patterns
- `"shopify store" + "hiring" + "fulfillment"`
- `"ecommerce" + "operations manager" + "remote"`
- `"3PL" + "digital transformation" + "hiring"`
- `site:linkedin.com "head of operations" "ecommerce"`

## Data Normalization

All sources should normalize to the `CsvLeadRow` format for ingestion:

```
company_name, website, platform, industry, niche, size_estimate,
contact_name, contact_role, contact_email, linkedin_url, x_url,
segment, source, notes
```

The `notes` field captures raw context that the enrichment pipeline will structure.

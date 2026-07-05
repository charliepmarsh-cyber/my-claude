# CPM Growth Systems — Website

Premium dark-theme marketing site for CPM Growth Systems (AI Growth Systems for
Ecommerce Brands). Pure static HTML/CSS/JS — no build step, deploys anywhere.

## Structure

```
website/
├── index.html         Home (hero, pain, services, process, systems, why, founder, CTA)
├── services.html      7 service layers + tool stack
├── systems.html       6 featured systems + 6 conversion offer cards
├── proof.html         Case studies, testimonials, Loom/screenshot placeholders
├── about.html         Founder story + operating principles
├── contact.html       Audit request form + booking placeholder
├── css/styles.css     Design system (navy/black/electric-blue/cyan, glassmorphism)
├── js/main.js         Nav, scroll reveal, form handling
├── assets/            8 Higgsfield-generated brand visuals (WebP)
└── HIGGSFIELD-PROMPTS.md  Prompt library to regenerate/extend visuals
```

## Run locally

```
npx serve website
```

## Deploy

Drop the `website/` folder on Netlify, Vercel, Cloudflare Pages or GitHub Pages as-is.

## Before going live — wire these up

1. **Form backend** — `js/main.js` currently shows a success note and points to email.
   Swap for a Formspree endpoint, HubSpot form, or an n8n webhook (recommended: n8n →
   HubSpot contact + Slack/email alert).
2. **Call booking** — replace the placeholder box on `contact.html` with a Calendly or
   HubSpot Meetings embed.
3. **Domain + analytics** — point DNS, add Plausible/GA4 snippet before `</body>`.
4. **Proof content** — drop Loom embeds and real screenshots into the marked
   placeholder boxes on `proof.html`; swap reserved testimonial cards as quotes land.
5. **Business email** — replace the Gmail contact address with a domain address when ready.

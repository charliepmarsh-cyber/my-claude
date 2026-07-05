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

1. **Form backend (n8n — built, needs activating)** — the workflow is at
   `../n8n-templates/website-audit-request.json`. To go live:
   1. Import it into your n8n instance, connect a Gmail credential on the
      "Email Charlie" node, and activate it.
   2. Copy the production webhook URL (ends in `/webhook/cpm-audit-request`).
   3. Paste it into `FORM_WEBHOOK_URL` at the top of the contact-form block in
      `js/main.js` and push — until then the form shows a "not wired yet" note.
   The workflow validates required fields, drops honeypot spam, emails Charlie,
   and returns JSON the form understands. CORS is locked to the GitHub Pages
   origin — update `allowedOrigins` on the Webhook node when the domain changes.
2. **Call booking** — replace the placeholder box on `contact.html` with a Calendly or
   HubSpot Meetings embed.
3. **Domain + analytics** — point DNS, add Plausible/GA4 snippet before `</body>`.
4. **Proof content** — drop Loom embeds and real screenshots into the marked
   placeholder boxes on `proof.html`; swap reserved testimonial cards as quotes land.
5. **Business email** — replace the Gmail contact address with a domain address when ready.

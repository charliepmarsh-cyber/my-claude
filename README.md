# outreach-agent · CortexCart OS

Lead discovery, qualification, and outreach drafting engine — now with **CortexCart OS**, a web dashboard that runs CortexCart's go-to-market as departments (Sales / Marketing / Finance) on top of the pipeline.

```bash
npm install
npm run serve      # dashboard + API on http://localhost:3847/
```

- **[CortexCart OS guide](docs/CORTEXCART-OS.md)** — dashboard, departments, OS API
- **[Lead Intelligence Engine](docs/LEAD-INTELLIGENCE.md)** — buying signals, AI fit analysis, CRM stages, NL search, Excel/CSV import, roadmap
- **[Architecture](docs/ARCHITECTURE.md)** — pipeline design (ingest → enrich → score → draft → review)
- **[n8n integration](docs/N8N-INTEGRATION.md)** — webhook endpoints + workflow templates
- **[Compliance](docs/COMPLIANCE.md)** — CAN-SPAM / GDPR / CASL checklist

Human-in-the-loop by design: the pipeline drafts, you approve, nothing sends itself.

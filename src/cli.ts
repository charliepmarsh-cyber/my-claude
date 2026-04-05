#!/usr/bin/env node
import dotenv from "dotenv";
dotenv.config({ override: true });
import { Command } from "commander";
import chalk from "chalk";
import { existsSync } from "fs";
import { resolve } from "path";

import { importFromCsv, exportToCsv, importFromJson, exportToJson } from "./connectors/index.js";
import { initDb, getAllLeads, getLeadsByStatus, getLeadCount, saveLead, saveLeads } from "./storage/index.js";
import { runPipeline } from "./pipelines/index.js";
import { scoreLead } from "./scoring/index.js";
import { enrichLead } from "./enrichment/index.js";
import { draftOutreach } from "./outreach/index.js";
import { applyReview, filterReviewQueue, reviewQueueStats, interactiveReview } from "./review/index.js";
import { generateFollowUps } from "./outreach/index.js";
import { validateLead, validateDraft } from "./quality/index.js";
import { log, setLogLevel, validateApiKey, checkConnectorKeys } from "./lib/index.js";
import { runDiscovery, validateAllConnectors } from "./pipelines/index.js";
import type { Lead } from "./types/index.js";
import type { ReviewAction } from "./review/index.js";

const program = new Command();

program
  .name("outreach")
  .description("Lead discovery, qualification, and outreach drafting agent")
  .version("0.1.0")
  .option("--db <path>", "Database path", "./data/outreach.db")
  .option("--verbose", "Enable debug logging")
  .hook("preAction", (cmd) => {
    if (cmd.opts().verbose) setLogLevel("debug");
    initDb(cmd.opts().db);

    // Validate API key on commands that need it
    const llmCommands = ["pipeline", "enrich", "draft", "follow-up"];
    const cmdName = cmd.args?.[0] || cmd.name();
    if (llmCommands.includes(cmdName)) {
      try {
        const { mode } = validateApiKey();
        if (mode === "mock") {
          log.warn("No ANTHROPIC_API_KEY configured — will use mock LLM responses.");
          log.warn("Set your key in .env for real Claude-powered enrichment and drafting.");
        } else {
          log.debug("API key validated (live mode)");
        }
      } catch (err) {
        log.error((err as Error).message);
        process.exit(1);
      }
    }
  });

// ── Ingest ──────────────────────────────────────────────────────

program
  .command("ingest <file>")
  .description("Import leads from CSV or JSON file")
  .action((file: string) => {
    const filePath = resolve(file);
    if (!existsSync(filePath)) {
      log.error(`File not found: ${filePath}`);
      process.exit(1);
    }

    let leads: Lead[];
    if (filePath.endsWith(".csv")) {
      leads = importFromCsv(filePath);
    } else if (filePath.endsWith(".json")) {
      leads = importFromJson(filePath);
    } else {
      log.error("Unsupported file format. Use .csv or .json");
      process.exit(1);
    }

    saveLeads(leads);
    log.success(`Ingested ${leads.length} leads`);
    printLeadSummary(leads);
  });

// ── Pipeline (full run) ─────────────────────────────────────────

program
  .command("pipeline <file>")
  .description("Run full pipeline: ingest -> enrich -> score -> draft -> queue")
  .option("--dry-run", "Preview without saving")
  .option("--skip-enrich", "Skip LLM enrichment")
  .option("--skip-draft", "Skip outreach drafting")
  .option("--min-score <n>", "Minimum score for drafting", "30")
  .option("--channels <list>", "Channels to draft (linkedin,x,email)", "linkedin,x,email")
  .action(async (file: string, opts) => {
    const filePath = resolve(file);
    if (!existsSync(filePath)) {
      log.error(`File not found: ${filePath}`);
      process.exit(1);
    }

    let leads: Lead[];
    if (filePath.endsWith(".csv")) {
      leads = importFromCsv(filePath);
    } else {
      leads = importFromJson(filePath);
    }

    const result = await runPipeline(leads, {
      dryRun: opts.dryRun,
      enrichmentEnabled: !opts.skipEnrich,
      draftingEnabled: !opts.skipDraft,
      minScoreForDrafting: parseInt(opts.minScore, 10),
      channels: opts.channels.split(","),
    });

    console.log("\n" + chalk.bold("Pipeline Results:"));
    console.log(`  Total:        ${result.total}`);
    console.log(`  Deduplicated: ${result.deduplicated}`);
    console.log(`  Enriched:     ${result.enriched}`);
    console.log(`  Scored:       ${result.scored}`);
    console.log(`  Drafted:      ${result.drafted}`);
    console.log(`  Queued:       ${result.queued}`);
    console.log(`  Excluded:     ${result.excluded}`);
    console.log(`  Errors:       ${result.errors}`);

    if (opts.dryRun) {
      console.log(chalk.yellow("\n  (Dry run — nothing saved)"));
    }
  });

// ── Enrich ──────────────────────────────────────────────────────

program
  .command("enrich")
  .description("Enrich all new/un-enriched leads")
  .action(async () => {
    const leads = getAllLeads().filter((l) => l.status === "new");
    if (leads.length === 0) {
      log.info("No new leads to enrich");
      return;
    }
    log.info(`Enriching ${leads.length} leads...`);
    for (const lead of leads) {
      const enriched = await enrichLead(lead);
      saveLead(enriched);
    }
    log.success(`Enriched ${leads.length} leads`);
  });

// ── Score ───────────────────────────────────────────────────────

program
  .command("score")
  .description("Score all enriched leads")
  .action(() => {
    const leads = getAllLeads().filter((l) => l.status === "enriched");
    if (leads.length === 0) {
      log.info("No enriched leads to score");
      return;
    }
    for (const lead of leads) {
      const score = scoreLead(lead);
      const scored = { ...lead, score, status: "scored" as const, scoredAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      saveLead(scored);
      console.log(`  ${scored.company.name}: ${score.finalScore} (${score.tier}) — ${score.explanation.slice(0, 80)}`);
    }
    log.success(`Scored ${leads.length} leads`);
  });

// ── Draft ───────────────────────────────────────────────────────

program
  .command("draft")
  .description("Generate outreach drafts for scored leads")
  .option("--min-score <n>", "Minimum score", "30")
  .action(async (opts) => {
    const minScore = parseInt(opts.minScore, 10);
    const leads = getAllLeads().filter((l) => l.status === "scored" && (l.score?.finalScore ?? 0) >= minScore);
    if (leads.length === 0) {
      log.info("No scored leads above threshold");
      return;
    }
    for (const lead of leads) {
      const drafted = await draftOutreach(lead);
      saveLead(drafted);
    }
    log.success(`Drafted outreach for ${leads.length} leads`);
  });

// ── Follow-up ───────────────────────────────────────────────────

program
  .command("follow-up")
  .description("Generate follow-up email sequences for drafted leads")
  .action(async () => {
    const leads = getAllLeads().filter(
      (l) => l.status === "drafted" || l.status === "review_pending"
    );
    const needsFollowUp = leads.filter(
      (l) => !l.outreachDrafts.some((d) => d.messageType === "email_follow_up_1")
    );
    if (needsFollowUp.length === 0) {
      log.info("No leads need follow-up sequences");
      return;
    }
    log.info(`Generating follow-ups for ${needsFollowUp.length} leads...`);
    for (const lead of needsFollowUp) {
      const followUps = await generateFollowUps(lead, 2);
      const updated = {
        ...lead,
        outreachDrafts: [...lead.outreachDrafts, ...followUps],
        updatedAt: new Date().toISOString(),
      };
      saveLead(updated);
      log.success(`${lead.company.name}: ${followUps.length} follow-ups generated`);
    }
  });

// ── Review ──────────────────────────────────────────────────────

program
  .command("review")
  .description("Show review queue and stats")
  .option("-i, --interactive", "Interactive review mode")
  .option("--approve <id>", "Approve a lead")
  .option("--reject <id>", "Reject a lead")
  .option("--snooze <id>", "Snooze a lead")
  .option("--not-a-fit <id>", "Mark as not a fit")
  .option("--notes <text>", "Add review notes")
  .action(async (opts) => {
    // Interactive mode
    if (opts.interactive) {
      const allLeads = getAllLeads();
      await interactiveReview(allLeads);
      return;
    }

    // Handle review actions
    if (opts.approve || opts.reject || opts.snooze || opts.notAFit) {
      const id = opts.approve || opts.reject || opts.snooze || opts.notAFit;
      const action: ReviewAction["action"] = opts.approve ? "approve" : opts.reject ? "reject" : opts.snooze ? "snooze" : "not_a_fit";
      const allLeads = getAllLeads();
      const lead = allLeads.find((l) => l.id === id);
      if (!lead) {
        log.error(`Lead not found: ${id}`);
        return;
      }
      const reviewed = applyReview(lead, { action, notes: opts.notes });
      saveLead(reviewed);
      log.success(`${lead.company.name}: ${action}`);
      return;
    }

    // Show review queue
    const allLeads = getAllLeads();
    const stats = reviewQueueStats(allLeads);
    const queue = filterReviewQueue(allLeads);

    console.log(chalk.bold("\nReview Queue Stats:"));
    for (const [status, count] of Object.entries(stats)) {
      console.log(`  ${status}: ${count}`);
    }

    if (queue.length === 0) {
      console.log(chalk.gray("\nNo leads pending review."));
      return;
    }

    console.log(chalk.bold(`\nPending Review (${queue.length}):`));
    for (const lead of queue) {
      console.log(`\n  ${chalk.cyan(lead.id)} — ${chalk.bold(lead.company.name)}`);
      console.log(`    Segment: ${lead.segment} | Score: ${lead.score?.finalScore ?? "?"} (${lead.score?.tier ?? "?"})`);
      console.log(`    Contact: ${lead.contact.fullName || "?"} (${lead.contact.role || "?"})`);
      if (lead.personalizationNotes) {
        console.log(`    Personalization: ${lead.personalizationNotes.slice(0, 100)}`);
      }
      console.log(`    Drafts: ${lead.outreachDrafts.length}`);
      for (const draft of lead.outreachDrafts) {
        const quality = draft.qualityScore ? ` [Q:${draft.qualityScore}]` : "";
        console.log(`      - ${draft.messageType}${quality}: ${draft.body.slice(0, 60)}...`);
      }
    }

    console.log(chalk.gray(`\nActions: --approve <id> | --reject <id> | --snooze <id> | --not-a-fit <id>`));
  });

// ── Export ───────────────────────────────────────────────────────

program
  .command("export <file>")
  .description("Export leads to CSV or JSON")
  .option("--status <status>", "Filter by status")
  .option("--segment <segment>", "Filter by segment")
  .option("--min-score <n>", "Minimum score filter")
  .action((file: string, opts) => {
    let leads = getAllLeads();
    if (opts.status) leads = leads.filter((l) => l.status === opts.status);
    if (opts.segment) leads = leads.filter((l) => l.segment === opts.segment);
    if (opts.minScore) leads = leads.filter((l) => (l.score?.finalScore ?? 0) >= parseInt(opts.minScore, 10));

    const filePath = resolve(file);
    if (filePath.endsWith(".csv")) {
      exportToCsv(leads, filePath);
    } else {
      exportToJson(leads, filePath);
    }
  });

// ── Stats ───────────────────────────────────────────────────────

program
  .command("stats")
  .description("Show database stats")
  .action(() => {
    const leads = getAllLeads();
    const stats = reviewQueueStats(leads);
    const segments: Record<string, number> = {};
    const tiers: Record<string, number> = {};

    for (const lead of leads) {
      segments[lead.segment] = (segments[lead.segment] || 0) + 1;
      if (lead.score?.tier) tiers[lead.score.tier] = (tiers[lead.score.tier] || 0) + 1;
    }

    console.log(chalk.bold(`\nDatabase: ${leads.length} leads`));
    console.log(chalk.bold("\nBy Status:"));
    for (const [s, c] of Object.entries(stats)) console.log(`  ${s}: ${c}`);
    console.log(chalk.bold("\nBy Segment:"));
    for (const [s, c] of Object.entries(segments)) console.log(`  ${s}: ${c}`);
    console.log(chalk.bold("\nBy Tier:"));
    for (const [t, c] of Object.entries(tiers)) console.log(`  ${t}: ${c}`);
  });

// ── Discover ────────────────────────────────────────────────────

program
  .command("discover")
  .description("Discover new leads via external connectors (Apollo, BuiltWith, job boards)")
  .option("--segment <segment>", "Target segment: shopify, ecommerce, or enterprise")
  .option("--max <n>", "Max leads per source", process.env.DISCOVERY_DEFAULT_MAX || "25")
  .option("--source <sources>", "Comma-separated connector keys (apollo,builtwith,jobsignals)")
  .option("--dry-run", "Preview results without saving to storage")
  .option("--no-pipeline", "Skip running enrichment pipeline on discovered leads")
  .option("--validate", "Validate all connector API keys and exit")
  .option("--filters <json>", "JSON string of additional filters")
  .action(async (opts) => {
    // Validate-only mode
    if (opts.validate) {
      console.log(chalk.bold("\nValidating discovery connectors...\n"));
      const results = await validateAllConnectors();
      for (const [key, ok] of Object.entries(results)) {
        console.log(`  ${ok ? chalk.green("✓") : chalk.red("✗")} ${key}`);
      }
      const allOk = Object.values(results).every(Boolean);
      console.log(allOk ? chalk.green("\nAll connectors ready.") : chalk.yellow("\nSome connectors unavailable (check API keys)."));
      return;
    }

    if (!opts.segment) {
      log.error("--segment is required. Use: shopify, ecommerce, or enterprise");
      process.exit(1);
    }
    const segment = opts.segment as "shopify" | "ecommerce" | "enterprise";
    if (!["shopify", "ecommerce", "enterprise"].includes(segment)) {
      log.error(`Invalid segment: "${segment}". Use: shopify, ecommerce, or enterprise`);
      process.exit(1);
    }

    const sources = opts.source ? opts.source.split(",").map((s: string) => s.trim()) : undefined;

    // Check connector keys (fail hard only if a specific source was requested)
    try {
      checkConnectorKeys(sources);
    } catch (err) {
      log.error((err as Error).message);
      process.exit(1);
    }

    const filters = opts.filters ? JSON.parse(opts.filters) : undefined;

    const result = await runDiscovery({
      segment,
      maxLeads: parseInt(opts.max, 10),
      sources,
      filters,
      dryRun: !!opts.dryRun,
      runPipelineAfter: opts.pipeline !== false,
    });

    // Print results
    console.log(chalk.bold("\nDiscovery Results:"));
    console.log(`  Total found:     ${result.totalFound}`);
    console.log(`  Duplicates:      ${result.totalDeduped}`);
    console.log(`  Already exists:  ${result.totalExisting}`);
    console.log(`  New leads:       ${result.totalNew}`);

    if (result.stats.length > 0) {
      console.log(chalk.bold("\nBy Source:"));
      for (const stat of result.stats) {
        const errStr = stat.errors.length > 0 ? chalk.red(` (${stat.errors.length} errors)`) : "";
        console.log(`  ${stat.source}: ${stat.found} found, ${stat.passedToPipeline} new${errStr}`);
      }
    }

    if (result.pipelineResult) {
      console.log(chalk.bold("\nPipeline Results:"));
      console.log(`  Enriched: ${result.pipelineResult.enriched}`);
      console.log(`  Scored:   ${result.pipelineResult.scored}`);
      console.log(`  Drafted:  ${result.pipelineResult.drafted}`);
      console.log(`  Queued:   ${result.pipelineResult.queued}`);
    }

    if (opts.dryRun) {
      console.log(chalk.yellow("\n  (Dry run — nothing saved)"));
      if (result.newLeads.length > 0) {
        console.log(chalk.bold("\n  Preview of discovered leads:"));
        for (const lead of result.newLeads.slice(0, 10)) {
          console.log(`    - ${lead.company.name} (${lead.segment}) — ${lead.contact.fullName || "no contact"} — ${lead.source}`);
        }
        if (result.newLeads.length > 10) {
          console.log(chalk.gray(`    ... and ${result.newLeads.length - 10} more`));
        }
      }
    }
  });

// ── Parse and run ───────────────────────────────────────────────

function printLeadSummary(leads: Lead[]) {
  const segments: Record<string, number> = {};
  for (const l of leads) segments[l.segment] = (segments[l.segment] || 0) + 1;
  console.log(chalk.bold("\nLead Summary:"));
  for (const [seg, count] of Object.entries(segments)) {
    console.log(`  ${seg}: ${count}`);
  }
}

program.parse();

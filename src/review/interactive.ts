import * as readline from "readline";
import chalk from "chalk";
import type { Lead } from "../types/index.js";
import { applyReview, filterReviewQueue } from "./reviewer.js";
import { saveLead } from "../storage/database.js";
import { log } from "../lib/logger.js";

/**
 * Interactive review mode — walk through each pending lead
 * and approve/edit/reject/snooze interactively.
 */
export async function interactiveReview(allLeads: Lead[]): Promise<void> {
  const queue = filterReviewQueue(allLeads);
  if (queue.length === 0) {
    console.log(chalk.gray("\nNo leads pending review.\n"));
    return;
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const ask = (q: string): Promise<string> =>
    new Promise((resolve) => rl.question(q, resolve));

  console.log(chalk.bold(`\nInteractive Review — ${queue.length} leads pending\n`));
  console.log(chalk.gray("Commands: (a)pprove, (e)dit notes, (r)eject, (s)nooze, (n)ot a fit, (q)uit\n"));

  let reviewed = 0;

  for (const lead of queue) {
    console.log(chalk.cyan("─".repeat(60)));
    printLeadSummary(lead);

    const input = await ask(chalk.yellow("\n  Action [a/e/r/s/n/q]: "));
    const cmd = input.trim().toLowerCase();

    if (cmd === "q" || cmd === "quit") {
      console.log(chalk.gray(`\nExiting review. ${reviewed} leads reviewed.\n`));
      break;
    }

    try {
      let notes: string | undefined;

      switch (cmd) {
        case "a":
        case "approve": {
          const updated = applyReview(lead, { action: "approve" });
          saveLead(updated);
          log.success(`Approved: ${lead.company.name}`);
          reviewed++;
          break;
        }
        case "e":
        case "edit": {
          notes = await ask(chalk.gray("  Notes: "));
          const updated = applyReview(lead, { action: "edit", notes });
          saveLead(updated);
          log.success(`Edited: ${lead.company.name}`);
          reviewed++;
          break;
        }
        case "r":
        case "reject": {
          notes = await ask(chalk.gray("  Reason: "));
          const updated = applyReview(lead, { action: "reject", notes });
          saveLead(updated);
          log.info(`Rejected: ${lead.company.name}`);
          reviewed++;
          break;
        }
        case "s":
        case "snooze": {
          notes = await ask(chalk.gray("  Snooze until (YYYY-MM-DD): "));
          const updated = applyReview(lead, { action: "snooze", snoozeUntil: notes });
          saveLead(updated);
          log.info(`Snoozed: ${lead.company.name}`);
          reviewed++;
          break;
        }
        case "n":
        case "not a fit": {
          notes = await ask(chalk.gray("  Reason: "));
          const updated = applyReview(lead, { action: "not_a_fit", notes });
          saveLead(updated);
          log.info(`Not a fit: ${lead.company.name}`);
          reviewed++;
          break;
        }
        default:
          console.log(chalk.red("  Unknown command. Skipping."));
      }
    } catch (err) {
      log.error(`Review error: ${(err as Error).message}`);
    }

    console.log();
  }

  console.log(chalk.bold(`\nReview complete. ${reviewed}/${queue.length} leads reviewed.\n`));
  rl.close();
}

function printLeadSummary(lead: Lead): void {
  console.log(`\n  ${chalk.bold(lead.company.name)} ${chalk.gray(`(${lead.id})`)}`);
  console.log(`  ${chalk.gray("Segment:")} ${lead.segment} ${chalk.gray("| Score:")} ${lead.score?.finalScore ?? "?"} (${lead.score?.tier ?? "?"})`);
  console.log(`  ${chalk.gray("Contact:")} ${lead.contact.fullName || "?"} — ${lead.contact.role || "?"}`);

  if (lead.personalizationNotes) {
    console.log(`  ${chalk.gray("Personalization:")} ${lead.personalizationNotes.slice(0, 120)}`);
  }

  if (lead.painPoints.length > 0) {
    console.log(`  ${chalk.gray("Top pain point:")} ${lead.painPoints[0].hypothesis.slice(0, 120)}`);
  }

  // Show drafts
  if (lead.outreachDrafts.length > 0) {
    console.log(`  ${chalk.gray("Drafts:")} ${lead.outreachDrafts.length}`);
    for (const draft of lead.outreachDrafts) {
      const quality = draft.qualityScore != null ? ` ${chalk.gray(`[Q:${draft.qualityScore}]`)}` : "";
      const issues = draft.qualityIssues.length > 0
        ? ` ${chalk.red(`(${draft.qualityIssues.length} issues)`)}`
        : "";

      console.log(`    ${chalk.blue(draft.messageType)}${quality}${issues}`);
      if (draft.subject) {
        console.log(`      Subject: ${draft.subject}`);
      }
      // Show first 2 lines of body
      const bodyLines = draft.body.split("\n").filter(Boolean).slice(0, 2);
      for (const line of bodyLines) {
        console.log(`      ${chalk.gray(line.slice(0, 80))}${line.length > 80 ? "..." : ""}`);
      }
    }
  }
}

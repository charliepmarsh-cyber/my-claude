/**
 * Case-study document generators — deterministic templates filled ONLY from
 * recorded fields. Outcome claims (time saved, revenue, error reduction) are
 * included only when evidence fields are populated; otherwise the document
 * says so explicitly. Nothing is ever invented.
 */

import type { CaseStudy } from "@/db/schema";

export type CaseStudyDocKind =
  | "offer"
  | "scope_agreement"
  | "success_metric"
  | "completion_summary"
  | "testimonial_request"
  | "linkedin_post"
  | "portfolio_entry"
  | "phase2_proposal"
  | "retainer_offer";

export const CASE_STUDY_DOC_LABELS: Record<CaseStudyDocKind, string> = {
  offer: "Initial case-study offer",
  scope_agreement: "Scope agreement",
  success_metric: "Success-metric document",
  completion_summary: "Completion summary",
  testimonial_request: "Testimonial request",
  linkedin_post: "LinkedIn case-study post",
  portfolio_entry: "Portfolio case study",
  phase2_proposal: "Phase-two proposal",
  retainer_offer: "Maintenance / retainer offer",
};

export type DocResult = { ok: true; title: string; body: string; warnings: string[] } | { ok: false; missing: string[] };

const need = (cs: CaseStudy, fields: Array<[keyof CaseStudy, string]>): string[] =>
  fields.filter(([k]) => !cs[k] || String(cs[k]).trim() === "").map(([, label]) => label);

function evidencedOutcomes(cs: CaseStudy): { lines: string[]; hasAny: boolean } {
  const lines: string[] = [];
  if (cs.timeSaved && cs.afterEvidence) lines.push(`Time saved: ${cs.timeSaved}`);
  if (cs.revenueInfluenced && cs.afterEvidence) lines.push(`Revenue influenced: ${cs.revenueInfluenced}`);
  if (cs.errorReduction && cs.afterEvidence) lines.push(`Error reduction: ${cs.errorReduction}`);
  return { lines, hasAny: lines.length > 0 };
}

export function generateCaseStudyDoc(kind: CaseStudyDocKind, cs: CaseStudy): DocResult {
  switch (kind) {
    case "offer": {
      const missing = need(cs, [
        ["companyName", "Company name"],
        ["problem", "Problem"],
      ]);
      if (missing.length) return { ok: false, missing };
      return {
        ok: true,
        title: `Case-study offer — ${cs.companyName}`,
        warnings: [],
        body: `Hi,

You've described a genuine bottleneck: ${cs.problem}

I'm working with a small number of businesses to remove repetitive operational work using automation. If this is a genuine bottleneck, I'd be happy to map the process and build an initial version at no cost. If it delivers a measurable result, I'd ask for permission to document the outcome as a case study.

Concretely, that would look like:
1. A short mapping call to document how it works today.
2. An agreed success metric before any building starts${cs.successMetric ? ` (suggested: ${cs.successMetric})` : ""}.
3. An initial working version, built around your review and approval points.
4. A measurement period, then a decision from you on whether it stays.

No cost, no obligation to continue, and nothing gets published without your written approval.

Cheers,
Charlie`,
      };
    }
    case "scope_agreement": {
      const missing = need(cs, [
        ["companyName", "Company name"],
        ["problem", "Problem"],
        ["proposedBuild", "Proposed build"],
        ["successMetric", "Success metric"],
      ]);
      if (missing.length) return { ok: false, missing };
      return {
        ok: true,
        title: `Scope agreement — ${cs.companyName}`,
        warnings: [],
        body: `CASE-STUDY BUILD — SCOPE AGREEMENT

Client: ${cs.companyName}
Provider: CPM Growth Systems (Charlie Marshall)

1. PROBLEM
${cs.problem}

2. BASELINE (how it works today)
${cs.baseline ?? "To be documented during the mapping call before build starts."}

3. WHAT WILL BE BUILT
${cs.proposedBuild}

4. SUCCESS METRIC (agreed before build)
${cs.successMetric}

5. DATA & ACCESS REQUIRED
${cs.dataRequired ?? "To be confirmed during mapping."}

6. COMMERCIALS
- The initial build is delivered at no cost.
- If it delivers a measurable result against the metric above, CPM will ask for permission to document the outcome as a case study.
- Publishing requires written approval; redactions honoured${cs.redactionRequirements ? ` (noted: ${cs.redactionRequirements})` : ""}.
- Either side can stop at any point; anything built remains with the client.

7. HUMAN OVERSIGHT
Every step that sends anything externally or changes live data includes a human approval point on the client side.

Agreed by (client): ______________  Date: ______
Agreed by (CPM): ________________  Date: ______`,
      };
    }
    case "success_metric": {
      const missing = need(cs, [
        ["companyName", "Company name"],
        ["successMetric", "Success metric"],
        ["baseline", "Baseline"],
      ]);
      if (missing.length) return { ok: false, missing };
      return {
        ok: true,
        title: `Success metric — ${cs.companyName}`,
        warnings: [],
        body: `SUCCESS-METRIC DEFINITION

Client: ${cs.companyName}

METRIC
${cs.successMetric}

BASELINE (measured before the build)
${cs.baseline}

MEASUREMENT APPROACH
- Baseline recorded before go-live (evidence: ${cs.beforeEvidence ?? "to be captured"}).
- Same measurement repeated after a stable period on the new process.
- Both sides see the same numbers; nothing is claimed that isn't measured.

WHAT COUNTS AS SUCCESS
A measurable improvement on the metric above, confirmed by the client.`,
      };
    }
    case "completion_summary": {
      const missing = need(cs, [
        ["companyName", "Company name"],
        ["problem", "Problem"],
        ["proposedBuild", "Proposed build"],
      ]);
      if (missing.length) return { ok: false, missing };
      const outcomes = evidencedOutcomes(cs);
      const warnings: string[] = [];
      if (!outcomes.hasAny)
        warnings.push(
          "No evidenced outcomes yet (outcome fields + after-evidence are empty) — the summary states results are pending rather than claiming any.",
        );
      return {
        ok: true,
        title: `Completion summary — ${cs.companyName}`,
        warnings,
        body: `BUILD COMPLETION SUMMARY

Client: ${cs.companyName}

PROBLEM
${cs.problem}

WHAT WAS BUILT
${cs.proposedBuild}

BASELINE
${cs.baseline ?? "Not formally recorded."}

MEASURED OUTCOMES
${outcomes.hasAny ? outcomes.lines.map((l) => `- ${l}`).join("\n") : "- Measurement in progress — no outcomes are claimed until evidence is recorded."}
${cs.qualitativeFeedback ? `\nCLIENT FEEDBACK\n"${cs.qualitativeFeedback}"` : ""}

EVIDENCE ON FILE
- Before: ${cs.beforeEvidence ?? "—"}
- After: ${cs.afterEvidence ?? "—"}`,
      };
    }
    case "testimonial_request": {
      const missing = need(cs, [["companyName", "Company name"]]);
      if (missing.length) return { ok: false, missing };
      return {
        ok: true,
        title: `Testimonial request — ${cs.companyName}`,
        warnings: [],
        body: `Hi,

Now the build has settled in, would you be up for a two-line testimonial? Something honest about what changed day-to-day is worth far more to me than polish.

If it's easier, I can draft something from your own words for you to edit or bin entirely.

And to be clear — whatever you say, nothing gets published anywhere without your explicit OK.

Cheers,
Charlie`,
      };
    }
    case "linkedin_post": {
      const missing = need(cs, [
        ["companyName", "Company name"],
        ["problem", "Problem"],
        ["proposedBuild", "Proposed build"],
      ]);
      if (missing.length) return { ok: false, missing };
      if (!cs.permissionToPublish)
        return { ok: false, missing: ["Permission to publish (the client hasn't approved publication — this is required before drafting a public post)"] };
      const outcomes = evidencedOutcomes(cs);
      const name = cs.redactionRequirements?.toLowerCase().includes("name") ? "a client" : cs.companyName;
      return {
        ok: true,
        title: `LinkedIn post — ${cs.companyName}`,
        warnings: outcomes.hasAny ? [] : ["No evidenced outcomes — the post focuses on the problem and build, with results 'being measured'."],
        body: `The problem: ${cs.problem}

That was the situation at ${name} before we mapped the process properly.

What we built: ${cs.proposedBuild}

The important design choice: every consequential step keeps a human approval point. Automation does the repetitive work; judgement stays with people.

${outcomes.hasAny ? `The result:\n${outcomes.lines.map((l) => `→ ${l}`).join("\n")}` : "Results are being measured against a metric we agreed before building — I'll share numbers when they're real."}
${cs.qualitativeFeedback ? `\nIn their words: "${cs.qualitativeFeedback}"` : ""}

If a repetitive process is quietly eating your team's week, the first step is mapping it honestly — happy to compare notes.`,
      };
    }
    case "portfolio_entry": {
      const missing = need(cs, [
        ["companyName", "Company name"],
        ["problem", "Problem"],
        ["baseline", "Baseline"],
        ["proposedBuild", "Proposed build"],
        ["successMetric", "Success metric"],
      ]);
      if (missing.length) return { ok: false, missing };
      const outcomes = evidencedOutcomes(cs);
      const name = cs.redactionRequirements?.toLowerCase().includes("name") ? "Client (name withheld)" : cs.companyName;
      return {
        ok: true,
        title: `Portfolio case study — ${cs.companyName}`,
        warnings: outcomes.hasAny ? [] : ["No evidenced outcomes — portfolio entry marks results as pending."],
        body: `# ${name}: ${cs.problem?.slice(0, 80)}

## The problem
${cs.problem}

## Before
${cs.baseline}

## What CPM built
${cs.proposedBuild}

## Success metric (agreed up front)
${cs.successMetric}

## Outcomes
${outcomes.hasAny ? outcomes.lines.map((l) => `- **${l}**`).join("\n") : "- Measurement in progress; this entry is updated only with evidenced numbers."}
${cs.qualitativeFeedback ? `\n> "${cs.qualitativeFeedback}"` : ""}

## Design principles
Deterministic automation for the repetitive steps, AI assistance where language is involved, and human approval on everything consequential.`,
      };
    }
    case "phase2_proposal": {
      const missing = need(cs, [
        ["companyName", "Company name"],
        ["proposedBuild", "Proposed build"],
      ]);
      if (missing.length) return { ok: false, missing };
      const outcomes = evidencedOutcomes(cs);
      return {
        ok: true,
        title: `Phase-two proposal — ${cs.companyName}`,
        warnings: outcomes.hasAny ? [] : ["No evidenced outcomes yet — phase-two proposals land far better with measured results. Consider waiting."],
        body: `PHASE TWO — PROPOSAL

Client: ${cs.companyName}

WHERE WE ARE
The initial build (${cs.proposedBuild}) is live.${outcomes.hasAny ? ` Measured so far:\n${outcomes.lines.map((l) => `- ${l}`).join("\n")}` : " Results are being measured."}

WHAT PHASE TWO COVERS
${cs.paidFollowOn ?? "The adjacent processes identified during the build — to be scoped together."}

APPROACH
Same principles as phase one: mapped first, agreed metric, human approval points, measured honestly. The difference: phase two is paid work, priced after a short scoping call with clear deliverables.

NEXT STEP
A 30-minute review of phase-one numbers and phase-two scope. If the numbers don't justify it, I'll say so.`,
      };
    }
    case "retainer_offer": {
      const missing = need(cs, [["companyName", "Company name"]]);
      if (missing.length) return { ok: false, missing };
      return {
        ok: true,
        title: `Retainer offer — ${cs.companyName}`,
        warnings: [],
        body: `ONGOING SUPPORT — RETAINER OFFER

Client: ${cs.companyName}

WHAT IT COVERS
- Monitoring and maintenance of the automation(s) in place
- Small improvements and adjustments as your process evolves
- Priority response when something needs attention
- A monthly summary of runs, exceptions and time saved

WHAT IT COSTS
A flat monthly fee agreed up front — sized to the systems in place, reviewed every quarter, cancellable monthly.

WHY IT EXISTS
Automations degrade when the world changes around them (APIs, formats, volumes). A small amount of continuous attention keeps the value compounding instead of decaying.`,
      };
    }
  }
}

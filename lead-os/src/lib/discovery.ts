/**
 * Discovery engine rules: field definitions, completeness scoring,
 * next-best-question selection (with the reason shown), and the
 * build-recommendation gate.
 */

import type { Discovery } from "@/db/schema";

export type DiscoveryFieldKey =
  | "problemStatement"
  | "currentWorkflow"
  | "trigger"
  | "inputs"
  | "steps"
  | "tools"
  | "peopleInvolved"
  | "processOwner"
  | "decisionPoints"
  | "exceptions"
  | "outputs"
  | "volume"
  | "frequency"
  | "timeConsumed"
  | "errorRate"
  | "costEstimate"
  | "revenueImpact"
  | "customerImpact"
  | "complianceRisk"
  | "humanJudgement"
  | "desiredOutcome"
  | "constraints"
  | "accessRequired"
  | "dataSensitivity"
  | "successMetrics";

export type DiscoveryField = {
  key: DiscoveryFieldKey;
  label: string;
  question: string;
  why: string;
  weight: number; // contribution to completeness
  essential: boolean; // required before recommending a build
};

export const DISCOVERY_FIELDS: DiscoveryField[] = [
  { key: "problemStatement", label: "Problem statement", question: "In their words, what is the problem?", why: "Everything else hangs off a clearly stated problem.", weight: 10, essential: true },
  { key: "currentWorkflow", label: "Current workflow", question: "How are you currently handling that?", why: "You can't improve a process you can't describe.", weight: 8, essential: true },
  { key: "trigger", label: "Trigger", question: "What kicks the process off each time?", why: "The trigger defines where an automation would start.", weight: 4, essential: false },
  { key: "inputs", label: "Inputs", question: "What information or files go into it?", why: "Inputs determine integrations and data quality risks.", weight: 4, essential: false },
  { key: "steps", label: "Steps", question: "What are the actual steps, start to finish?", why: "Steps reveal which parts are deterministic vs judgement.", weight: 6, essential: false },
  { key: "tools", label: "Tools", question: "What tools are involved?", why: "Tooling decides feasibility and build effort.", weight: 5, essential: false },
  { key: "peopleInvolved", label: "People involved", question: "Who touches this process along the way?", why: "Handovers are where time and errors hide.", weight: 3, essential: false },
  { key: "processOwner", label: "Process owner", question: "Who owns that process?", why: "A build needs an owner on their side.", weight: 6, essential: true },
  { key: "decisionPoints", label: "Decision points", question: "Where do people have to make judgement calls?", why: "Judgement points must stay human — they shape the design.", weight: 5, essential: false },
  { key: "exceptions", label: "Exceptions", question: "What are the odd cases that don't fit the normal flow?", why: "Exceptions decide how much of the process can safely automate.", weight: 4, essential: false },
  { key: "outputs", label: "Outputs", question: "What does the process produce at the end?", why: "The output defines what 'done' means.", weight: 4, essential: false },
  { key: "volume", label: "Volume", question: "Roughly how many times per week/month does this happen?", why: "Volume × time = the size of the prize.", weight: 6, essential: true },
  { key: "frequency", label: "Frequency", question: "How often does it happen?", why: "Frequency shapes scheduling and urgency.", weight: 4, essential: false },
  { key: "timeConsumed", label: "Time consumed", question: "Roughly how much time does it consume each cycle?", why: "Time saved is the headline metric for the case study.", weight: 6, essential: true },
  { key: "errorRate", label: "Error rate", question: "What tends to go wrong, and how often?", why: "Error reduction is often worth more than time saved.", weight: 4, essential: false },
  { key: "costEstimate", label: "Cost", question: "What does this cost in wages or lost work, roughly?", why: "A rough £ figure anchors the commercial conversation.", weight: 3, essential: false },
  { key: "revenueImpact", label: "Revenue impact", question: "Does it ever cost you revenue — missed orders, slow quotes?", why: "Revenue impact upgrades a niggle to a priority.", weight: 3, essential: false },
  { key: "customerImpact", label: "Customer impact", question: "Do customers ever feel it when this goes wrong or late?", why: "Customer-visible pain gets budget faster.", weight: 3, essential: false },
  { key: "complianceRisk", label: "Compliance risk", question: "Any regulated data or compliance angle here?", why: "Compliance shapes what can be automated and how.", weight: 3, essential: false },
  { key: "humanJudgement", label: "Human judgement", question: "Which parts genuinely require human judgement?", why: "The design keeps these manual — knowing them is non-negotiable.", weight: 6, essential: true },
  { key: "desiredOutcome", label: "Desired outcome", question: "What would an ideal outcome look like?", why: "Their definition of success, not ours.", weight: 6, essential: true },
  { key: "constraints", label: "Constraints", question: "Any constraints — budget, tools you must keep, timing?", why: "Constraints kill builds late if not surfaced early.", weight: 3, essential: false },
  { key: "accessRequired", label: "Access required", question: "What systems would we need access to, and is that feasible?", why: "No access, no automation — this gates the build.", weight: 6, essential: true },
  { key: "dataSensitivity", label: "Data sensitivity", question: "How sensitive is the data involved?", why: "Sensitivity drives security design and redaction.", weight: 3, essential: false },
  { key: "successMetrics", label: "Success metrics", question: "How would we measure that it worked?", why: "A case study needs a number both sides agreed up front.", weight: 6, essential: true },
];

const filled = (v: string | null | undefined): boolean => !!v && v.trim().length >= 3;

export function computeDiscoveryCompleteness(d: Partial<Discovery>): number {
  let got = 0;
  let total = 0;
  for (const f of DISCOVERY_FIELDS) {
    total += f.weight;
    if (filled(d[f.key as keyof Discovery] as string | null | undefined)) got += f.weight;
  }
  return Math.round((got / total) * 100);
}

export function nextDiscoveryQuestion(d: Partial<Discovery>): { field: DiscoveryField; reason: string } | null {
  // Essentials first (in listed order), then highest-weight remaining.
  const missingEssential = DISCOVERY_FIELDS.find((f) => f.essential && !filled(d[f.key as keyof Discovery] as string | null));
  if (missingEssential) {
    return {
      field: missingEssential,
      reason: `${missingEssential.why} It's one of the minimum requirements before recommending any build.`,
    };
  }
  const remaining = DISCOVERY_FIELDS.filter((f) => !filled(d[f.key as keyof Discovery] as string | null)).sort(
    (a, b) => b.weight - a.weight,
  );
  if (remaining.length === 0) return null;
  return { field: remaining[0]!, reason: remaining[0]!.why };
}

export type BuildGate = { ok: boolean; missing: Array<{ label: string; why: string }> };

/** Brief §5.8: minimum requirements before recommending automation. */
export function canRecommendBuild(d: Partial<Discovery>): BuildGate {
  const missing: Array<{ label: string; why: string }> = [];
  const need = (key: DiscoveryFieldKey, label: string, why: string) => {
    if (!filled(d[key as keyof Discovery] as string | null)) missing.push({ label, why });
  };
  need("currentWorkflow", "Defined process", "The current workflow must be described.");
  need("processOwner", "Clear owner", "Someone on their side must own the process.");
  if (!filled(d.volume as string | null) && !filled(d.frequency as string | null))
    missing.push({ label: "Known frequency or volume", why: "Without volume or frequency the value can't be sized." });
  need("problemStatement", "Identifiable pain", "The problem must be stated, not assumed.");
  need("desiredOutcome", "Measurable desired outcome", "Their definition of success is required.");
  need("accessRequired", "Feasible data access", "Access to the systems involved must be understood.");
  need("humanJudgement", "Known human-review requirements", "The judgement steps that stay human must be identified.");
  need("successMetrics", "Success metrics", "A measurable success metric must be agreed.");
  return { ok: missing.length === 0, missing };
}

import { describe, expect, it } from "vitest";
import { canRecommendBuild, computeDiscoveryCompleteness, nextDiscoveryQuestion } from "./discovery";

describe("discovery engine", () => {
  it("is 0% complete when empty and asks for the problem statement first", () => {
    expect(computeDiscoveryCompleteness({})).toBe(0);
    const next = nextDiscoveryQuestion({})!;
    expect(next.field.key).toBe("problemStatement");
    expect(next.reason).toMatch(/minimum requirements/);
  });

  it("asks essentials before high-weight optional fields", () => {
    const partial = { problemStatement: "Reports are manual", currentWorkflow: "Export and paste weekly" };
    const next = nextDiscoveryQuestion(partial)!;
    expect(next.field.essential).toBe(true);
    expect(next.field.key).toBe("processOwner");
  });

  it("refuses to recommend a build until all minimums are met", () => {
    const gate = canRecommendBuild({ problemStatement: "Manual reports" });
    expect(gate.ok).toBe(false);
    expect(gate.missing.map((m) => m.label)).toContain("Feasible data access");
  });

  it("opens the gate once every minimum requirement is filled", () => {
    const gate = canRecommendBuild({
      problemStatement: "Manual weekly reports",
      currentWorkflow: "Export from WMS, paste into Sheets",
      processOwner: "Sarah",
      volume: "40 per week",
      desiredOutcome: "Reports build themselves",
      accessRequired: "WMS API",
      humanJudgement: "Anomaly review stays human",
      successMetrics: "Friday time under 1 hour",
    });
    expect(gate.ok).toBe(true);
    expect(gate.missing).toHaveLength(0);
  });

  it("returns null next question only when everything is answered", () => {
    const full: Record<string, string> = {};
    for (const key of [
      "problemStatement","currentWorkflow","trigger","inputs","steps","tools","peopleInvolved","processOwner","decisionPoints","exceptions","outputs","volume","frequency","timeConsumed","errorRate","costEstimate","revenueImpact","customerImpact","complianceRisk","humanJudgement","desiredOutcome","constraints","accessRequired","dataSensitivity","successMetrics",
    ]) full[key] = "answered";
    expect(nextDiscoveryQuestion(full)).toBeNull();
    expect(computeDiscoveryCompleteness(full)).toBe(100);
  });
});

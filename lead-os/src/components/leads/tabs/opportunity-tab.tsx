import type { LeadDetail } from "@/server/lead-detail";
import { canRecommendBuild } from "@/lib/discovery";
import { OpportunityPanels } from "./opportunity-panels";

export function OpportunityTab({ detail }: { detail: LeadDetail }) {
  const gate = canRecommendBuild(detail.discovery ?? {});
  return (
    <OpportunityPanels
      lead={detail.lead}
      autoOpps={detail.autoOpps}
      nodes={detail.workflowNodes}
      edges={detail.workflowEdges}
      opportunities={detail.opportunities}
      gateOk={gate.ok}
      gateMissing={gate.missing}
      pains={detail.pains}
    />
  );
}

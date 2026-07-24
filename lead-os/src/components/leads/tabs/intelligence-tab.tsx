import type { LeadDetail } from "@/server/lead-detail";
import { apolloConfigured } from "@/lib/enrichment/apollo";
import { IntelligencePanels } from "./intelligence-panels";

export function IntelligenceTab({ detail }: { detail: LeadDetail }) {
  return (
    <IntelligencePanels
      lead={detail.lead}
      company={detail.company}
      scores={detail.scores}
      research={detail.research}
      signals={detail.signals}
      pains={detail.pains}
      apolloConfigured={apolloConfigured()}
    />
  );
}

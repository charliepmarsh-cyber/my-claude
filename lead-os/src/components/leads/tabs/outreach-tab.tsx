import type { LeadDetail } from "@/server/lead-detail";
import { aiMode } from "@/lib/ai";
import { OutreachPanels } from "./outreach-panels";

export function OutreachTab({ detail }: { detail: LeadDetail }) {
  return (
    <OutreachPanels
      lead={detail.lead}
      messages={detail.messages}
      aiAvailable={aiMode() === "anthropic"}
    />
  );
}

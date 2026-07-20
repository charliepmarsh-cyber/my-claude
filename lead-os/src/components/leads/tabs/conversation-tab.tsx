import type { LeadDetail } from "@/server/lead-detail";
import { ConversationPanels } from "./conversation-panels";

export function ConversationTab({ detail }: { detail: LeadDetail }) {
  return (
    <ConversationPanels
      lead={detail.lead}
      entries={detail.entries}
      analyses={detail.analyses}
      conversation={detail.conversation}
    />
  );
}

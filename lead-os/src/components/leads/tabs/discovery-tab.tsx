import type { LeadDetail } from "@/server/lead-detail";
import { DiscoveryPanel } from "./discovery-panel";

export function DiscoveryTab({ detail }: { detail: LeadDetail }) {
  return <DiscoveryPanel lead={detail.lead} discovery={detail.discovery} />;
}

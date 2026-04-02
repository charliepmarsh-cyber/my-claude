import { nanoid } from "nanoid";

export function generateLeadId(): string {
  return `lead_${nanoid(12)}`;
}

export function generateDraftId(): string {
  return `draft_${nanoid(10)}`;
}

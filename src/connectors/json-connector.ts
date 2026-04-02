import { readFileSync, writeFileSync } from "fs";
import type { Lead } from "../types/index.js";
import { Lead as LeadSchema } from "../types/index.js";
import { log } from "../lib/logger.js";

/**
 * Import leads from a JSON file.
 * Validates each lead against the schema.
 */
export function importFromJson(filePath: string): Lead[] {
  const raw = readFileSync(filePath, "utf-8");
  const data = JSON.parse(raw);

  const records = Array.isArray(data) ? data : data.leads || [data];
  log.info(`Parsed ${records.length} records from ${filePath}`);

  const leads: Lead[] = [];
  for (const record of records) {
    try {
      const lead = LeadSchema.parse(record);
      leads.push(lead);
    } catch (err) {
      log.warn(`Skipping invalid lead record: ${(err as Error).message}`);
    }
  }

  return leads;
}

/**
 * Export leads to a JSON file.
 */
export function exportToJson(leads: Lead[], filePath: string): void {
  writeFileSync(filePath, JSON.stringify(leads, null, 2), "utf-8");
  log.success(`Exported ${leads.length} leads to ${filePath}`);
}

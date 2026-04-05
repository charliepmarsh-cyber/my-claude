import { log } from "./logger.js";

interface ConnectorKeyStatus {
  apollo: boolean;
  builtwith: boolean;
  hunter: boolean;
}

/**
 * Check which discovery connector API keys are configured.
 * Warns about missing keys but does NOT fail — connectors are optional.
 * Only fails if a specific source is requested but its key is missing.
 */
export function checkConnectorKeys(requestedSources?: string[]): ConnectorKeyStatus {
  const status: ConnectorKeyStatus = {
    apollo: !!process.env.APOLLO_API_KEY?.trim(),
    builtwith: !!process.env.BUILTWITH_API_KEY?.trim(),
    hunter: !!process.env.HUNTER_API_KEY?.trim(),
  };

  // Report status
  const missing: string[] = [];
  if (!status.apollo) missing.push("APOLLO_API_KEY");
  if (!status.builtwith) missing.push("BUILTWITH_API_KEY");
  if (!status.hunter) missing.push("HUNTER_API_KEY");

  if (missing.length > 0) {
    log.info(`Discovery keys not set: ${missing.join(", ")} (those connectors will be skipped)`);
  }

  // If specific sources were requested, ensure their keys are present
  if (requestedSources) {
    for (const source of requestedSources) {
      if (source === "apollo" && !status.apollo) {
        throw new Error("APOLLO_API_KEY is required when --source apollo is specified. Add it to your .env file.");
      }
      if (source === "builtwith" && !status.builtwith) {
        throw new Error("BUILTWITH_API_KEY is required when --source builtwith is specified. Add it to your .env file.");
      }
      // jobsignals doesn't need a key
    }
  }

  return status;
}

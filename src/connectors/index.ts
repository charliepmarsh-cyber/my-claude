// Existing I/O connectors
export { importFromCsv, exportToCsv } from "./csv-connector.js";
export { importFromJson, exportToJson } from "./json-connector.js";

// Discovery types and interfaces
export type {
  LeadSourceConnector,
  DiscoveryParams,
  RawLead,
  DiscoveryStats,
} from "./discovery-types.js";

// Discovery connectors
export { apolloConnector } from "./apollo.js";
export { builtWithConnector } from "./builtwith.js";
export { jobSignalConnector } from "./jobsignals.js";

// Utilities
export { rawLeadToLead, extractDomain } from "./lead-mapper.js";
export { ConnectorHttpClient, ConnectorAuthError } from "./http-client.js";

// Registry of all discovery connectors
import { apolloConnector } from "./apollo.js";
import { builtWithConnector } from "./builtwith.js";
import { jobSignalConnector } from "./jobsignals.js";
import type { LeadSourceConnector } from "./discovery-types.js";

export const DISCOVERY_CONNECTORS: Record<string, LeadSourceConnector> = {
  apollo: apolloConnector,
  builtwith: builtWithConnector,
  jobsignals: jobSignalConnector,
};

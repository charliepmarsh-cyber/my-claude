import type { Lead, LeadSegment } from "../types/index.js";

/**
 * ICP (Ideal Customer Profile) definitions per segment.
 * Each profile lists positive signals, negative signals, and exclusion criteria.
 */

export interface IcpProfile {
  segment: LeadSegment;
  description: string;
  positiveSignals: IcpSignal[];
  negativeSignals: IcpSignal[];
  exclusionCriteria: string[];
}

export interface IcpSignal {
  signal: string;
  weight: number; // 1-10
  category: "fit" | "opportunity" | "urgency";
  description: string;
}

export const ICP_PROFILES: IcpProfile[] = [
  // ── Shopify Store Owners ──────────────────────────────────
  {
    segment: "shopify",
    description: "Shopify store owners with enough operational complexity to benefit from automation",
    positiveSignals: [
      { signal: "shopify_platform", weight: 8, category: "fit", description: "Confirmed Shopify store" },
      { signal: "multiple_products", weight: 6, category: "fit", description: "50+ products in catalog" },
      { signal: "multi_channel_selling", weight: 7, category: "opportunity", description: "Sells on multiple channels (Shopify + Amazon, eBay, etc.)" },
      { signal: "custom_fulfillment", weight: 7, category: "opportunity", description: "Complex fulfillment (multi-warehouse, dropship, 3PL)" },
      { signal: "growing_team", weight: 6, category: "urgency", description: "Hiring ops/CS/fulfillment roles" },
      { signal: "app_stack_fragmented", weight: 8, category: "opportunity", description: "Many disconnected Shopify apps" },
      { signal: "manual_processes_visible", weight: 9, category: "opportunity", description: "Signs of manual reporting, order management, or support" },
      { signal: "review_volume", weight: 5, category: "fit", description: "Significant review/feedback volume indicating scale" },
      { signal: "recent_growth", weight: 7, category: "urgency", description: "Signs of rapid growth (new products, expanded shipping, funding)" },
      { signal: "subscription_model", weight: 6, category: "fit", description: "Subscription/recurring revenue model adds ops complexity" },
    ],
    negativeSignals: [
      { signal: "brand_new_store", weight: -5, category: "fit", description: "Store less than 3 months old, likely too early" },
      { signal: "single_product", weight: -3, category: "fit", description: "Single product, limited complexity" },
      { signal: "dropship_only_low_volume", weight: -4, category: "fit", description: "Low-volume dropshipping with no real ops needs" },
    ],
    exclusionCriteria: [
      "Store is clearly inactive/abandoned",
      "Store appears to be a scam or selling prohibited items",
      "Contact information is clearly fake/invalid",
    ],
  },

  // ── Ecommerce Brands ──────────────────────────────────────
  {
    segment: "ecommerce",
    description: "Ecommerce brands with growing operational complexity across platforms",
    positiveSignals: [
      { signal: "ecommerce_platform", weight: 7, category: "fit", description: "Runs on a known ecommerce platform" },
      { signal: "multi_platform", weight: 8, category: "opportunity", description: "Sells across multiple platforms" },
      { signal: "warehouse_complexity", weight: 8, category: "opportunity", description: "Multiple warehouses or complex fulfillment" },
      { signal: "team_size_11_plus", weight: 7, category: "fit", description: "Team of 11+ suggests operational needs" },
      { signal: "customer_support_scale", weight: 8, category: "opportunity", description: "High support volume / ticketing needs" },
      { signal: "marketing_automation_need", weight: 6, category: "opportunity", description: "Running campaigns across channels without automation" },
      { signal: "data_reporting_gaps", weight: 7, category: "opportunity", description: "Signs of manual reporting or disconnected analytics" },
      { signal: "hiring_ops_roles", weight: 8, category: "urgency", description: "Hiring for operations, CX, growth, or automation roles" },
      { signal: "recent_funding", weight: 7, category: "urgency", description: "Recent funding or investment" },
      { signal: "international_expansion", weight: 6, category: "urgency", description: "Expanding internationally, adding complexity" },
      { signal: "erp_integration_need", weight: 7, category: "opportunity", description: "Signs of needing better system integration" },
    ],
    negativeSignals: [
      { signal: "pre_revenue", weight: -6, category: "fit", description: "Pre-revenue startup, not ready for automation" },
      { signal: "highly_automated_already", weight: -5, category: "opportunity", description: "Already heavily automated (unlikely to need help)" },
    ],
    exclusionCriteria: [
      "Company is pre-launch with no customers",
      "Business appears to be shutting down",
      "Contact data is non-existent or clearly invalid",
    ],
  },

  // ── Enterprise Prospects ──────────────────────────────────
  {
    segment: "enterprise",
    description: "Larger businesses that could benefit from enterprise automation packages",
    positiveSignals: [
      { signal: "team_size_200_plus", weight: 8, category: "fit", description: "200+ employees" },
      { signal: "complex_operations", weight: 9, category: "opportunity", description: "Multi-department, multi-system operations" },
      { signal: "legacy_systems", weight: 7, category: "opportunity", description: "Running on legacy or outdated systems" },
      { signal: "digital_transformation", weight: 8, category: "urgency", description: "Active digital transformation initiative" },
      { signal: "multiple_business_units", weight: 7, category: "fit", description: "Multiple BUs or product lines" },
      { signal: "compliance_needs", weight: 6, category: "fit", description: "Regulated industry with compliance automation needs" },
      { signal: "hiring_tech_leadership", weight: 8, category: "urgency", description: "Hiring CTO, VP Eng, Head of Ops, etc." },
      { signal: "manual_workflows_at_scale", weight: 9, category: "opportunity", description: "Running manual processes at enterprise scale" },
      { signal: "recent_acquisition", weight: 7, category: "urgency", description: "Recent M&A means system integration needs" },
      { signal: "customer_base_large", weight: 6, category: "fit", description: "Large customer base means support/ops scale" },
    ],
    negativeSignals: [
      { signal: "already_has_automation_team", weight: -4, category: "opportunity", description: "Already has internal automation team" },
      { signal: "tech_company_building_own", weight: -5, category: "opportunity", description: "Tech company likely to build in-house" },
    ],
    exclusionCriteria: [
      "Company is in active layoffs/downsizing",
      "Company is a direct competitor",
      "No identifiable decision maker contact",
    ],
  },
];

/**
 * Get the ICP profile for a given segment.
 */
export function getIcpProfile(segment: LeadSegment): IcpProfile {
  const profile = ICP_PROFILES.find((p) => p.segment === segment);
  if (!profile) throw new Error(`No ICP profile for segment: ${segment}`);
  return profile;
}

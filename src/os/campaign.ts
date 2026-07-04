/**
 * Active campaign definition — the single source of truth for who the
 * pipeline sells for and who it targets. The OS dashboard, marketing
 * generators, and overview endpoint all read from here.
 */

export interface CampaignDefinition {
  key: string;
  name: string;
  product: string;
  productUrl: string;
  ctaUrl: string;
  tagline: string;
  positioning: string;
  offer: string;
  icp: {
    summary: string;
    platforms: string[];
    revenueRange: string;
    markets: string[];
    keySignals: string[];
  };
  brand: {
    navy: string;
    cyan: string;
    green: string;
  };
}

export const CORTEXCART_CAMPAIGN: CampaignDefinition = {
  key: "cortexcart",
  name: "Stop Guessing. Start Growing.",
  product: "CortexCart — AI analytics dashboard for Shopify stores",
  productUrl: "https://www.cortexcart.com",
  ctaUrl: "https://tracker.cortexcart.com",
  tagline: "Stop guessing. Start growing.",
  positioning:
    "Triple Whale money is for enterprises. CortexCart gives the same clarity to the store owner doing £10k–£200k a month — one dashboard, every channel, and AI that answers the 'why', not just the 'what'. AWS-backed, NVIDIA Inception.",
  offer: "Free during beta — early access, no risk.",
  icp: {
    summary:
      "Ecommerce founders/operators on Shopify or WooCommerce doing £10k–£250k/mo, running paid traffic (Meta/Google), feeling the 'why gap': traffic is up, profit isn't, and the answer is buried in spreadsheets.",
    platforms: ["Shopify", "WooCommerce"],
    revenueRange: "£10k–£250k/mo",
    markets: ["UK", "US", "CA", "AU", "NZ", "IE"],
    keySignals: [
      "Running Meta/Google ads (feels the why-gap)",
      "Multi-channel social presence",
      "50+ products or multi-platform selling",
      "Fragmented analytics/app stack",
      "Hiring for ops/marketing roles",
    ],
  },
  brand: {
    navy: "#0a1628",
    cyan: "#22d3ee",
    green: "#34d399",
  },
};

export function getActiveCampaign(): CampaignDefinition {
  return CORTEXCART_CAMPAIGN;
}

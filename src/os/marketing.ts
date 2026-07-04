import { existsSync, readdirSync, statSync } from "fs";
import { join, extname } from "path";
import { callLlmJson } from "../lib/llm.js";
import { getActiveCampaign } from "./campaign.js";
import { saveMarketingContent, type MarketingContentRow } from "./os-store.js";

/**
 * Marketing department: indexes the shipped campaign assets on disk and
 * generates on-brand content (social posts, outreach angles, Higgsfield
 * b-roll prompts) with Claude. Generated content is stored for reuse.
 */

// ── Asset index ─────────────────────────────────────────────────

const DEFAULT_ASSETS_DIR = "C:/Users/charl/Desktop/cortexcart-campaign";

export interface CampaignAsset {
  name: string;
  path: string;
  kind: "video" | "image" | "audio" | "doc" | "other";
  sizeBytes: number;
}

const KIND_BY_EXT: Record<string, CampaignAsset["kind"]> = {
  ".mp4": "video",
  ".mov": "video",
  ".png": "image",
  ".jpg": "image",
  ".jpeg": "image",
  ".wav": "audio",
  ".mp3": "audio",
  ".md": "doc",
  ".pdf": "doc",
};

export function getAssetsDir(): string {
  return process.env.CAMPAIGN_ASSETS_DIR || DEFAULT_ASSETS_DIR;
}

export function indexCampaignAssets(): { dir: string; available: boolean; assets: CampaignAsset[] } {
  const dir = getAssetsDir();
  if (!existsSync(dir)) {
    return { dir, available: false, assets: [] };
  }

  const assets: CampaignAsset[] = [];
  // Top level + assets/ subfolder; skip source-analysis working files
  const scanDirs = [dir, join(dir, "assets")];
  for (const scanDir of scanDirs) {
    if (!existsSync(scanDir)) continue;
    for (const name of readdirSync(scanDir)) {
      const full = join(scanDir, name);
      const stat = statSync(full);
      if (stat.isDirectory()) continue;
      const ext = extname(name).toLowerCase();
      assets.push({
        name,
        path: full,
        kind: KIND_BY_EXT[ext] ?? "other",
        sizeBytes: stat.size,
      });
    }
  }
  return { dir, available: true, assets };
}

// ── Content generation ──────────────────────────────────────────

export type MarketingKind = "social_post" | "outreach_angle" | "higgsfield_prompts";

export const MARKETING_KINDS: MarketingKind[] = ["social_post", "outreach_angle", "higgsfield_prompts"];

interface GeneratedItem {
  title: string;
  platform?: string;
  body: string;
  notes?: string;
}

function systemPrompt(): string {
  const c = getActiveCampaign();
  return `You are the marketing department for ${c.product}.
Campaign: "${c.tagline}" — ${c.positioning}
Offer: ${c.offer} CTA: ${c.ctaUrl}
ICP: ${c.icp.summary}

Voice: founder talking to founders. Short sentences, no corporate speak, no hype words ("game-changer", "revolutionary", "leverage", "streamline"). Concrete beats clever. UK spelling.`;
}

function buildPrompt(kind: MarketingKind, topic: string | undefined, count: number): string {
  const topicLine = topic ? `Topic/angle to build around: ${topic}` : "Pick strong angles yourself from the campaign story (The Guess → The Turn → The Growth).";

  switch (kind) {
    case "social_post":
      return `Write ${count} social posts promoting CortexCart. Mix of LinkedIn (longer, story-led) and X (short, punchy). ${topicLine}

Each post must land one idea: the "why gap" — traffic up, profit flat, answer buried in spreadsheets — and how CortexCart answers the why in plain English. End with a soft CTA to the free beta.

JSON: { "items": [ { "title": "...", "platform": "linkedin|x", "body": "...", "notes": "posting tip" } ] }`;

    case "outreach_angle":
      return `Write ${count} cold-outreach opening angles for the sales pipeline. ${topicLine}

Each angle is a reusable opener pattern (not a full email): the hook, why it works, and a 1-2 sentence example opener. Angles must work for Shopify/WooCommerce store owners running paid ads. Never invent facts about the recipient.

JSON: { "items": [ { "title": "angle name", "body": "example opener", "notes": "why it works / when to use" } ] }`;

    case "higgsfield_prompts":
      return `Write ${count} Higgsfield (kling3_0_turbo) b-roll shot prompts extending the campaign film. ${topicLine}

Style: premium SaaS brand film — deep navy + electric cyan + growth green, anamorphic, shallow depth of field, volumetric light. Each prompt is one 5-8s shot, with camera movement and mood specified. Follow the three-beat story: The Guess (chaos) → The Turn (convergence) → The Growth (calm control).

JSON: { "items": [ { "title": "shot name", "body": "full generation prompt", "notes": "beat + suggested use (9:16 reel, 16:9 hero, 6s bumper)" } ] }`;
  }
}

export async function generateMarketingContent(
  kind: MarketingKind,
  topic: string | undefined,
  count: number,
): Promise<MarketingContentRow> {
  const boundedCount = Math.max(1, Math.min(count, 10));
  const result = await callLlmJson<{ items: GeneratedItem[] }>({
    system: systemPrompt(),
    prompt: buildPrompt(kind, topic, boundedCount),
    maxTokens: 4096,
  });

  if (!result.items || !Array.isArray(result.items) || result.items.length === 0) {
    throw new Error("LLM returned no marketing items");
  }

  return saveMarketingContent(kind, topic, result.items);
}

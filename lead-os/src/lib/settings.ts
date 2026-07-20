import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { settings } from "@/db/schema";
import { DEFAULT_SETTINGS, type SettingsShape } from "@/lib/constants";

const KEY = "app_settings";

export function getSettings(): SettingsShape {
  const db = getDb();
  const row = db.select().from(settings).where(eq(settings.key, KEY)).get();
  if (!row) return structuredClone(DEFAULT_SETTINGS) as SettingsShape;
  const stored = row.value as Partial<SettingsShape>;
  return {
    ...structuredClone(DEFAULT_SETTINGS),
    ...stored,
    scoreWeights: { ...DEFAULT_SETTINGS.scoreWeights, ...(stored.scoreWeights ?? {}) },
  } as SettingsShape;
}

export function saveSettings(next: SettingsShape): void {
  const db = getDb();
  db.insert(settings)
    .values({ key: KEY, value: next })
    .onConflictDoUpdate({ target: settings.key, set: { value: next, updatedAt: new Date() } })
    .run();
}

import type { StaticLov } from "@/services/lov.service";

export const trimToUndefined = (value: string): string | undefined => {
  const normalized = value.trim();
  return normalized || undefined;
};

export const mapStaticLovOptions = (
  lovItems: StaticLov[],
): Array<{ value: string; label: string }> => {
  return lovItems
    .filter((item) => item.code && item.description)
    .map((item) => ({
      value: String(item.code),
      label: String(item.description),
    }));
};

/** The severity tiers a risk level can fall into, ordered low → high by {@link riskLevelRank}. */
export type RiskLevelTier = "low" | "medium" | "high";

// Sort rank per tier (low → high). Single source for the Level column's severity ordering.
const RISK_LEVEL_RANK: Record<RiskLevelTier, number> = {
  low: 1,
  medium: 2,
  high: 3,
};

/**
 * Classify a risk level code or description into a severity tier, or undefined when it matches none
 * of the known H/M/L tiers. This is the single H/M/L ladder that both the pill colour
 * ({@link riskLevelPillClass}) and the sort rank ({@link riskLevelRank}) derive from, so a level's
 * colour and its sort position can never disagree.
 */
export const classifyRiskLevel = (
  value?: string | null,
): RiskLevelTier | undefined => {
  const code = (value ?? "").toUpperCase();
  if (code.includes("H")) {
    return "high";
  }
  if (code.includes("M")) {
    return "medium";
  }
  if (code.includes("L")) {
    return "low";
  }
  return undefined;
};

/** Pill CSS class for a classified tier (undefined tier → no pill). */
export const riskLevelPillClass = (tier?: RiskLevelTier): string | undefined =>
  tier ? `risk-level-pill risk-level-pill--${tier}` : undefined;

/** Severity rank for a classified tier (low=1 … high=3), or null when unclassified. */
export const riskLevelRank = (tier?: RiskLevelTier): number | null =>
  tier ? RISK_LEVEL_RANK[tier] : null;

/**
 * Pill CSS class for a raw risk level code/description, classifying it on the way. Convenience for
 * call sites that hold the raw value rather than a {@link RiskLevelTier}.
 */
export const getRiskLevelPillClass = (
  riskTypeCode?: string | null,
): string | undefined => riskLevelPillClass(classifyRiskLevel(riskTypeCode));

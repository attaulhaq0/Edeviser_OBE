// Task 148.2: League Tier utility

export type LeagueTierName = "Bronze" | "Silver" | "Gold" | "Diamond";

export interface LeagueThresholds {
  bronze: number;
  silver: number;
  gold: number;
  diamond: number;
}

export const DEFAULT_LEAGUE_THRESHOLDS: LeagueThresholds = {
  bronze: 0,
  silver: 500,
  gold: 1500,
  diamond: 4000,
};

/**
 * Determine league tier based on cumulative XP.
 */
export function getLeagueTier(
  cumulativeXP: number,
  thresholds: LeagueThresholds = DEFAULT_LEAGUE_THRESHOLDS
): LeagueTierName {
  if (cumulativeXP >= thresholds.diamond) return "Diamond";
  if (cumulativeXP >= thresholds.gold) return "Gold";
  if (cumulativeXP >= thresholds.silver) return "Silver";
  return "Bronze";
}

export const TIER_COLORS: Record<LeagueTierName, string> = {
  Bronze: "bg-amber-600 text-white",
  Silver: "bg-gray-400 text-white",
  Gold: "bg-yellow-400 text-yellow-900",
  Diamond: "bg-blue-400 text-white",
};

export const TIER_BORDER_COLORS: Record<LeagueTierName, string> = {
  Bronze: "border-amber-600",
  Silver: "border-gray-400",
  Gold: "border-yellow-400",
  Diamond: "border-blue-400",
};

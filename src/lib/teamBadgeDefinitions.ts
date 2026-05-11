// Team badge definitions for the Edeviser gamification engine.
// All team badge conditions are defined here as a single source of truth.
// Follows the same pattern as badgeDefinitions.ts.

import type { BadgeCategory, BadgeDef } from "@/lib/badgeDefinitions";

export const TEAM_BADGE_DEFINITIONS: BadgeDef[] = [
  {
    id: "team_spirit",
    name: "Team Spirit",
    description: "All members submitted an assignment on the same calendar day",
    icon: "🤝",
    category: "team" as BadgeCategory,
    isMystery: false,
    condition: "All team members submit an assignment on the same calendar day",
    xpReward: 100,
  },
  {
    id: "streak_squad",
    name: "Streak Squad",
    description: "Team maintained a 7-day streak",
    icon: "🔥",
    category: "team" as BadgeCategory,
    isMystery: false,
    condition: "Team streak reaches 7 consecutive days",
    xpReward: 75,
  },
  {
    id: "streak_champions",
    name: "Streak Champions",
    description: "Team maintained a 14-day streak",
    icon: "🏅",
    category: "team" as BadgeCategory,
    isMystery: false,
    condition: "Team streak reaches 14 consecutive days",
    xpReward: 100,
  },
  {
    id: "streak_legends",
    name: "Streak Legends",
    description: "Team maintained a 30-day streak",
    icon: "🏆",
    category: "team" as BadgeCategory,
    isMystery: false,
    condition: "Team streak reaches 30 consecutive days",
    xpReward: 150,
  },
  {
    id: "full_house",
    name: "Full House",
    description: "Team reached maximum 6 members",
    icon: "🏠",
    category: "team" as BadgeCategory,
    isMystery: false,
    condition: "Team reaches the maximum of 6 active members",
    xpReward: 50,
  },
  {
    id: "quest_conquerors",
    name: "Quest Conquerors",
    description: "Team completed 3 social challenges",
    icon: "⚔️",
    category: "team" as BadgeCategory,
    isMystery: false,
    condition: "Team completes 3 social challenges",
    xpReward: 150,
  },
  {
    id: "team_player",
    name: "Team Player",
    description: "Maintained active contribution for 14+ consecutive days",
    icon: "💪",
    category: "team" as BadgeCategory,
    isMystery: false,
    condition:
      'Maintain contribution status "active" for 14 or more consecutive days',
    xpReward: 100,
  },
];

/** Get a team badge definition by ID */
export function getTeamBadgeById(id: string): BadgeDef | undefined {
  return TEAM_BADGE_DEFINITIONS.find((b) => b.id === id);
}

/** Get all team badge IDs */
export function getAllTeamBadgeIds(): string[] {
  return TEAM_BADGE_DEFINITIONS.map((b) => b.id);
}

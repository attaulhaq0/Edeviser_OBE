// Challenge type configuration for the Social Challenges (Quests) feature.
// Defines the 5 challenge types with their goal descriptions, units, and validation rules.

export interface ChallengeTypeConfig {
  key: ChallengeTypeKey;
  label: string;
  description: string;
  goalDescription: string;
  goalUnit: string;
  fixedGoal: number | null;
  validationRules: {
    minGoal: number;
    maxGoal: number;
  };
}

export type ChallengeTypeKey =
  | "academic"
  | "habit"
  | "xp_race"
  | "blooms_climb"
  | "cooperative";

export const CHALLENGE_TYPES: Record<ChallengeTypeKey, ChallengeTypeConfig> = {
  academic: {
    key: "academic",
    label: "Academic",
    description:
      "Complete a target number of assignments within the challenge period",
    goalDescription: "Complete N assignments",
    goalUnit: "assignments",
    fixedGoal: null,
    validationRules: {
      minGoal: 1,
      maxGoal: 100,
    },
  },
  habit: {
    key: "habit",
    label: "Habit",
    description:
      "Maintain a daily streak for a target number of days during the challenge",
    goalDescription: "Maintain a streak for N days",
    goalUnit: "days",
    fixedGoal: null,
    validationRules: {
      minGoal: 1,
      maxGoal: 90,
    },
  },
  xp_race: {
    key: "xp_race",
    label: "XP Race",
    description: "First participant to earn the target XP amount wins the race",
    goalDescription: "First to earn N XP",
    goalUnit: "XP",
    fixedGoal: null,
    validationRules: {
      minGoal: 50,
      maxGoal: 10000,
    },
  },
  blooms_climb: {
    key: "blooms_climb",
    label: "Bloom's Climb",
    description:
      "Complete at least one assignment at each of the 6 Bloom's Taxonomy levels (Remembering through Creating)",
    goalDescription: "Complete all 6 Bloom's levels",
    goalUnit: "levels",
    fixedGoal: 6,
    validationRules: {
      minGoal: 6,
      maxGoal: 6,
    },
  },
  cooperative: {
    key: "cooperative",
    label: "Cooperative",
    description:
      "Team collectively works toward a shared goal without competing against other teams",
    goalDescription: "Team collectively reaches the shared goal",
    goalUnit: "units",
    fixedGoal: null,
    validationRules: {
      minGoal: 1,
      maxGoal: 10000,
    },
  },
};

/** Get all challenge type keys */
export function getChallengeTypeKeys(): ChallengeTypeKey[] {
  return Object.keys(CHALLENGE_TYPES) as ChallengeTypeKey[];
}

/** Get a challenge type config by key */
export function getChallengeType(key: ChallengeTypeKey): ChallengeTypeConfig {
  return CHALLENGE_TYPES[key];
}

/** Check if a challenge type has a fixed goal */
export function hasFixedGoal(key: ChallengeTypeKey): boolean {
  return CHALLENGE_TYPES[key].fixedGoal !== null;
}

/** Validate a goal target for a given challenge type */
export function validateGoalTarget(
  key: ChallengeTypeKey,
  goalTarget: number
): boolean {
  const config = CHALLENGE_TYPES[key];
  if (config.fixedGoal !== null) {
    return goalTarget === config.fixedGoal;
  }
  return (
    goalTarget >= config.validationRules.minGoal &&
    goalTarget <= config.validationRules.maxGoal
  );
}

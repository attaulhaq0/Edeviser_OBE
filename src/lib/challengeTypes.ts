// =============================================================================
// Challenge Type Configuration — Task 1.10
// Defines the 5 challenge types with goal descriptions, validation rules,
// and progress computation metadata.
// =============================================================================

export type ChallengeTypeId = 'academic' | 'habit' | 'xp_race' | 'blooms_climb' | 'cooperative';

export interface ChallengeTypeConfig {
  id: ChallengeTypeId;
  label: string;
  description: string;
  /** Human-readable description of what the goal_target represents */
  goalDescription: string;
  /** Unit label for the goal target (e.g., "assignments", "days", "XP") */
  goalUnit: string;
  /** Whether this type supports team participation mode */
  supportsTeam: boolean;
  /** Whether this type supports individual participation mode */
  supportsIndividual: boolean;
  /** Minimum allowed goal_target */
  minTarget: number;
  /** Maximum allowed goal_target */
  maxTarget: number;
  /** Fixed goal_target value (if set, user cannot change it) */
  fixedTarget?: number;
  /** Whether a competitive leaderboard is shown for this type */
  showsLeaderboard: boolean;
  /** Maximum concurrent active challenges of this type per course */
  maxConcurrentPerCourse: number;
  /** Whether this type requires explicit acknowledgment before creation */
  requiresAcknowledgment: boolean;
}

export const CHALLENGE_TYPES: Record<ChallengeTypeId, ChallengeTypeConfig> = {
  academic: {
    id: 'academic',
    label: 'Academic',
    description: 'Complete a target number of graded assignments within the challenge period.',
    goalDescription: 'Number of graded assignments to complete',
    goalUnit: 'assignments',
    supportsTeam: true,
    supportsIndividual: true,
    minTarget: 1,
    maxTarget: 50,
    showsLeaderboard: true,
    maxConcurrentPerCourse: 5,
    requiresAcknowledgment: false,
  },
  habit: {
    id: 'habit',
    label: 'Habit',
    description: 'Maintain a consecutive streak of daily habits during the challenge period.',
    goalDescription: 'Number of consecutive streak days',
    goalUnit: 'days',
    supportsTeam: true,
    supportsIndividual: true,
    minTarget: 3,
    maxTarget: 90,
    showsLeaderboard: true,
    maxConcurrentPerCourse: 5,
    requiresAcknowledgment: false,
  },
  xp_race: {
    id: 'xp_race',
    label: 'XP Race',
    description: 'Race to earn the most XP in the course during the challenge period. Competitive by nature.',
    goalDescription: 'Total XP to earn',
    goalUnit: 'XP',
    supportsTeam: true,
    supportsIndividual: true,
    minTarget: 100,
    maxTarget: 10000,
    showsLeaderboard: true,
    maxConcurrentPerCourse: 2,
    requiresAcknowledgment: true,
  },
  blooms_climb: {
    id: 'blooms_climb',
    label: "Bloom's Climb",
    description: 'Complete assignments at every Bloom\'s Taxonomy level (Remember through Create).',
    goalDescription: 'Distinct Bloom\'s levels with at least one graded assignment',
    goalUnit: 'levels',
    supportsTeam: true,
    supportsIndividual: true,
    minTarget: 6,
    maxTarget: 6,
    fixedTarget: 6,
    showsLeaderboard: true,
    maxConcurrentPerCourse: 3,
    requiresAcknowledgment: false,
  },
  cooperative: {
    id: 'cooperative',
    label: 'Cooperative',
    description: 'Team collectively works toward a shared goal. No competitive leaderboard — only your team\'s progress is shown.',
    goalDescription: 'Collective team goal (e.g., total XP, assignments, habits)',
    goalUnit: 'points',
    supportsTeam: true,
    supportsIndividual: false,
    minTarget: 50,
    maxTarget: 50000,
    showsLeaderboard: false,
    maxConcurrentPerCourse: 10,
    requiresAcknowledgment: false,
  },
};

/** Ordered list of challenge types for UI display */
export const CHALLENGE_TYPE_OPTIONS: ChallengeTypeId[] = [
  'cooperative',
  'academic',
  'habit',
  'xp_race',
  'blooms_climb',
];

/** Get challenge type config by ID */
export function getChallengeType(id: ChallengeTypeId): ChallengeTypeConfig {
  return CHALLENGE_TYPES[id];
}

/** Validate that a goal_target is within bounds for a given challenge type */
export function isValidGoalTarget(typeId: ChallengeTypeId, target: number): boolean {
  const config = CHALLENGE_TYPES[typeId];
  if (config.fixedTarget !== undefined) return target === config.fixedTarget;
  return Number.isInteger(target) && target >= config.minTarget && target <= config.maxTarget;
}

/** Check if adding a new challenge of this type would exceed the concurrent limit */
export function wouldExceedConcurrentLimit(
  typeId: ChallengeTypeId,
  currentActiveCount: number,
): boolean {
  return currentActiveCount >= CHALLENGE_TYPES[typeId].maxConcurrentPerCourse;
}

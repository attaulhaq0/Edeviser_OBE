import { GOAL_DIFFICULTY_THRESHOLDS } from './onboardingConstants';

export type GoalDifficulty = 'easy' | 'moderate' | 'ambitious';

export function classifyDifficulty(
  cohortCompletionRate: number,
): GoalDifficulty {
  if (cohortCompletionRate >= GOAL_DIFFICULTY_THRESHOLDS.easy) return 'easy';
  if (cohortCompletionRate >= GOAL_DIFFICULTY_THRESHOLDS.moderate)
    return 'moderate';
  return 'ambitious';
}

export interface SmartGoalFields {
  specific: string;
  measurable: string;
  achievable: string;
  relevant: string;
  timebound: string; // ISO date
}

export function composeGoalText(fields: SmartGoalFields): string {
  return `${fields.specific} by ${fields.timebound}, measuring progress through ${fields.measurable}. This is achievable because ${fields.achievable} and relevant to ${fields.relevant}.`;
}

export function createGoalTemplate(params: {
  courseName: string;
  cloTitle?: string;
  deadline: string;
  suggestedAction: string;
  measurableTarget: string;
}): SmartGoalFields {
  return {
    specific: params.suggestedAction,
    measurable: params.measurableTarget,
    achievable:
      'Based on your current progress and available study time',
    relevant: params.cloTitle
      ? `${params.courseName} — ${params.cloTitle}`
      : params.courseName,
    timebound: params.deadline,
  };
}

import {
  calculateProfileCompleteness,
  type ProfileCompletenessInput,
} from './scoreCalculator';

export interface ProfileDimensionStatus {
  dimension: string;
  completed: number;
  total: number;
  percentage: number;
}

export function getProfileDimensions(
  input: ProfileCompletenessInput,
): ProfileDimensionStatus[] {
  return [
    {
      dimension: 'personality',
      completed: Math.min(input.personality_items, 25),
      total: 25,
      percentage: Math.round(Math.min(input.personality_items / 25, 1) * 100),
    },
    {
      dimension: 'self_efficacy',
      completed: Math.min(input.self_efficacy_items, 6),
      total: 6,
      percentage: Math.round(
        Math.min(input.self_efficacy_items / 6, 1) * 100,
      ),
    },
    {
      dimension: 'study_strategy',
      completed: Math.min(input.study_strategy_items, 8),
      total: 8,
      percentage: Math.round(
        Math.min(input.study_strategy_items / 8, 1) * 100,
      ),
    },
    {
      dimension: 'learning_style',
      completed: Math.min(input.learning_style_items, 16),
      total: 16,
      percentage: Math.round(
        Math.min(input.learning_style_items / 16, 1) * 100,
      ),
    },
    {
      dimension: 'baseline',
      completed: input.baseline_courses > 0 ? 1 : 0,
      total: 1,
      percentage: input.baseline_courses > 0 ? 100 : 0,
    },
  ];
}

export function getRemainingDimensions(
  input: ProfileCompletenessInput,
): ProfileDimensionStatus[] {
  return getProfileDimensions(input).filter((d) => d.percentage < 100);
}

export function getEstimatedTimeMinutes(
  remaining: ProfileDimensionStatus[],
): number {
  let minutes = 0;
  for (const d of remaining) {
    const itemsLeft = d.total - d.completed;
    switch (d.dimension) {
      case 'personality':
        minutes += Math.ceil(itemsLeft * 0.3); // ~18 sec per question
        break;
      case 'self_efficacy':
        minutes += Math.ceil(itemsLeft * 0.3);
        break;
      case 'study_strategy':
        minutes += Math.ceil(itemsLeft * 0.3);
        break;
      case 'learning_style':
        minutes += Math.ceil(itemsLeft * 0.4); // ~24 sec per question
        break;
      case 'baseline':
        minutes += 15; // default baseline time
        break;
    }
  }
  return minutes;
}

export { calculateProfileCompleteness };
export type { ProfileCompletenessInput };

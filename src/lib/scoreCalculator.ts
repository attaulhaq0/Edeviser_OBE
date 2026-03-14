// ── Types ────────────────────────────────────────────────────────────

export interface BigFiveTraits {
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
}

export interface VARKProfile {
  visual: number;
  auditory: number;
  read_write: number;
  kinesthetic: number;
  dominant_style:
    | 'visual'
    | 'auditory'
    | 'read_write'
    | 'kinesthetic'
    | 'multimodal';
}

export interface SelfEfficacyProfile {
  overall: number;
  general_academic: number;
  course_specific: number;
  self_regulated_learning: number;
}

export interface StudyStrategyProfile {
  time_management: number;
  elaboration: number;
  self_testing: number;
  help_seeking: number;
}

export interface BaselineResult {
  clo_id: string;
  score: number;
  question_count: number;
  correct_count: number;
}

export interface PersonalityResponse {
  dimension: string;
  selected_option: number;
  weight: number;
}

export interface VARKResponseInput {
  selected_modality: string;
}

export interface BaselineResponseInput {
  clo_id: string;
  selected_option: number;
  correct_option: number;
}

export interface SelfEfficacyResponseInput {
  domain: string;
  selected_option: number;
}

export interface StudyStrategyResponseInput {
  dimension: string;
  selected_option: number;
}

export interface ProfileCompletenessInput {
  personality_items: number;
  self_efficacy_items: number;
  study_strategy_items: number;
  learning_style_items: number;
  baseline_courses: number;
}

// ── Internal Helpers ─────────────────────────────────────────────────

const MULTIMODAL_THRESHOLD = 10;
const TOTAL_PERSONALITY_ITEMS = 25;
const TOTAL_SELF_EFFICACY_ITEMS = 6;
const TOTAL_STUDY_STRATEGY_ITEMS = 8;
const TOTAL_LEARNING_STYLE_ITEMS = 16;

function computeDimensionScore(
  responses: Array<{ selected_option: number }>,
): number {
  if (responses.length === 0) return 0;
  const sum = responses.reduce((acc, r) => acc + r.selected_option, 0);
  const maxPossible = responses.length * 5;
  return Math.round((sum / maxPossible) * 100);
}

// ── Score Calculation Functions ──────────────────────────────────────

/**
 * Big Five Trait Score Calculation
 *
 * Each dimension has questions with weight +1 or -1. Likert scale 1-5.
 * For weight=+1: score_contribution = selected_option (1-5)
 * For weight=-1: score_contribution = 6 - selected_option (reverse-scored)
 *
 * Trait_Score = (sum of score_contributions / (count * 5)) * 100, rounded
 * Supports partial scores (e.g., Day 1 has only 3 questions).
 */
export function calculateBigFiveScores(
  responses: PersonalityResponse[],
): BigFiveTraits {
  const computeDim = (dim: string): number => {
    const dimResponses = responses.filter((r) => r.dimension === dim);
    if (dimResponses.length === 0) return 0;
    const sum = dimResponses.reduce((acc, r) => {
      const contribution =
        r.weight === 1 ? r.selected_option : 6 - r.selected_option;
      return acc + contribution;
    }, 0);
    const maxPossible = dimResponses.length * 5;
    return Math.round((sum / maxPossible) * 100);
  };

  return {
    openness: computeDim('openness'),
    conscientiousness: computeDim('conscientiousness'),
    extraversion: computeDim('extraversion'),
    agreeableness: computeDim('agreeableness'),
    neuroticism: computeDim('neuroticism'),
  };
}

/**
 * VARK Score Calculation
 *
 * 16 questions, each with 4 options mapped to a modality.
 * VARK_Score = (count of selections for modality / totalQuestions) * 100, rounded
 *
 * Dominant style = highest score, or 'multimodal' if two or more within
 * 10 points of the top score.
 */
export function calculateVARKScores(
  responses: VARKResponseInput[],
  totalQuestions: number,
): VARKProfile {
  let visual = 0;
  let auditory = 0;
  let readWrite = 0;
  let kinesthetic = 0;

  for (const r of responses) {
    switch (r.selected_modality) {
      case 'visual':
        visual++;
        break;
      case 'auditory':
        auditory++;
        break;
      case 'read_write':
        readWrite++;
        break;
      case 'kinesthetic':
        kinesthetic++;
        break;
    }
  }

  const visualScore = Math.round((visual / totalQuestions) * 100);
  const auditoryScore = Math.round((auditory / totalQuestions) * 100);
  const readWriteScore = Math.round((readWrite / totalQuestions) * 100);
  const kinestheticScore = Math.round((kinesthetic / totalQuestions) * 100);

  const scores = {
    visual: visualScore,
    auditory: auditoryScore,
    read_write: readWriteScore,
    kinesthetic: kinestheticScore,
  } as const;

  const maxScore = Math.max(visualScore, auditoryScore, readWriteScore, kinestheticScore);

  type Modality = 'visual' | 'auditory' | 'read_write' | 'kinesthetic';
  const modalities: Modality[] = ['visual', 'auditory', 'read_write', 'kinesthetic'];
  const topModalities = modalities.filter(
    (m) => maxScore - scores[m] <= MULTIMODAL_THRESHOLD,
  );

  let dominant_style: VARKProfile['dominant_style'];
  if (topModalities.length >= 2) {
    dominant_style = 'multimodal';
  } else {
    dominant_style = modalities.reduce((a, b) =>
      scores[a] > scores[b] ? a : b,
    );
  }

  return {
    ...scores,
    dominant_style,
  };
}

/**
 * Baseline Score Calculation
 *
 * Per CLO: score = (correct_count / total_count) * 100, rounded
 * Unanswered questions are treated as incorrect (score 0).
 */
export function calculateBaselineScores(
  responses: BaselineResponseInput[],
): BaselineResult[] {
  const cloMap = new Map<string, { total: number; correct: number }>();

  for (const r of responses) {
    const entry = cloMap.get(r.clo_id) ?? { total: 0, correct: 0 };
    entry.total++;
    if (r.selected_option === r.correct_option) {
      entry.correct++;
    }
    cloMap.set(r.clo_id, entry);
  }

  return Array.from(cloMap.entries()).map(([clo_id, { total, correct }]) => ({
    clo_id,
    score: Math.round((correct / total) * 100),
    question_count: total,
    correct_count: correct,
  }));
}

/**
 * Self-Efficacy Score Calculation
 *
 * 6 items across 3 domains (2 per domain). Likert 1-5.
 * Domain score = (sum of items in domain / (count * 5)) * 100, rounded
 * Overall = (sum of all items / (total_count * 5)) * 100, rounded
 * Supports partial scores (Day 1: 2 items).
 */
export function calculateSelfEfficacyScores(
  responses: SelfEfficacyResponseInput[],
): SelfEfficacyProfile {
  const byDomain = (domain: string) =>
    computeDimensionScore(responses.filter((r) => r.domain === domain));

  const allSum = responses.reduce((acc, r) => acc + r.selected_option, 0);
  const allMax = responses.length * 5;
  const overall = allMax > 0 ? Math.round((allSum / allMax) * 100) : 0;

  return {
    overall,
    general_academic: byDomain('general_academic'),
    course_specific: byDomain('course_specific'),
    self_regulated_learning: byDomain('self_regulated_learning'),
  };
}

/**
 * Study Strategy Score Calculation
 *
 * 8 items across 4 dimensions (2 per dimension). Likert 1-5.
 * Dimension score = (sum of items in dimension / (count * 5)) * 100, rounded
 */
export function calculateStudyStrategyScores(
  responses: StudyStrategyResponseInput[],
): StudyStrategyProfile {
  const byDim = (dim: string) =>
    computeDimensionScore(responses.filter((r) => r.dimension === dim));

  return {
    time_management: byDim('time_management'),
    elaboration: byDim('elaboration'),
    self_testing: byDim('self_testing'),
    help_seeking: byDim('help_seeking'),
  };
}

/**
 * Profile Completeness Calculation
 *
 * 5 dimensions, each weighted equally (20%):
 * - personality: partial credit = items_answered / 25
 * - self_efficacy: partial credit = items_answered / 6
 * - study_strategies: partial credit = items_answered / 8
 * - learning_style: partial credit = items_answered / 16
 * - baseline: 1 if any course completed, 0 otherwise
 *
 * Total = (sum of dimension fractions / 5) * 100, rounded
 */
export function calculateProfileCompleteness(
  input: ProfileCompletenessInput,
): number {
  const personality = Math.min(input.personality_items / TOTAL_PERSONALITY_ITEMS, 1);
  const selfEfficacy = Math.min(input.self_efficacy_items / TOTAL_SELF_EFFICACY_ITEMS, 1);
  const studyStrategies = Math.min(input.study_strategy_items / TOTAL_STUDY_STRATEGY_ITEMS, 1);
  const learningStyle = Math.min(input.learning_style_items / TOTAL_LEARNING_STYLE_ITEMS, 1);
  const baseline = input.baseline_courses > 0 ? 1 : 0;

  const total = personality + selfEfficacy + studyStrategies + learningStyle + baseline;
  return Math.round((total / 5) * 100);
}

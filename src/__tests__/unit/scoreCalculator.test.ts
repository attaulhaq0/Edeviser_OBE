import { describe, it, expect } from 'vitest';
import {
  calculateBigFiveScores,
  calculateVARKScores,
  calculateBaselineScores,
  calculateSelfEfficacyScores,
  calculateStudyStrategyScores,
  calculateProfileCompleteness,
} from '@/lib/scoreCalculator';
import type {
  PersonalityResponse,
  VARKResponseInput,
  BaselineResponseInput,
  SelfEfficacyResponseInput,
  StudyStrategyResponseInput,
} from '@/lib/scoreCalculator';

// ── Big Five ────────────────────────────────────────────────────────

describe('calculateBigFiveScores', () => {
  it('returns all zeros for empty responses', () => {
    const result = calculateBigFiveScores([]);
    expect(result).toEqual({
      openness: 0,
      conscientiousness: 0,
      extraversion: 0,
      agreeableness: 0,
      neuroticism: 0,
    });
  });

  it('calculates max scores when all responses are 5 with weight +1', () => {
    const responses: PersonalityResponse[] = [
      'openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism',
    ].flatMap((dim) =>
      Array.from({ length: 5 }, () => ({ dimension: dim, selected_option: 5, weight: 1 })),
    );
    const result = calculateBigFiveScores(responses);
    expect(result.openness).toBe(100);
    expect(result.conscientiousness).toBe(100);
    expect(result.extraversion).toBe(100);
    expect(result.agreeableness).toBe(100);
    expect(result.neuroticism).toBe(100);
  });

  it('calculates min scores when all responses are 1 with weight +1', () => {
    const responses: PersonalityResponse[] = [
      'openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism',
    ].flatMap((dim) =>
      Array.from({ length: 5 }, () => ({ dimension: dim, selected_option: 1, weight: 1 })),
    );
    const result = calculateBigFiveScores(responses);
    expect(result.openness).toBe(20);
    expect(result.neuroticism).toBe(20);
  });

  it('applies reverse scoring for weight -1', () => {
    // weight=-1, selected=1 → contribution = 6-1 = 5 → score = (5/5)*100 = 100
    const responses: PersonalityResponse[] = [
      { dimension: 'neuroticism', selected_option: 1, weight: -1 },
    ];
    const result = calculateBigFiveScores(responses);
    expect(result.neuroticism).toBe(100);
  });

  it('applies reverse scoring: weight=-1, selected=5 → contribution=1', () => {
    const responses: PersonalityResponse[] = [
      { dimension: 'openness', selected_option: 5, weight: -1 },
    ];
    const result = calculateBigFiveScores(responses);
    // contribution = 6-5 = 1, score = (1/5)*100 = 20
    expect(result.openness).toBe(20);
  });

  it('supports partial scores (Day 1: 3 questions)', () => {
    const responses: PersonalityResponse[] = [
      { dimension: 'openness', selected_option: 4, weight: 1 },
      { dimension: 'conscientiousness', selected_option: 3, weight: 1 },
      { dimension: 'extraversion', selected_option: 5, weight: 1 },
    ];
    const result = calculateBigFiveScores(responses);
    expect(result.openness).toBe(80);       // 4/5 * 100
    expect(result.conscientiousness).toBe(60); // 3/5 * 100
    expect(result.extraversion).toBe(100);  // 5/5 * 100
    expect(result.agreeableness).toBe(0);   // no responses
    expect(result.neuroticism).toBe(0);     // no responses
  });

  it('handles mixed weights within a dimension', () => {
    const responses: PersonalityResponse[] = [
      { dimension: 'openness', selected_option: 4, weight: 1 },   // contribution = 4
      { dimension: 'openness', selected_option: 2, weight: -1 },  // contribution = 6-2 = 4
    ];
    const result = calculateBigFiveScores(responses);
    // sum = 8, max = 10, score = 80
    expect(result.openness).toBe(80);
  });
});

// ── VARK ────────────────────────────────────────────────────────────

describe('calculateVARKScores', () => {
  it('returns all zeros for empty responses', () => {
    const result = calculateVARKScores([], 16);
    expect(result.visual).toBe(0);
    expect(result.auditory).toBe(0);
    expect(result.read_write).toBe(0);
    expect(result.kinesthetic).toBe(0);
  });

  it('calculates correct scores for uniform distribution', () => {
    const responses: VARKResponseInput[] = [
      ...Array.from({ length: 4 }, () => ({ selected_modality: 'visual' })),
      ...Array.from({ length: 4 }, () => ({ selected_modality: 'auditory' })),
      ...Array.from({ length: 4 }, () => ({ selected_modality: 'read_write' })),
      ...Array.from({ length: 4 }, () => ({ selected_modality: 'kinesthetic' })),
    ];
    const result = calculateVARKScores(responses, 16);
    expect(result.visual).toBe(25);
    expect(result.auditory).toBe(25);
    expect(result.read_write).toBe(25);
    expect(result.kinesthetic).toBe(25);
    expect(result.dominant_style).toBe('multimodal');
  });

  it('identifies single dominant style', () => {
    const responses: VARKResponseInput[] = [
      ...Array.from({ length: 10 }, () => ({ selected_modality: 'visual' })),
      ...Array.from({ length: 2 }, () => ({ selected_modality: 'auditory' })),
      ...Array.from({ length: 2 }, () => ({ selected_modality: 'read_write' })),
      ...Array.from({ length: 2 }, () => ({ selected_modality: 'kinesthetic' })),
    ];
    const result = calculateVARKScores(responses, 16);
    // visual = 63, others = 13 → difference > 10 → single dominant
    expect(result.dominant_style).toBe('visual');
  });

  it('identifies multimodal when within 10 points', () => {
    const responses: VARKResponseInput[] = [
      ...Array.from({ length: 5 }, () => ({ selected_modality: 'visual' })),
      ...Array.from({ length: 5 }, () => ({ selected_modality: 'auditory' })),
      ...Array.from({ length: 3 }, () => ({ selected_modality: 'read_write' })),
      ...Array.from({ length: 3 }, () => ({ selected_modality: 'kinesthetic' })),
    ];
    const result = calculateVARKScores(responses, 16);
    // visual=31, auditory=31, read_write=19, kinesthetic=19
    // 31-19=12 > 10, so only visual+auditory within 10 → multimodal
    expect(result.dominant_style).toBe('multimodal');
  });

  it('scores sum to approximately 100 when all questions answered', () => {
    const responses: VARKResponseInput[] = [
      ...Array.from({ length: 7 }, () => ({ selected_modality: 'visual' })),
      ...Array.from({ length: 4 }, () => ({ selected_modality: 'auditory' })),
      ...Array.from({ length: 3 }, () => ({ selected_modality: 'read_write' })),
      ...Array.from({ length: 2 }, () => ({ selected_modality: 'kinesthetic' })),
    ];
    const result = calculateVARKScores(responses, 16);
    const sum = result.visual + result.auditory + result.read_write + result.kinesthetic;
    // Rounding individual scores can cause ±1 deviation from 100
    expect(sum).toBeGreaterThanOrEqual(99);
    expect(sum).toBeLessThanOrEqual(101);
  });

  it('scores sum to exactly 100 for evenly divisible distributions', () => {
    // 8+4+2+2 = 16, all divide 16 cleanly or round symmetrically
    const responses: VARKResponseInput[] = [
      ...Array.from({ length: 8 }, () => ({ selected_modality: 'visual' })),
      ...Array.from({ length: 4 }, () => ({ selected_modality: 'auditory' })),
      ...Array.from({ length: 4 }, () => ({ selected_modality: 'read_write' })),
      ...Array.from({ length: 0 }, () => ({ selected_modality: 'kinesthetic' })),
    ];
    const result = calculateVARKScores(responses, 16);
    const sum = result.visual + result.auditory + result.read_write + result.kinesthetic;
    expect(sum).toBe(100);
  });

  it('ignores unknown modalities', () => {
    const responses: VARKResponseInput[] = [
      { selected_modality: 'visual' },
      { selected_modality: 'unknown_modality' },
    ];
    const result = calculateVARKScores(responses, 16);
    expect(result.visual).toBe(6); // 1/16 * 100 = 6.25 → 6
  });
});

// ── Baseline ────────────────────────────────────────────────────────

describe('calculateBaselineScores', () => {
  it('returns empty array for empty responses', () => {
    expect(calculateBaselineScores([])).toEqual([]);
  });

  it('calculates correct percentage per CLO', () => {
    const responses: BaselineResponseInput[] = [
      { clo_id: 'clo-1', selected_option: 0, correct_option: 0 },
      { clo_id: 'clo-1', selected_option: 1, correct_option: 0 },
      { clo_id: 'clo-2', selected_option: 2, correct_option: 2 },
    ];
    const result = calculateBaselineScores(responses);
    const clo1 = result.find((r) => r.clo_id === 'clo-1');
    const clo2 = result.find((r) => r.clo_id === 'clo-2');
    expect(clo1).toEqual({ clo_id: 'clo-1', score: 50, question_count: 2, correct_count: 1 });
    expect(clo2).toEqual({ clo_id: 'clo-2', score: 100, question_count: 1, correct_count: 1 });
  });

  it('treats all wrong answers as 0', () => {
    const responses: BaselineResponseInput[] = [
      { clo_id: 'clo-1', selected_option: 1, correct_option: 0 },
      { clo_id: 'clo-1', selected_option: 2, correct_option: 0 },
    ];
    const result = calculateBaselineScores(responses);
    expect(result[0]!.score).toBe(0);
    expect(result[0]!.correct_count).toBe(0);
  });

  it('handles multiple CLOs independently', () => {
    const responses: BaselineResponseInput[] = [
      { clo_id: 'a', selected_option: 0, correct_option: 0 },
      { clo_id: 'b', selected_option: 0, correct_option: 0 },
      { clo_id: 'c', selected_option: 1, correct_option: 0 },
    ];
    const result = calculateBaselineScores(responses);
    expect(result).toHaveLength(3);
    expect(result.find((r) => r.clo_id === 'a')?.score).toBe(100);
    expect(result.find((r) => r.clo_id === 'b')?.score).toBe(100);
    expect(result.find((r) => r.clo_id === 'c')?.score).toBe(0);
  });
});

// ── Self-Efficacy ───────────────────────────────────────────────────

describe('calculateSelfEfficacyScores', () => {
  it('returns all zeros for empty responses', () => {
    const result = calculateSelfEfficacyScores([]);
    expect(result).toEqual({
      overall: 0,
      general_academic: 0,
      course_specific: 0,
      self_regulated_learning: 0,
    });
  });

  it('calculates max scores for all 5s', () => {
    const responses: SelfEfficacyResponseInput[] = [
      { domain: 'general_academic', selected_option: 5 },
      { domain: 'general_academic', selected_option: 5 },
      { domain: 'course_specific', selected_option: 5 },
      { domain: 'course_specific', selected_option: 5 },
      { domain: 'self_regulated_learning', selected_option: 5 },
      { domain: 'self_regulated_learning', selected_option: 5 },
    ];
    const result = calculateSelfEfficacyScores(responses);
    expect(result.overall).toBe(100);
    expect(result.general_academic).toBe(100);
    expect(result.course_specific).toBe(100);
    expect(result.self_regulated_learning).toBe(100);
  });

  it('supports partial Day 1 responses (2 items)', () => {
    const responses: SelfEfficacyResponseInput[] = [
      { domain: 'general_academic', selected_option: 4 },
      { domain: 'self_regulated_learning', selected_option: 3 },
    ];
    const result = calculateSelfEfficacyScores(responses);
    expect(result.general_academic).toBe(80);  // 4/5 * 100
    expect(result.self_regulated_learning).toBe(60); // 3/5 * 100
    expect(result.course_specific).toBe(0);    // no responses
    // overall = (4+3)/(2*5)*100 = 7/10*100 = 70
    expect(result.overall).toBe(70);
  });

  it('calculates correct overall from mixed scores', () => {
    const responses: SelfEfficacyResponseInput[] = [
      { domain: 'general_academic', selected_option: 3 },
      { domain: 'general_academic', selected_option: 4 },
      { domain: 'course_specific', selected_option: 2 },
      { domain: 'course_specific', selected_option: 5 },
      { domain: 'self_regulated_learning', selected_option: 1 },
      { domain: 'self_regulated_learning', selected_option: 3 },
    ];
    const result = calculateSelfEfficacyScores(responses);
    // overall = (3+4+2+5+1+3)/(6*5)*100 = 18/30*100 = 60
    expect(result.overall).toBe(60);
    // general_academic = (3+4)/10*100 = 70
    expect(result.general_academic).toBe(70);
  });
});

// ── Study Strategy ──────────────────────────────────────────────────

describe('calculateStudyStrategyScores', () => {
  it('returns all zeros for empty responses', () => {
    const result = calculateStudyStrategyScores([]);
    expect(result).toEqual({
      time_management: 0,
      elaboration: 0,
      self_testing: 0,
      help_seeking: 0,
    });
  });

  it('calculates correct dimension scores', () => {
    const responses: StudyStrategyResponseInput[] = [
      { dimension: 'time_management', selected_option: 4 },
      { dimension: 'time_management', selected_option: 3 },
      { dimension: 'elaboration', selected_option: 5 },
      { dimension: 'elaboration', selected_option: 5 },
      { dimension: 'self_testing', selected_option: 1 },
      { dimension: 'self_testing', selected_option: 2 },
      { dimension: 'help_seeking', selected_option: 3 },
      { dimension: 'help_seeking', selected_option: 3 },
    ];
    const result = calculateStudyStrategyScores(responses);
    expect(result.time_management).toBe(70);  // (4+3)/10*100
    expect(result.elaboration).toBe(100);     // (5+5)/10*100
    expect(result.self_testing).toBe(30);     // (1+2)/10*100
    expect(result.help_seeking).toBe(60);     // (3+3)/10*100
  });
});

// ── Profile Completeness ────────────────────────────────────────────

describe('calculateProfileCompleteness', () => {
  it('returns 0 for no items completed', () => {
    expect(calculateProfileCompleteness({
      personality_items: 0,
      self_efficacy_items: 0,
      study_strategy_items: 0,
      learning_style_items: 0,
      baseline_courses: 0,
    })).toBe(0);
  });

  it('returns 100 for all items completed', () => {
    expect(calculateProfileCompleteness({
      personality_items: 25,
      self_efficacy_items: 6,
      study_strategy_items: 8,
      learning_style_items: 16,
      baseline_courses: 1,
    })).toBe(100);
  });

  it('calculates partial credit for Day 1 (3 personality + 2 self-efficacy)', () => {
    const result = calculateProfileCompleteness({
      personality_items: 3,
      self_efficacy_items: 2,
      study_strategy_items: 0,
      learning_style_items: 0,
      baseline_courses: 0,
    });
    // personality: 3/25 = 0.12, self_efficacy: 2/6 = 0.333, rest = 0
    // total = (0.12 + 0.333) / 5 * 100 = 0.4533 / 5 * 100 = 9.07 → 9
    expect(result).toBe(9);
  });

  it('caps items at maximum (no over-counting)', () => {
    expect(calculateProfileCompleteness({
      personality_items: 30,  // more than 25
      self_efficacy_items: 10, // more than 6
      study_strategy_items: 8,
      learning_style_items: 16,
      baseline_courses: 1,
    })).toBe(100);
  });

  it('baseline is binary (1+ courses = full credit)', () => {
    const with1 = calculateProfileCompleteness({
      personality_items: 0, self_efficacy_items: 0,
      study_strategy_items: 0, learning_style_items: 0, baseline_courses: 1,
    });
    const with5 = calculateProfileCompleteness({
      personality_items: 0, self_efficacy_items: 0,
      study_strategy_items: 0, learning_style_items: 0, baseline_courses: 5,
    });
    expect(with1).toBe(with5);
    // 1/5 * 100 = 20
    expect(with1).toBe(20);
  });
});

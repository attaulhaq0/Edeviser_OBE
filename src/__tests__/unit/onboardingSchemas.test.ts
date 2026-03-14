// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import {
  likertResponseSchema,
  varkResponseSchema,
  baselineResponseSchema,
  selfEfficacyResponseSchema,
  studyStrategyResponseSchema,
  saveResponsesSchema,
  processOnboardingSchema,
  baselineQuestionSchema,
  baselineTestConfigSchema,
  starterWeekSessionSchema,
  goalSuggestionSchema,
  smartGoalTemplateSchema,
} from '@/lib/onboardingSchemas';

const validUUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const validUUID2 = 'b1ffcd00-ad1c-4ef9-bc7e-7ccace491b22';

// ── likertResponseSchema ────────────────────────────────────────────

describe('likertResponseSchema', () => {
  it('accepts valid payload with option 1–5', () => {
    for (const opt of [1, 2, 3, 4, 5]) {
      const result = likertResponseSchema.safeParse({ question_id: validUUID, selected_option: opt });
      expect(result.success).toBe(true);
    }
  });

  it('rejects selected_option below 1', () => {
    const result = likertResponseSchema.safeParse({ question_id: validUUID, selected_option: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects selected_option above 5', () => {
    const result = likertResponseSchema.safeParse({ question_id: validUUID, selected_option: 6 });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer selected_option', () => {
    const result = likertResponseSchema.safeParse({ question_id: validUUID, selected_option: 2.5 });
    expect(result.success).toBe(false);
  });

  it('rejects invalid UUID for question_id', () => {
    const result = likertResponseSchema.safeParse({ question_id: 'not-a-uuid', selected_option: 3 });
    expect(result.success).toBe(false);
  });

  it('rejects missing question_id', () => {
    const result = likertResponseSchema.safeParse({ selected_option: 3 });
    expect(result.success).toBe(false);
  });

  it('rejects missing selected_option', () => {
    const result = likertResponseSchema.safeParse({ question_id: validUUID });
    expect(result.success).toBe(false);
  });
});

// ── varkResponseSchema ──────────────────────────────────────────────

describe('varkResponseSchema', () => {
  it('accepts valid payload with option 0–3', () => {
    for (const opt of [0, 1, 2, 3]) {
      const result = varkResponseSchema.safeParse({ question_id: validUUID, selected_option: opt });
      expect(result.success).toBe(true);
    }
  });

  it('rejects selected_option below 0', () => {
    const result = varkResponseSchema.safeParse({ question_id: validUUID, selected_option: -1 });
    expect(result.success).toBe(false);
  });

  it('rejects selected_option above 3', () => {
    const result = varkResponseSchema.safeParse({ question_id: validUUID, selected_option: 4 });
    expect(result.success).toBe(false);
  });

  it('rejects string selected_option', () => {
    const result = varkResponseSchema.safeParse({ question_id: validUUID, selected_option: '2' });
    expect(result.success).toBe(false);
  });
});

// ── baselineResponseSchema ──────────────────────────────────────────

describe('baselineResponseSchema', () => {
  it('accepts valid payload with option 0–3', () => {
    for (const opt of [0, 1, 2, 3]) {
      const result = baselineResponseSchema.safeParse({ question_id: validUUID, selected_option: opt });
      expect(result.success).toBe(true);
    }
  });

  it('rejects selected_option above 3', () => {
    const result = baselineResponseSchema.safeParse({ question_id: validUUID, selected_option: 4 });
    expect(result.success).toBe(false);
  });

  it('rejects selected_option below 0', () => {
    const result = baselineResponseSchema.safeParse({ question_id: validUUID, selected_option: -1 });
    expect(result.success).toBe(false);
  });
});

// ── selfEfficacyResponseSchema ──────────────────────────────────────

describe('selfEfficacyResponseSchema', () => {
  it('accepts valid payload with option 1–5', () => {
    for (const opt of [1, 2, 3, 4, 5]) {
      const result = selfEfficacyResponseSchema.safeParse({ question_id: validUUID, selected_option: opt });
      expect(result.success).toBe(true);
    }
  });

  it('rejects selected_option below 1', () => {
    const result = selfEfficacyResponseSchema.safeParse({ question_id: validUUID, selected_option: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects selected_option above 5', () => {
    const result = selfEfficacyResponseSchema.safeParse({ question_id: validUUID, selected_option: 6 });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer selected_option', () => {
    const result = selfEfficacyResponseSchema.safeParse({ question_id: validUUID, selected_option: 3.7 });
    expect(result.success).toBe(false);
  });

  it('rejects missing fields', () => {
    expect(selfEfficacyResponseSchema.safeParse({}).success).toBe(false);
    expect(selfEfficacyResponseSchema.safeParse({ question_id: validUUID }).success).toBe(false);
  });
});


// ── studyStrategyResponseSchema ─────────────────────────────────────

describe('studyStrategyResponseSchema', () => {
  it('accepts valid payload with option 1–5', () => {
    for (const opt of [1, 2, 3, 4, 5]) {
      const result = studyStrategyResponseSchema.safeParse({ question_id: validUUID, selected_option: opt });
      expect(result.success).toBe(true);
    }
  });

  it('rejects selected_option below 1', () => {
    const result = studyStrategyResponseSchema.safeParse({ question_id: validUUID, selected_option: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects selected_option above 5', () => {
    const result = studyStrategyResponseSchema.safeParse({ question_id: validUUID, selected_option: 6 });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer selected_option', () => {
    const result = studyStrategyResponseSchema.safeParse({ question_id: validUUID, selected_option: 2.1 });
    expect(result.success).toBe(false);
  });
});

// ── saveResponsesSchema ─────────────────────────────────────────────

describe('saveResponsesSchema', () => {
  it('accepts valid personality payload', () => {
    const result = saveResponsesSchema.safeParse({
      student_id: validUUID,
      assessment_type: 'personality',
      assessment_version: 1,
      responses: [{ question_id: validUUID2, selected_option: 3 }],
    });
    expect(result.success).toBe(true);
  });

  it('accepts all valid assessment_type values', () => {
    for (const type of ['personality', 'learning_style', 'baseline', 'self_efficacy', 'study_strategy']) {
      const result = saveResponsesSchema.safeParse({
        student_id: validUUID,
        assessment_type: type,
        assessment_version: 1,
        responses: [{ question_id: validUUID2, selected_option: 1 }],
      });
      expect(result.success).toBe(true);
    }
  });

  it('accepts optional course_id', () => {
    const result = saveResponsesSchema.safeParse({
      student_id: validUUID,
      assessment_type: 'baseline',
      assessment_version: 1,
      course_id: validUUID2,
      responses: [{ question_id: validUUID, selected_option: 0 }],
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid assessment_type', () => {
    const result = saveResponsesSchema.safeParse({
      student_id: validUUID,
      assessment_type: 'invalid_type',
      assessment_version: 1,
      responses: [{ question_id: validUUID2, selected_option: 1 }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty responses array', () => {
    const result = saveResponsesSchema.safeParse({
      student_id: validUUID,
      assessment_type: 'personality',
      assessment_version: 1,
      responses: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects assessment_version below 1', () => {
    const result = saveResponsesSchema.safeParse({
      student_id: validUUID,
      assessment_type: 'personality',
      assessment_version: 0,
      responses: [{ question_id: validUUID2, selected_option: 3 }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing student_id', () => {
    const result = saveResponsesSchema.safeParse({
      assessment_type: 'personality',
      assessment_version: 1,
      responses: [{ question_id: validUUID2, selected_option: 3 }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-UUID course_id', () => {
    const result = saveResponsesSchema.safeParse({
      student_id: validUUID,
      assessment_type: 'baseline',
      assessment_version: 1,
      course_id: 'not-a-uuid',
      responses: [{ question_id: validUUID2, selected_option: 0 }],
    });
    expect(result.success).toBe(false);
  });
});

// ── processOnboardingSchema ─────────────────────────────────────────

describe('processOnboardingSchema', () => {
  it('accepts valid payload with defaults', () => {
    const result = processOnboardingSchema.safeParse({
      student_id: validUUID,
      assessment_version: 1,
      skipped_sections: [],
      baseline_course_ids: [],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.is_day1).toBe(false);
    }
  });

  it('accepts payload with is_day1 true', () => {
    const result = processOnboardingSchema.safeParse({
      student_id: validUUID,
      assessment_version: 1,
      skipped_sections: ['personality'],
      baseline_course_ids: [validUUID2],
      is_day1: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.is_day1).toBe(true);
    }
  });

  it('accepts all valid skipped_sections values', () => {
    const result = processOnboardingSchema.safeParse({
      student_id: validUUID,
      assessment_version: 1,
      skipped_sections: ['personality', 'learning_style', 'baseline', 'self_efficacy', 'study_strategy'],
      baseline_course_ids: [],
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid skipped_sections value', () => {
    const result = processOnboardingSchema.safeParse({
      student_id: validUUID,
      assessment_version: 1,
      skipped_sections: ['invalid_section'],
      baseline_course_ids: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-UUID in baseline_course_ids', () => {
    const result = processOnboardingSchema.safeParse({
      student_id: validUUID,
      assessment_version: 1,
      skipped_sections: [],
      baseline_course_ids: ['not-a-uuid'],
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing required fields', () => {
    expect(processOnboardingSchema.safeParse({}).success).toBe(false);
    expect(processOnboardingSchema.safeParse({ student_id: validUUID }).success).toBe(false);
  });
});


// ── baselineQuestionSchema ──────────────────────────────────────────

describe('baselineQuestionSchema', () => {
  it('accepts valid payload', () => {
    const result = baselineQuestionSchema.safeParse({
      question_text: 'What is the capital of France?',
      options: ['Paris', 'London', 'Berlin', 'Madrid'],
      correct_option: 0,
      clo_id: validUUID,
      difficulty_level: 'easy',
    });
    expect(result.success).toBe(true);
  });

  it('accepts all difficulty levels', () => {
    for (const level of ['easy', 'medium', 'hard']) {
      const result = baselineQuestionSchema.safeParse({
        question_text: 'A valid question text here',
        options: ['A', 'B', 'C', 'D'],
        correct_option: 1,
        clo_id: validUUID,
        difficulty_level: level,
      });
      expect(result.success).toBe(true);
    }
  });

  it('rejects question_text shorter than 10 chars', () => {
    const result = baselineQuestionSchema.safeParse({
      question_text: 'Short',
      options: ['A', 'B', 'C', 'D'],
      correct_option: 0,
      clo_id: validUUID,
      difficulty_level: 'easy',
    });
    expect(result.success).toBe(false);
  });

  it('rejects options array with fewer than 4 items', () => {
    const result = baselineQuestionSchema.safeParse({
      question_text: 'A valid question text here',
      options: ['A', 'B', 'C'],
      correct_option: 0,
      clo_id: validUUID,
      difficulty_level: 'easy',
    });
    expect(result.success).toBe(false);
  });

  it('rejects options array with more than 4 items', () => {
    const result = baselineQuestionSchema.safeParse({
      question_text: 'A valid question text here',
      options: ['A', 'B', 'C', 'D', 'E'],
      correct_option: 0,
      clo_id: validUUID,
      difficulty_level: 'easy',
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty option string', () => {
    const result = baselineQuestionSchema.safeParse({
      question_text: 'A valid question text here',
      options: ['A', '', 'C', 'D'],
      correct_option: 0,
      clo_id: validUUID,
      difficulty_level: 'easy',
    });
    expect(result.success).toBe(false);
  });

  it('rejects correct_option outside 0–3', () => {
    const above = baselineQuestionSchema.safeParse({
      question_text: 'A valid question text here',
      options: ['A', 'B', 'C', 'D'],
      correct_option: 4,
      clo_id: validUUID,
      difficulty_level: 'easy',
    });
    expect(above.success).toBe(false);

    const below = baselineQuestionSchema.safeParse({
      question_text: 'A valid question text here',
      options: ['A', 'B', 'C', 'D'],
      correct_option: -1,
      clo_id: validUUID,
      difficulty_level: 'easy',
    });
    expect(below.success).toBe(false);
  });

  it('rejects invalid difficulty_level', () => {
    const result = baselineQuestionSchema.safeParse({
      question_text: 'A valid question text here',
      options: ['A', 'B', 'C', 'D'],
      correct_option: 0,
      clo_id: validUUID,
      difficulty_level: 'extreme',
    });
    expect(result.success).toBe(false);
  });
});

// ── baselineTestConfigSchema ────────────────────────────────────────

describe('baselineTestConfigSchema', () => {
  it('accepts valid payload', () => {
    const result = baselineTestConfigSchema.safeParse({
      course_id: validUUID,
      time_limit_minutes: 30,
      is_active: true,
    });
    expect(result.success).toBe(true);
  });

  it('applies default time_limit_minutes of 15', () => {
    const result = baselineTestConfigSchema.safeParse({
      course_id: validUUID,
      is_active: false,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.time_limit_minutes).toBe(15);
    }
  });

  it('accepts boundary time limits (5 and 60)', () => {
    const min = baselineTestConfigSchema.safeParse({
      course_id: validUUID,
      time_limit_minutes: 5,
      is_active: true,
    });
    const max = baselineTestConfigSchema.safeParse({
      course_id: validUUID,
      time_limit_minutes: 60,
      is_active: true,
    });
    expect(min.success).toBe(true);
    expect(max.success).toBe(true);
  });

  it('rejects time_limit_minutes below 5', () => {
    const result = baselineTestConfigSchema.safeParse({
      course_id: validUUID,
      time_limit_minutes: 4,
      is_active: true,
    });
    expect(result.success).toBe(false);
  });

  it('rejects time_limit_minutes above 60', () => {
    const result = baselineTestConfigSchema.safeParse({
      course_id: validUUID,
      time_limit_minutes: 61,
      is_active: true,
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer time_limit_minutes', () => {
    const result = baselineTestConfigSchema.safeParse({
      course_id: validUUID,
      time_limit_minutes: 15.5,
      is_active: true,
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing is_active', () => {
    const result = baselineTestConfigSchema.safeParse({
      course_id: validUUID,
      time_limit_minutes: 15,
    });
    expect(result.success).toBe(false);
  });
});


// ── starterWeekSessionSchema ────────────────────────────────────────

describe('starterWeekSessionSchema', () => {
  it('accepts valid payload', () => {
    const result = starterWeekSessionSchema.safeParse({
      course_id: validUUID,
      session_type: 'reading',
      suggested_date: '2025-01-15',
      suggested_time_slot: 'morning',
      duration_minutes: 30,
      description: 'Review chapter 1 materials and take notes',
    });
    expect(result.success).toBe(true);
  });

  it('accepts null course_id', () => {
    const result = starterWeekSessionSchema.safeParse({
      course_id: null,
      session_type: 'exploration',
      suggested_date: '2025-01-15',
      suggested_time_slot: 'evening',
      duration_minutes: 25,
      description: 'Explore campus resources and study spaces',
    });
    expect(result.success).toBe(true);
  });

  it('accepts all session_type values', () => {
    for (const type of ['reading', 'practice', 'review', 'exploration']) {
      const result = starterWeekSessionSchema.safeParse({
        course_id: null,
        session_type: type,
        suggested_date: '2025-01-15',
        suggested_time_slot: 'afternoon',
        duration_minutes: 35,
        description: 'A valid session description here',
      });
      expect(result.success).toBe(true);
    }
  });

  it('accepts all time_slot values', () => {
    for (const slot of ['morning', 'afternoon', 'evening']) {
      const result = starterWeekSessionSchema.safeParse({
        course_id: null,
        session_type: 'reading',
        suggested_date: '2025-01-15',
        suggested_time_slot: slot,
        duration_minutes: 30,
        description: 'A valid session description here',
      });
      expect(result.success).toBe(true);
    }
  });

  it('accepts boundary duration values (25 and 50)', () => {
    const min = starterWeekSessionSchema.safeParse({
      course_id: null,
      session_type: 'reading',
      suggested_date: '2025-01-15',
      suggested_time_slot: 'morning',
      duration_minutes: 25,
      description: 'A valid session description here',
    });
    const max = starterWeekSessionSchema.safeParse({
      course_id: null,
      session_type: 'reading',
      suggested_date: '2025-01-15',
      suggested_time_slot: 'morning',
      duration_minutes: 50,
      description: 'A valid session description here',
    });
    expect(min.success).toBe(true);
    expect(max.success).toBe(true);
  });

  it('rejects duration_minutes below 25', () => {
    const result = starterWeekSessionSchema.safeParse({
      course_id: null,
      session_type: 'reading',
      suggested_date: '2025-01-15',
      suggested_time_slot: 'morning',
      duration_minutes: 24,
      description: 'A valid session description here',
    });
    expect(result.success).toBe(false);
  });

  it('rejects duration_minutes above 50', () => {
    const result = starterWeekSessionSchema.safeParse({
      course_id: null,
      session_type: 'reading',
      suggested_date: '2025-01-15',
      suggested_time_slot: 'morning',
      duration_minutes: 51,
      description: 'A valid session description here',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid session_type', () => {
    const result = starterWeekSessionSchema.safeParse({
      course_id: null,
      session_type: 'gaming',
      suggested_date: '2025-01-15',
      suggested_time_slot: 'morning',
      duration_minutes: 30,
      description: 'A valid session description here',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid date format', () => {
    const result = starterWeekSessionSchema.safeParse({
      course_id: null,
      session_type: 'reading',
      suggested_date: '15-01-2025',
      suggested_time_slot: 'morning',
      duration_minutes: 30,
      description: 'A valid session description here',
    });
    expect(result.success).toBe(false);
  });

  it('rejects description shorter than 10 chars', () => {
    const result = starterWeekSessionSchema.safeParse({
      course_id: null,
      session_type: 'reading',
      suggested_date: '2025-01-15',
      suggested_time_slot: 'morning',
      duration_minutes: 30,
      description: 'Short',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid time_slot', () => {
    const result = starterWeekSessionSchema.safeParse({
      course_id: null,
      session_type: 'reading',
      suggested_date: '2025-01-15',
      suggested_time_slot: 'midnight',
      duration_minutes: 30,
      description: 'A valid session description here',
    });
    expect(result.success).toBe(false);
  });
});

// ── goalSuggestionSchema ────────────────────────────────────────────

describe('goalSuggestionSchema', () => {
  it('accepts valid payload with required fields only', () => {
    const result = goalSuggestionSchema.safeParse({
      goal_text: 'Complete all reading assignments this week',
      difficulty: 'easy',
    });
    expect(result.success).toBe(true);
  });

  it('accepts valid payload with all optional SMART fields', () => {
    const result = goalSuggestionSchema.safeParse({
      goal_text: 'Complete all reading assignments this week',
      smart_specific: 'Read chapters 1-3 of the textbook',
      smart_measurable: 'Complete reading notes for each chapter',
      smart_achievable: 'Allocate 1 hour per chapter',
      smart_relevant: 'Supports CLO 1.1 understanding',
      smart_timebound: '2025-01-20',
      difficulty: 'moderate',
    });
    expect(result.success).toBe(true);
  });

  it('accepts all difficulty values', () => {
    for (const diff of ['easy', 'moderate', 'ambitious']) {
      const result = goalSuggestionSchema.safeParse({
        goal_text: 'A valid goal text for testing',
        difficulty: diff,
      });
      expect(result.success).toBe(true);
    }
  });

  it('rejects goal_text shorter than 10 chars', () => {
    const result = goalSuggestionSchema.safeParse({
      goal_text: 'Too short',
      difficulty: 'easy',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid difficulty value', () => {
    const result = goalSuggestionSchema.safeParse({
      goal_text: 'A valid goal text for testing',
      difficulty: 'impossible',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid smart_timebound date format', () => {
    const result = goalSuggestionSchema.safeParse({
      goal_text: 'A valid goal text for testing',
      difficulty: 'easy',
      smart_timebound: 'next-friday',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing difficulty', () => {
    const result = goalSuggestionSchema.safeParse({
      goal_text: 'A valid goal text for testing',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing goal_text', () => {
    const result = goalSuggestionSchema.safeParse({
      difficulty: 'easy',
    });
    expect(result.success).toBe(false);
  });
});

// ── smartGoalTemplateSchema ─────────────────────────────────────────

describe('smartGoalTemplateSchema', () => {
  it('accepts valid payload', () => {
    const result = smartGoalTemplateSchema.safeParse({
      specific: 'Read chapters 1-3 of the textbook',
      measurable: 'Complete reading notes for each chapter',
      achievable: 'Allocate 1 hour per chapter over 3 days',
      relevant: 'Supports CLO 1.1',
      timebound: '2025-01-20',
    });
    expect(result.success).toBe(true);
  });

  it('rejects specific shorter than 5 chars', () => {
    const result = smartGoalTemplateSchema.safeParse({
      specific: 'Read',
      measurable: 'Complete reading notes for each chapter',
      achievable: 'Allocate 1 hour per chapter over 3 days',
      relevant: 'Supports CLO 1.1',
      timebound: '2025-01-20',
    });
    expect(result.success).toBe(false);
  });

  it('rejects measurable shorter than 5 chars', () => {
    const result = smartGoalTemplateSchema.safeParse({
      specific: 'Read chapters 1-3 of the textbook',
      measurable: 'Done',
      achievable: 'Allocate 1 hour per chapter over 3 days',
      relevant: 'Supports CLO 1.1',
      timebound: '2025-01-20',
    });
    expect(result.success).toBe(false);
  });

  it('rejects achievable shorter than 5 chars', () => {
    const result = smartGoalTemplateSchema.safeParse({
      specific: 'Read chapters 1-3 of the textbook',
      measurable: 'Complete reading notes for each chapter',
      achievable: 'Yes',
      relevant: 'Supports CLO 1.1',
      timebound: '2025-01-20',
    });
    expect(result.success).toBe(false);
  });

  it('rejects relevant shorter than 1 char (empty string)', () => {
    const result = smartGoalTemplateSchema.safeParse({
      specific: 'Read chapters 1-3 of the textbook',
      measurable: 'Complete reading notes for each chapter',
      achievable: 'Allocate 1 hour per chapter over 3 days',
      relevant: '',
      timebound: '2025-01-20',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid timebound date format', () => {
    const result = smartGoalTemplateSchema.safeParse({
      specific: 'Read chapters 1-3 of the textbook',
      measurable: 'Complete reading notes for each chapter',
      achievable: 'Allocate 1 hour per chapter over 3 days',
      relevant: 'Supports CLO 1.1',
      timebound: 'January 20, 2025',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing required fields', () => {
    expect(smartGoalTemplateSchema.safeParse({}).success).toBe(false);
    expect(smartGoalTemplateSchema.safeParse({
      specific: 'Read chapters 1-3',
    }).success).toBe(false);
    expect(smartGoalTemplateSchema.safeParse({
      specific: 'Read chapters 1-3',
      measurable: 'Complete notes',
      achievable: '1 hour per chapter',
      relevant: 'CLO 1.1',
      // missing timebound
    }).success).toBe(false);
  });

  it('accepts boundary: relevant with exactly 1 char', () => {
    const result = smartGoalTemplateSchema.safeParse({
      specific: 'Read chapters 1-3 of the textbook',
      measurable: 'Complete reading notes for each chapter',
      achievable: 'Allocate 1 hour per chapter over 3 days',
      relevant: 'X',
      timebound: '2025-01-20',
    });
    expect(result.success).toBe(true);
  });

  it('accepts boundary: fields with exactly 5 chars', () => {
    const result = smartGoalTemplateSchema.safeParse({
      specific: 'ABCDE',
      measurable: 'FGHIJ',
      achievable: 'KLMNO',
      relevant: 'P',
      timebound: '2025-01-20',
    });
    expect(result.success).toBe(true);
  });
});

// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import {
  generateQuestionsSchema,
  questionBankEntrySchema,
  adaptiveQuizConfigSchema,
  recoverySessionSchema,
  verifiedExplanationSchema,
  practiceModeConfigSchema,
  bloomsClimbStateSchema,
} from '@/lib/quizGenerationSchemas';

const validUUID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
const validUUID2 = 'b1ffcd00-ad1c-4ef9-bc7e-7ccace491b22';
const validUUID3 = 'c2aade11-be2d-4fa0-8d8f-8ddbbf502c33';

// ── generateQuestionsSchema ─────────────────────────────────────────

describe('generateQuestionsSchema', () => {
  const validInput = {
    course_id: validUUID,
    clo_ids: [validUUID2],
    bloom_levels: [1],
    question_count: 10,
    question_types: ['mcq' as const],
  };

  it('accepts valid input with all fields', () => {
    expect(() => generateQuestionsSchema.parse(validInput)).not.toThrow();
  });

  it('accepts max 5 clo_ids', () => {
    const result = generateQuestionsSchema.safeParse({
      ...validInput,
      clo_ids: [validUUID, validUUID2, validUUID3, validUUID, validUUID2],
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty clo_ids array', () => {
    const result = generateQuestionsSchema.safeParse({ ...validInput, clo_ids: [] });
    expect(result.success).toBe(false);
  });

  it('rejects more than 5 clo_ids', () => {
    const result = generateQuestionsSchema.safeParse({
      ...validInput,
      clo_ids: [validUUID, validUUID2, validUUID3, validUUID, validUUID2, validUUID3],
    });
    expect(result.success).toBe(false);
  });

  it('accepts bloom_levels 1 through 6', () => {
    const result = generateQuestionsSchema.safeParse({
      ...validInput,
      bloom_levels: [1, 2, 3, 4, 5, 6],
    });
    expect(result.success).toBe(true);
  });

  it('rejects bloom_level below 1', () => {
    const result = generateQuestionsSchema.safeParse({
      ...validInput,
      bloom_levels: [0],
    });
    expect(result.success).toBe(false);
  });

  it('rejects bloom_level above 6', () => {
    const result = generateQuestionsSchema.safeParse({
      ...validInput,
      bloom_levels: [7],
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty bloom_levels array', () => {
    const result = generateQuestionsSchema.safeParse({
      ...validInput,
      bloom_levels: [],
    });
    expect(result.success).toBe(false);
  });

  it('accepts question_count at boundaries (1 and 50)', () => {
    expect(generateQuestionsSchema.safeParse({ ...validInput, question_count: 1 }).success).toBe(true);
    expect(generateQuestionsSchema.safeParse({ ...validInput, question_count: 50 }).success).toBe(true);
  });

  it('rejects question_count below 1', () => {
    const result = generateQuestionsSchema.safeParse({ ...validInput, question_count: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects question_count above 50', () => {
    const result = generateQuestionsSchema.safeParse({ ...validInput, question_count: 51 });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer question_count', () => {
    const result = generateQuestionsSchema.safeParse({ ...validInput, question_count: 10.5 });
    expect(result.success).toBe(false);
  });

  it('accepts all valid question_types', () => {
    const result = generateQuestionsSchema.safeParse({
      ...validInput,
      question_types: ['mcq', 'true_false', 'short_answer', 'fill_in_blank'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid question_type value', () => {
    const result = generateQuestionsSchema.safeParse({
      ...validInput,
      question_types: ['essay'],
    });
    expect(result.success).toBe(false);
  });

  it('rejects empty question_types array', () => {
    const result = generateQuestionsSchema.safeParse({
      ...validInput,
      question_types: [],
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-UUID course_id', () => {
    const result = generateQuestionsSchema.safeParse({ ...validInput, course_id: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });

  it('rejects missing required fields', () => {
    expect(generateQuestionsSchema.safeParse({}).success).toBe(false);
    expect(generateQuestionsSchema.safeParse({ course_id: validUUID }).success).toBe(false);
  });
});

// ── questionBankEntrySchema ─────────────────────────────────────────

describe('questionBankEntrySchema', () => {
  const validEntry = {
    course_id: validUUID,
    clo_id: validUUID2,
    bloom_level: 3,
    question_type: 'mcq' as const,
    question_text: 'What is the primary function of a compiler?',
    options: [
      { key: 'A', text: 'Translate source code to machine code', is_correct: true },
      { key: 'B', text: 'Execute programs directly', is_correct: false },
      { key: 'C', text: 'Debug source code', is_correct: false },
      { key: 'D', text: 'Format source code', is_correct: false },
    ],
    correct_answer: {
      value: 'A',
      explanation: 'A compiler translates source code into machine code.',
    },
    difficulty_rating: 2.5,
  };

  it('accepts valid entry with all required fields', () => {
    expect(() => questionBankEntrySchema.parse(validEntry)).not.toThrow();
  });

  it('accepts null options (for non-MCQ types)', () => {
    const result = questionBankEntrySchema.safeParse({
      ...validEntry,
      question_type: 'short_answer',
      options: null,
    });
    expect(result.success).toBe(true);
  });

  it('accepts optional explanation field', () => {
    const result = questionBankEntrySchema.safeParse({
      ...validEntry,
      explanation: 'Additional explanation text',
    });
    expect(result.success).toBe(true);
  });

  it('accepts optional labels field', () => {
    const result = questionBankEntrySchema.safeParse({
      ...validEntry,
      labels: ['midterm', 'chapter-3'],
    });
    expect(result.success).toBe(true);
  });

  it('accepts difficulty_rating at boundaries (1.0 and 5.0)', () => {
    expect(questionBankEntrySchema.safeParse({ ...validEntry, difficulty_rating: 1.0 }).success).toBe(true);
    expect(questionBankEntrySchema.safeParse({ ...validEntry, difficulty_rating: 5.0 }).success).toBe(true);
  });

  it('rejects difficulty_rating below 1.0', () => {
    const result = questionBankEntrySchema.safeParse({ ...validEntry, difficulty_rating: 0.9 });
    expect(result.success).toBe(false);
  });

  it('rejects difficulty_rating above 5.0', () => {
    const result = questionBankEntrySchema.safeParse({ ...validEntry, difficulty_rating: 5.1 });
    expect(result.success).toBe(false);
  });

  it('accepts bloom_level at boundaries (1 and 6)', () => {
    expect(questionBankEntrySchema.safeParse({ ...validEntry, bloom_level: 1 }).success).toBe(true);
    expect(questionBankEntrySchema.safeParse({ ...validEntry, bloom_level: 6 }).success).toBe(true);
  });

  it('rejects bloom_level below 1', () => {
    const result = questionBankEntrySchema.safeParse({ ...validEntry, bloom_level: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects bloom_level above 6', () => {
    const result = questionBankEntrySchema.safeParse({ ...validEntry, bloom_level: 7 });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer bloom_level', () => {
    const result = questionBankEntrySchema.safeParse({ ...validEntry, bloom_level: 2.5 });
    expect(result.success).toBe(false);
  });

  it('accepts all valid question_type values', () => {
    for (const type of ['mcq', 'true_false', 'short_answer', 'fill_in_blank']) {
      const result = questionBankEntrySchema.safeParse({ ...validEntry, question_type: type });
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid question_type', () => {
    const result = questionBankEntrySchema.safeParse({ ...validEntry, question_type: 'essay' });
    expect(result.success).toBe(false);
  });

  it('rejects empty question_text', () => {
    const result = questionBankEntrySchema.safeParse({ ...validEntry, question_text: '' });
    expect(result.success).toBe(false);
  });

  it('accepts correct_answer with array value', () => {
    const result = questionBankEntrySchema.safeParse({
      ...validEntry,
      correct_answer: { value: ['A', 'C'], explanation: 'Multiple correct answers.' },
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing correct_answer', () => {
    const result = questionBankEntrySchema.safeParse({
      course_id: validEntry.course_id,
      clo_id: validEntry.clo_id,
      bloom_level: validEntry.bloom_level,
      question_type: validEntry.question_type,
      question_text: validEntry.question_text,
      options: validEntry.options,
      difficulty_rating: validEntry.difficulty_rating,
    });
    expect(result.success).toBe(false);
  });

  it('rejects option with empty text', () => {
    const result = questionBankEntrySchema.safeParse({
      ...validEntry,
      options: [{ key: 'A', text: '', is_correct: true }],
    });
    expect(result.success).toBe(false);
  });
});

// ── adaptiveQuizConfigSchema ────────────────────────────────────────

describe('adaptiveQuizConfigSchema', () => {
  it('accepts valid config with all fields', () => {
    expect(() =>
      adaptiveQuizConfigSchema.parse({
        is_adaptive: true,
        initial_difficulty: 3.0,
        difficulty_step_up: 0.3,
        difficulty_step_down: 0.5,
        difficulty_range: 0.5,
      }),
    ).not.toThrow();
  });

  it('applies default values for step_up, step_down, and difficulty_range', () => {
    const result = adaptiveQuizConfigSchema.parse({ is_adaptive: true });
    expect(result.difficulty_step_up).toBe(0.3);
    expect(result.difficulty_step_down).toBe(0.5);
    expect(result.difficulty_range).toBe(0.5);
  });

  it('accepts optional initial_difficulty', () => {
    const result = adaptiveQuizConfigSchema.safeParse({ is_adaptive: false });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.initial_difficulty).toBeUndefined();
    }
  });

  it('accepts initial_difficulty at boundaries (1.0 and 5.0)', () => {
    expect(adaptiveQuizConfigSchema.safeParse({ is_adaptive: true, initial_difficulty: 1.0 }).success).toBe(true);
    expect(adaptiveQuizConfigSchema.safeParse({ is_adaptive: true, initial_difficulty: 5.0 }).success).toBe(true);
  });

  it('rejects initial_difficulty below 1.0', () => {
    const result = adaptiveQuizConfigSchema.safeParse({ is_adaptive: true, initial_difficulty: 0.5 });
    expect(result.success).toBe(false);
  });

  it('rejects initial_difficulty above 5.0', () => {
    const result = adaptiveQuizConfigSchema.safeParse({ is_adaptive: true, initial_difficulty: 5.5 });
    expect(result.success).toBe(false);
  });

  it('rejects missing is_adaptive', () => {
    const result = adaptiveQuizConfigSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects non-boolean is_adaptive', () => {
    const result = adaptiveQuizConfigSchema.safeParse({ is_adaptive: 'yes' });
    expect(result.success).toBe(false);
  });
});

// ── recoverySessionSchema ───────────────────────────────────────────

describe('recoverySessionSchema', () => {
  const validSession = {
    student_id: validUUID,
    clo_id: validUUID2,
    course_id: validUUID3,
    status: 'active' as const,
    ai_tutor_completed: false,
    practice_completed: false,
    peer_suggestion_shown: false,
  };

  it('accepts valid session with all fields', () => {
    expect(() => recoverySessionSchema.parse(validSession)).not.toThrow();
  });

  it('accepts all valid status values', () => {
    for (const status of ['active', 'completed', 'expired']) {
      const result = recoverySessionSchema.safeParse({ ...validSession, status });
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid status value', () => {
    const result = recoverySessionSchema.safeParse({ ...validSession, status: 'cancelled' });
    expect(result.success).toBe(false);
  });

  it('accepts boolean fields as true', () => {
    const result = recoverySessionSchema.safeParse({
      ...validSession,
      ai_tutor_completed: true,
      practice_completed: true,
      peer_suggestion_shown: true,
    });
    expect(result.success).toBe(true);
  });

  it('rejects non-boolean ai_tutor_completed', () => {
    const result = recoverySessionSchema.safeParse({ ...validSession, ai_tutor_completed: 'yes' });
    expect(result.success).toBe(false);
  });

  it('rejects non-UUID student_id', () => {
    const result = recoverySessionSchema.safeParse({ ...validSession, student_id: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });

  it('rejects missing required fields', () => {
    expect(recoverySessionSchema.safeParse({}).success).toBe(false);
    expect(recoverySessionSchema.safeParse({ student_id: validUUID }).success).toBe(false);
  });
});

// ── verifiedExplanationSchema ───────────────────────────────────────

describe('verifiedExplanationSchema', () => {
  const validExplanation = {
    question_id: validUUID,
    explanation_text: 'This is the verified explanation for the question.',
    source: 'teacher_approved' as const,
    verified_by: validUUID2,
  };

  it('accepts valid explanation with all fields', () => {
    expect(() => verifiedExplanationSchema.parse(validExplanation)).not.toThrow();
  });

  it('accepts both valid source values', () => {
    expect(verifiedExplanationSchema.safeParse({ ...validExplanation, source: 'teacher_approved' }).success).toBe(true);
    expect(verifiedExplanationSchema.safeParse({ ...validExplanation, source: 'teacher_edited' }).success).toBe(true);
  });

  it('rejects invalid source value', () => {
    const result = verifiedExplanationSchema.safeParse({ ...validExplanation, source: 'ai_generated' });
    expect(result.success).toBe(false);
  });

  it('rejects empty explanation_text', () => {
    const result = verifiedExplanationSchema.safeParse({ ...validExplanation, explanation_text: '' });
    expect(result.success).toBe(false);
  });

  it('rejects non-UUID question_id', () => {
    const result = verifiedExplanationSchema.safeParse({ ...validExplanation, question_id: 'bad-id' });
    expect(result.success).toBe(false);
  });

  it('rejects non-UUID verified_by', () => {
    const result = verifiedExplanationSchema.safeParse({ ...validExplanation, verified_by: 'bad-id' });
    expect(result.success).toBe(false);
  });

  it('rejects missing required fields', () => {
    expect(verifiedExplanationSchema.safeParse({}).success).toBe(false);
    expect(verifiedExplanationSchema.safeParse({ question_id: validUUID }).success).toBe(false);
  });
});

// ── practiceModeConfigSchema ────────────────────────────────────────

describe('practiceModeConfigSchema', () => {
  it('accepts practice_mode_enabled as true', () => {
    expect(() => practiceModeConfigSchema.parse({ practice_mode_enabled: true })).not.toThrow();
  });

  it('accepts practice_mode_enabled as false', () => {
    expect(() => practiceModeConfigSchema.parse({ practice_mode_enabled: false })).not.toThrow();
  });

  it('rejects non-boolean practice_mode_enabled', () => {
    const result = practiceModeConfigSchema.safeParse({ practice_mode_enabled: 'true' });
    expect(result.success).toBe(false);
  });

  it('rejects missing practice_mode_enabled', () => {
    const result = practiceModeConfigSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

// ── bloomsClimbStateSchema ──────────────────────────────────────────

describe('bloomsClimbStateSchema', () => {
  const validState = {
    current_bloom_level: 2,
    consecutive_correct_at_level: 1,
    bloom_transitions: [],
  };

  it('accepts valid state with empty transitions', () => {
    expect(() => bloomsClimbStateSchema.parse(validState)).not.toThrow();
  });

  it('accepts state with transitions', () => {
    const result = bloomsClimbStateSchema.safeParse({
      ...validState,
      bloom_transitions: [
        { from_level: 1, to_level: 2, question_number: 4 },
        { from_level: 2, to_level: 3, question_number: 7 },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('accepts current_bloom_level at boundaries (1 and 6)', () => {
    expect(bloomsClimbStateSchema.safeParse({ ...validState, current_bloom_level: 1 }).success).toBe(true);
    expect(bloomsClimbStateSchema.safeParse({ ...validState, current_bloom_level: 6 }).success).toBe(true);
  });

  it('rejects current_bloom_level below 1', () => {
    const result = bloomsClimbStateSchema.safeParse({ ...validState, current_bloom_level: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects current_bloom_level above 6', () => {
    const result = bloomsClimbStateSchema.safeParse({ ...validState, current_bloom_level: 7 });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer current_bloom_level', () => {
    const result = bloomsClimbStateSchema.safeParse({ ...validState, current_bloom_level: 2.5 });
    expect(result.success).toBe(false);
  });

  it('accepts consecutive_correct_at_level at boundaries (0 and 3)', () => {
    expect(bloomsClimbStateSchema.safeParse({ ...validState, consecutive_correct_at_level: 0 }).success).toBe(true);
    expect(bloomsClimbStateSchema.safeParse({ ...validState, consecutive_correct_at_level: 3 }).success).toBe(true);
  });

  it('rejects consecutive_correct_at_level below 0', () => {
    const result = bloomsClimbStateSchema.safeParse({ ...validState, consecutive_correct_at_level: -1 });
    expect(result.success).toBe(false);
  });

  it('rejects consecutive_correct_at_level above 3', () => {
    const result = bloomsClimbStateSchema.safeParse({ ...validState, consecutive_correct_at_level: 4 });
    expect(result.success).toBe(false);
  });

  it('rejects transition with from_level below 1', () => {
    const result = bloomsClimbStateSchema.safeParse({
      ...validState,
      bloom_transitions: [{ from_level: 0, to_level: 1, question_number: 1 }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects transition with to_level above 6', () => {
    const result = bloomsClimbStateSchema.safeParse({
      ...validState,
      bloom_transitions: [{ from_level: 6, to_level: 7, question_number: 1 }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects transition with question_number below 1', () => {
    const result = bloomsClimbStateSchema.safeParse({
      ...validState,
      bloom_transitions: [{ from_level: 1, to_level: 2, question_number: 0 }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing required fields', () => {
    expect(bloomsClimbStateSchema.safeParse({}).success).toBe(false);
    expect(bloomsClimbStateSchema.safeParse({ current_bloom_level: 2 }).success).toBe(false);
  });
});

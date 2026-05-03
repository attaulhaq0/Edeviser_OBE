// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import {
  assembleSystemPrompt,
  PERSONA_PROMPTS,
  AUTONOMY_PROMPTS,
  SAFETY_INSTRUCTIONS,
} from '@/lib/tutorPrompt';
import type { CLOAttainment, RetrievedChunk, PromptAssemblyInput } from '@/lib/tutorPrompt';

// ── Helpers ─────────────────────────────────────────────────────────

const makeCLO = (
  overrides: Partial<CLOAttainment> = {}
): CLOAttainment => ({
  clo_id: 'clo-1',
  clo_title: 'Understand data structures',
  bloom_level: 'Understanding',
  attainment_percentage: 65,
  ...overrides,
});

const makeChunk = (
  overrides: Partial<RetrievedChunk> = {}
): RetrievedChunk => ({
  chunk_text: 'Arrays are contiguous memory blocks.',
  source_filename: 'lecture-01.pdf',
  material_type: 'lecture_notes',
  similarity_score: 0.85,
  ...overrides,
});

const baseInput: PromptAssemblyInput = {
  persona: 'socratic_guide',
  autonomyLevel: 'L2',
  cloAttainments: [],
  retrievedChunks: [],
};

// ── Empty CLO attainments ───────────────────────────────────────────

describe('assembleSystemPrompt — empty CLO attainments', () => {
  it('does not include CLO section when attainments array is empty', () => {
    const prompt = assembleSystemPrompt({ ...baseInput, cloAttainments: [] });
    expect(prompt).not.toContain('STUDENT CLO PROGRESS');
    expect(prompt).not.toContain('COMPETENCY GAPS');
  });
});

// ── Empty retrieved chunks ──────────────────────────────────────────

describe('assembleSystemPrompt — empty retrieved chunks', () => {
  it('does not include materials section when chunks array is empty', () => {
    const prompt = assembleSystemPrompt({ ...baseInput, retrievedChunks: [] });
    expect(prompt).not.toContain('RELEVANT COURSE MATERIALS');
  });
});

// ── All CLOs above 70% (no gaps) ────────────────────────────────────

describe('assembleSystemPrompt — all CLOs above 70%', () => {
  it('includes CLO progress but no competency gaps section', () => {
    const cloAttainments: CLOAttainment[] = [
      makeCLO({ clo_id: 'clo-1', clo_title: 'CLO A', attainment_percentage: 85 }),
      makeCLO({ clo_id: 'clo-2', clo_title: 'CLO B', attainment_percentage: 92 }),
    ];
    const prompt = assembleSystemPrompt({ ...baseInput, cloAttainments });
    expect(prompt).toContain('STUDENT CLO PROGRESS');
    expect(prompt).toContain('CLO A');
    expect(prompt).toContain('CLO B');
    expect(prompt).toContain('✓');
    expect(prompt).not.toContain('COMPETENCY GAPS');
  });
});

// ── All CLOs below 70% (all gaps) ───────────────────────────────────

describe('assembleSystemPrompt — all CLOs below 70%', () => {
  it('includes CLO progress and competency gaps for all CLOs', () => {
    const cloAttainments: CLOAttainment[] = [
      makeCLO({ clo_id: 'clo-1', clo_title: 'CLO X', attainment_percentage: 40 }),
      makeCLO({ clo_id: 'clo-2', clo_title: 'CLO Y', attainment_percentage: 55 }),
    ];
    const prompt = assembleSystemPrompt({ ...baseInput, cloAttainments });
    expect(prompt).toContain('STUDENT CLO PROGRESS');
    expect(prompt).toContain('COMPETENCY GAPS');
    expect(prompt).toContain('CLO X');
    expect(prompt).toContain('CLO Y');
    expect(prompt).toContain('⚠ NEEDS IMPROVEMENT');
    expect(prompt).toContain('focus tutoring here');
  });
});

// ── Mixed CLOs ──────────────────────────────────────────────────────

describe('assembleSystemPrompt — mixed CLOs', () => {
  it('marks CLOs below 70% as gaps and above 70% as passing', () => {
    const cloAttainments: CLOAttainment[] = [
      makeCLO({ clo_id: 'clo-1', clo_title: 'Passing CLO', attainment_percentage: 80 }),
      makeCLO({ clo_id: 'clo-2', clo_title: 'Failing CLO', attainment_percentage: 45 }),
    ];
    const prompt = assembleSystemPrompt({ ...baseInput, cloAttainments });
    expect(prompt).toContain('STUDENT CLO PROGRESS');
    expect(prompt).toContain('COMPETENCY GAPS');
    expect(prompt).toContain('Passing CLO');
    expect(prompt).toContain('Failing CLO');
    // Passing CLO should have ✓, failing should have ⚠
    expect(prompt).toContain('80% ✓');
    expect(prompt).toContain('45% ⚠ NEEDS IMPROVEMENT');
    // Only failing CLO in gaps section
    expect(prompt).toContain('Failing CLO: 45% — focus tutoring here');
  });
});

// ── Persona text inclusion ──────────────────────────────────────────

describe('assembleSystemPrompt — persona text', () => {
  it('includes socratic_guide persona text', () => {
    const prompt = assembleSystemPrompt({ ...baseInput, persona: 'socratic_guide' });
    expect(prompt).toContain(PERSONA_PROMPTS.socratic_guide);
  });

  it('includes step_by_step_coach persona text', () => {
    const prompt = assembleSystemPrompt({ ...baseInput, persona: 'step_by_step_coach' });
    expect(prompt).toContain(PERSONA_PROMPTS.step_by_step_coach);
  });

  it('includes quick_explainer persona text', () => {
    const prompt = assembleSystemPrompt({ ...baseInput, persona: 'quick_explainer' });
    expect(prompt).toContain(PERSONA_PROMPTS.quick_explainer);
  });
});

// ── Autonomy level instructions ─────────────────────────────────────

describe('assembleSystemPrompt — autonomy level instructions', () => {
  it('includes L1 autonomy instructions', () => {
    const prompt = assembleSystemPrompt({ ...baseInput, autonomyLevel: 'L1' });
    expect(prompt).toContain(AUTONOMY_PROMPTS.L1);
  });

  it('includes L2 autonomy instructions', () => {
    const prompt = assembleSystemPrompt({ ...baseInput, autonomyLevel: 'L2' });
    expect(prompt).toContain(AUTONOMY_PROMPTS.L2);
  });

  it('includes L3 autonomy instructions', () => {
    const prompt = assembleSystemPrompt({ ...baseInput, autonomyLevel: 'L3' });
    expect(prompt).toContain(AUTONOMY_PROMPTS.L3);
  });
});

// ── Safety instructions ─────────────────────────────────────────────

describe('assembleSystemPrompt — safety instructions', () => {
  it('always includes safety instructions', () => {
    const prompt = assembleSystemPrompt(baseInput);
    expect(prompt).toContain(SAFETY_INSTRUCTIONS);
  });
});

// ── Course name ─────────────────────────────────────────────────────

describe('assembleSystemPrompt — course name', () => {
  it('includes course name when provided', () => {
    const prompt = assembleSystemPrompt({ ...baseInput, courseName: 'Data Structures 101' });
    expect(prompt).toContain('Data Structures 101');
  });

  it('uses generic intro when course name is not provided', () => {
    const prompt = assembleSystemPrompt(baseInput);
    expect(prompt).toContain('helping a student with their coursework');
  });
});

// ── Retrieved chunks in prompt ──────────────────────────────────────

describe('assembleSystemPrompt — retrieved chunks', () => {
  it('includes chunk text and source info', () => {
    const chunks: RetrievedChunk[] = [
      makeChunk({ chunk_text: 'Linked lists use pointers.', source_filename: 'ch2.pdf' }),
      makeChunk({ chunk_text: 'Trees are hierarchical.', source_filename: 'ch3.pdf' }),
    ];
    const prompt = assembleSystemPrompt({ ...baseInput, retrievedChunks: chunks });
    expect(prompt).toContain('RELEVANT COURSE MATERIALS');
    expect(prompt).toContain('[1] Source: ch2.pdf');
    expect(prompt).toContain('Linked lists use pointers.');
    expect(prompt).toContain('[2] Source: ch3.pdf');
    expect(prompt).toContain('Trees are hierarchical.');
  });
});

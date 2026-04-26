// Feature: ai-tutor-rag, Property 38: Autonomy level resolution precedence
// Feature: ai-tutor-rag, Property 39: Student autonomy override respects teacher ceiling
// Feature: ai-tutor-rag, Property 40: Autonomy level logged in every message (resolved is always valid)
// Feature: ai-tutor-rag, Property 41: Default is L2 when no config exists
// Feature: ai-tutor-rag, Property 42: Autonomy level appears in assembled system prompt
// **Validates: Requirements 21.1, 21.2, 21.3, 21.4, 21.5, 22.3, 22.4, 23.3**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  resolveAutonomyLevel,
  isValidAutonomyLevel,
  DEFAULT_AUTONOMY_LEVEL,
} from '@/lib/tutorAutonomy';
import {
  assembleSystemPrompt,
  getAutonomyPrompt,
} from '@/lib/tutorPrompt';
import type { AutonomyLevel } from '@/lib/tutorSchemas';

// ─── Generators ─────────────────────────────────────────────────────────────

const autonomyLevelArb = fc.constantFrom<AutonomyLevel>('L1', 'L2', 'L3');
const optionalAutonomyArb = fc.option(autonomyLevelArb, { nil: null });
const studentOverrideArb = fc.option(
  fc.constantFrom<'L1' | 'L3'>('L1', 'L3'),
  { nil: null },
);

// ─── Property 38: Assignment-level autonomy takes precedence over CLO-level ─

describe('Property 38 — Autonomy level resolution precedence', () => {
  it('P38a: assignment-level config takes precedence over CLO-level', () => {
    fc.assert(
      fc.property(
        autonomyLevelArb,
        autonomyLevelArb,
        (assignmentLevel, cloLevel) => {
          const resolved = resolveAutonomyLevel(assignmentLevel, cloLevel);
          expect(resolved).toBe(assignmentLevel);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P38b: CLO-level is used when assignment-level is null', () => {
    fc.assert(
      fc.property(
        autonomyLevelArb,
        (cloLevel) => {
          const resolved = resolveAutonomyLevel(null, cloLevel);
          expect(resolved).toBe(cloLevel);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 39: Student override cannot exceed teacher ceiling ────────────

describe('Property 39 — Student override cannot exceed teacher ceiling', () => {
  it('P39a: student override L3 is capped by teacher ceiling', () => {
    fc.assert(
      fc.property(
        autonomyLevelArb,
        (teacherLevel) => {
          const resolved = resolveAutonomyLevel(teacherLevel, null, 'L3');
          const levels: AutonomyLevel[] = ['L1', 'L2', 'L3'];
          const resolvedIdx = levels.indexOf(resolved);
          const ceilingIdx = levels.indexOf(teacherLevel);
          expect(resolvedIdx).toBeLessThanOrEqual(ceilingIdx);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P39b: student override L1 is always allowed (more restrictive)', () => {
    fc.assert(
      fc.property(
        autonomyLevelArb,
        (teacherLevel) => {
          const resolved = resolveAutonomyLevel(teacherLevel, null, 'L1');
          expect(resolved).toBe('L1');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P39c: student override never exceeds teacher ceiling across all combos', () => {
    fc.assert(
      fc.property(
        optionalAutonomyArb,
        optionalAutonomyArb,
        studentOverrideArb,
        (assignmentLevel, cloLevel, studentOverride) => {
          const resolved = resolveAutonomyLevel(assignmentLevel, cloLevel, studentOverride);
          const teacherCeiling = assignmentLevel ?? cloLevel ?? DEFAULT_AUTONOMY_LEVEL;
          const levels: AutonomyLevel[] = ['L1', 'L2', 'L3'];
          const resolvedIdx = levels.indexOf(resolved);
          const ceilingIdx = levels.indexOf(teacherCeiling);
          if (studentOverride) {
            expect(resolvedIdx).toBeLessThanOrEqual(ceilingIdx);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 40: Resolved level is always a valid AutonomyLevel ────────────

describe('Property 40 — Resolved level is always a valid AutonomyLevel', () => {
  it('P40: resolved level is always L1, L2, or L3', () => {
    fc.assert(
      fc.property(
        optionalAutonomyArb,
        optionalAutonomyArb,
        studentOverrideArb,
        (assignmentLevel, cloLevel, studentOverride) => {
          const resolved = resolveAutonomyLevel(assignmentLevel, cloLevel, studentOverride);
          expect(isValidAutonomyLevel(resolved)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 41: Default is L2 when no config exists ───────────────────────

describe('Property 41 — Default is L2 when no config exists', () => {
  it('P41: resolves to L2 when both assignment and CLO levels are null and no override', () => {
    fc.assert(
      fc.property(
        fc.constant(null),
        fc.constant(null),
        fc.constant(null),
        () => {
          const resolved = resolveAutonomyLevel(null, null, null);
          expect(resolved).toBe('L2');
          expect(resolved).toBe(DEFAULT_AUTONOMY_LEVEL);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 42: Autonomy level appears in assembled system prompt ─────────

describe('Property 42 — Autonomy level appears in assembled system prompt', () => {
  it('P42a: system prompt contains the correct autonomy level modifier', () => {
    fc.assert(
      fc.property(
        autonomyLevelArb,
        (level) => {
          const prompt = assembleSystemPrompt({
            persona: 'socratic_guide',
            autonomyLevel: level,
            cloAttainments: [],
            ragChunks: [],
          });
          const expectedText = getAutonomyPrompt(level);
          expect(prompt).toContain(expectedText);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P42b: system prompt does NOT contain autonomy modifiers for other levels', () => {
    fc.assert(
      fc.property(
        autonomyLevelArb,
        (level) => {
          const prompt = assembleSystemPrompt({
            persona: 'quick_explainer',
            autonomyLevel: level,
            cloAttainments: [],
            ragChunks: [],
          });
          const allLevels: AutonomyLevel[] = ['L1', 'L2', 'L3'];
          const otherLevels = allLevels.filter((l) => l !== level);
          for (const other of otherLevels) {
            const otherText = getAutonomyPrompt(other);
            expect(prompt).not.toContain(otherText);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P42c: L1 prompt prohibits direct answers', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<AutonomyLevel>('L1'),
        () => {
          const prompt = assembleSystemPrompt({
            persona: 'socratic_guide',
            autonomyLevel: 'L1',
            cloAttainments: [],
            ragChunks: [],
          });
          expect(prompt).toContain('NEVER provide direct answers');
          expect(prompt).toContain('guiding questions');
          expect(prompt).toContain('hints');
        },
      ),
      { numRuns: 100 },
    );
  });
});

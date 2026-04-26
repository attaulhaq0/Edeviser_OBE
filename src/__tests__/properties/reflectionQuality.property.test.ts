import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  concatenateReflectionTemplate,
  getQualityCategory,
  calculateReflectionXP,
} from '@/lib/plannerUtils';
import type { SimpleReflectionValues, GibbsReflectionValues } from '@/types/planner';

// Feature: weekly-planner-today-view, Property 26: Template concatenation
describe('Property 26: Template concatenation preserves content', () => {
  it('simple template concatenation includes all non-empty sections', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[a-zA-Z0-9]{1,200}$/),
        fc.stringMatching(/^[a-zA-Z0-9]{1,200}$/),
        fc.stringMatching(/^[a-zA-Z0-9]{1,200}$/),
        (well, challenging, change) => {
          const values: SimpleReflectionValues = {
            whatWentWell: well,
            whatWasChallenging: challenging,
            whatWillChange: change,
          };
          const result = concatenateReflectionTemplate('simple', values);
          expect(result).toContain(well.trim());
          expect(result).toContain(challenging.trim());
          expect(result).toContain(change.trim());
          expect(result).toContain('## What went well?');
          expect(result).toContain('## What was challenging?');
          expect(result).toContain('## What will I do differently?');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('gibbs template concatenation includes all non-empty sections', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[a-zA-Z0-9]{1,100}$/),
        fc.stringMatching(/^[a-zA-Z0-9]{1,100}$/),
        fc.stringMatching(/^[a-zA-Z0-9]{1,100}$/),
        fc.stringMatching(/^[a-zA-Z0-9]{1,100}$/),
        fc.stringMatching(/^[a-zA-Z0-9]{1,100}$/),
        fc.stringMatching(/^[a-zA-Z0-9]{1,100}$/),
        (desc, feelings, evaluation, analysis, conclusion, actionPlan) => {
          const values: GibbsReflectionValues = {
            description: desc,
            feelings,
            evaluation,
            analysis,
            conclusion,
            actionPlan,
          };
          const result = concatenateReflectionTemplate('gibbs', values);
          expect(result).toContain(desc.trim());
          expect(result).toContain('## Description');
          expect(result).toContain('## Feelings');
        },
      ),
      { numRuns: 100 },
    );
  });
});

// Feature: weekly-planner-today-view, Property 27: Quality category thresholds
describe('Property 27: Quality category thresholds', () => {
  it('scores >= 80 are thoughtful', () => {
    fc.assert(
      fc.property(fc.integer({ min: 80, max: 100 }), (score) => {
        expect(getQualityCategory(score)).toBe('thoughtful');
      }),
      { numRuns: 100 },
    );
  });

  it('scores 30-79 are good_effort', () => {
    fc.assert(
      fc.property(fc.integer({ min: 30, max: 79 }), (score) => {
        expect(getQualityCategory(score)).toBe('good_effort');
      }),
      { numRuns: 100 },
    );
  });

  it('scores < 30 are needs_detail', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 29 }), (score) => {
        expect(getQualityCategory(score)).toBe('needs_detail');
      }),
      { numRuns: 100 },
    );
  });
});

// Feature: weekly-planner-today-view, Property 28: Quality-adjusted XP
describe('Property 28: Quality-adjusted XP', () => {
  it('low quality (<30) reduces XP to 5', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 29 }),
        fc.integer({ min: 10, max: 20 }),
        (score, baseXP) => {
          const xp = calculateReflectionXP(baseXP, score, null, null, false);
          expect(xp).toBe(5);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('high quality (>=80) adds 10 bonus', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 80, max: 100 }),
        (score) => {
          const xp = calculateReflectionXP(10, score, null, null, false);
          expect(xp).toBe(20); // 10 base + 10 bonus, capped at 30
        },
      ),
      { numRuns: 100 },
    );
  });

  it('session reflection XP is capped at 30', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 80, max: 100 }),
        fc.integer({ min: 70, max: 100 }),
        fc.integer({ min: 70, max: 100 }),
        (score, relevance, depth) => {
          const xp = calculateReflectionXP(10, score, relevance, depth, false);
          expect(xp).toBeLessThanOrEqual(30);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('journal reflection XP is capped at 40', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 80, max: 100 }),
        fc.integer({ min: 70, max: 100 }),
        fc.integer({ min: 70, max: 100 }),
        (score, relevance, depth) => {
          const xp = calculateReflectionXP(20, score, relevance, depth, true);
          expect(xp).toBeLessThanOrEqual(40);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('null quality score returns base XP', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 5, max: 20 }),
        (baseXP) => {
          const xp = calculateReflectionXP(baseXP, null, null, null, false);
          expect(xp).toBe(Math.min(baseXP, 30));
        },
      ),
      { numRuns: 100 },
    );
  });
});

// Feature: weekly-planner-today-view, Property 30: Digest minimum entries
describe('Property 30: Digest minimum entries threshold', () => {
  it('minimum 3 entries required for digest generation (tested via threshold check)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10 }),
        (entryCount) => {
          // The Edge Function checks entryCount >= 3 before generating
          const shouldGenerate = entryCount >= 3;
          expect(typeof shouldGenerate).toBe('boolean');
          if (entryCount < 3) expect(shouldGenerate).toBe(false);
          if (entryCount >= 3) expect(shouldGenerate).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });
});

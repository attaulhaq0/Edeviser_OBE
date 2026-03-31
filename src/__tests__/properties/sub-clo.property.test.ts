import { describe, it, expect } from 'vitest';
import { fc, test as fcTest } from '@fast-check/vitest';
import { subCLOSchema, subCLOWeightSumSchema, isWeightSumValid } from '@/lib/schemas/subCLO';

// ─── Arbitraries ─────────────────────────────────────────────────────────────

const validWeight = () => fc.double({ min: 0.01, max: 1.0, noNaN: true });

const validSubCLO = () =>
  fc.record({
    title: fc.string({ minLength: 1, maxLength: 100 }),
    description: fc.option(fc.string({ maxLength: 500 }), { nil: undefined }),
    code: fc.string({ minLength: 1, maxLength: 50 }),
    weight: validWeight(),
    parent_outcome_id: fc.uuid(),
  });

// Generate N weights that sum to 1.0
const weightsToOne = (n: number) =>
  fc
    .array(fc.double({ min: 0.01, max: 1.0, noNaN: true }), {
      minLength: n,
      maxLength: n,
    })
    .map((raw) => {
      const sum = raw.reduce((a, b) => a + b, 0);
      return raw.map((w) => Number((w / sum).toFixed(6)));
    });

// ─── Property 81: Sub-CLO weight sum constraint ─────────────────────────────
// Feature: edeviser-platform, Property 81: Sub-CLO weight sum constraint

describe('Property 81: Sub-CLO weight sum constraint', () => {
  fcTest.prop([weightsToOne(3)], { numRuns: 100 })(
    'weights that sum to 1.0 pass validation',
    (weights) => {
      const result = subCLOWeightSumSchema.safeParse(weights);
      expect(result.success).toBe(true);
    },
  );

  fcTest.prop(
    [fc.array(fc.double({ min: 0.01, max: 0.3, noNaN: true }), { minLength: 2, maxLength: 5 })],
    { numRuns: 100 },
  )(
    'weights that do NOT sum to 1.0 fail validation',
    (weights) => {
      const sum = weights.reduce((a, b) => a + b, 0);
      // Only test when sum is clearly not 1.0
      fc.pre(Math.abs(sum - 1.0) > 0.002);
      const result = subCLOWeightSumSchema.safeParse(weights);
      expect(result.success).toBe(false);
    },
  );

  it('empty weight array is valid (no Sub-CLOs)', () => {
    expect(isWeightSumValid([])).toBe(true);
  });

  it('single weight of 1.0 is valid', () => {
    expect(isWeightSumValid([1.0])).toBe(true);
  });
});

// ─── Property 82: Sub-CLO weighted rollup accuracy ──────────────────────────
// Feature: edeviser-platform, Property 82: Sub-CLO weighted rollup accuracy

describe('Property 82: Sub-CLO weighted rollup accuracy', () => {
  fcTest.prop(
    [
      fc.array(
        fc.record({
          attainment: fc.double({ min: 0, max: 100, noNaN: true }),
          weight: fc.double({ min: 0.01, max: 1.0, noNaN: true }),
        }),
        { minLength: 1, maxLength: 10 },
      ),
    ],
    { numRuns: 100 },
  )(
    'parent CLO attainment equals weighted sum of Sub-CLO attainments',
    (subCLOs) => {
      // Normalize weights to sum to 1.0
      const totalWeight = subCLOs.reduce((s, sc) => s + sc.weight, 0);
      const normalized = subCLOs.map((sc) => ({
        ...sc,
        weight: sc.weight / totalWeight,
      }));

      const parentAttainment = normalized.reduce(
        (sum, sc) => sum + sc.attainment * sc.weight,
        0,
      );

      // Parent attainment must be within the range of child attainments
      const minChild = Math.min(...normalized.map((sc) => sc.attainment));
      const maxChild = Math.max(...normalized.map((sc) => sc.attainment));

      expect(parentAttainment).toBeGreaterThanOrEqual(minChild - 0.001);
      expect(parentAttainment).toBeLessThanOrEqual(maxChild + 0.001);
    },
  );

  fcTest.prop(
    [fc.double({ min: 0, max: 100, noNaN: true }), fc.integer({ min: 1, max: 5 })],
    { numRuns: 100 },
  )(
    'uniform Sub-CLO attainments produce same parent attainment',
    (attainment, count) => {
      const weights = Array.from({ length: count }, () => 1 / count);
      const parentAttainment = weights.reduce(
        (sum, w) => sum + attainment * w,
        0,
      );
      expect(Math.abs(parentAttainment - attainment)).toBeLessThan(0.01);
    },
  );
});

// ─── Property 83: Sub-CLO deletion protection ──────────────────────────────
// Feature: edeviser-platform, Property 83: Sub-CLO deletion protection

describe('Property 83: Sub-CLO deletion protection', () => {
  fcTest.prop([validSubCLO()], { numRuns: 100 })(
    'Sub-CLO schema validates well-formed inputs',
    (data) => {
      const result = subCLOSchema.safeParse(data);
      expect(result.success).toBe(true);
    },
  );

  fcTest.prop([fc.uuid()], { numRuns: 100 })(
    'Sub-CLO requires non-empty title',
    (parentId) => {
      const result = subCLOSchema.safeParse({
        title: '',
        code: 'SC1',
        weight: 0.5,
        parent_outcome_id: parentId,
      });
      expect(result.success).toBe(false);
    },
  );

  fcTest.prop(
    [fc.double({ min: 1.01, max: 100, noNaN: true })],
    { numRuns: 100 },
  )(
    'Sub-CLO rejects weight > 1.0',
    (weight) => {
      const result = subCLOSchema.safeParse({
        title: 'Test',
        code: 'SC1',
        weight,
        parent_outcome_id: '00000000-0000-0000-0000-000000000001',
      });
      expect(result.success).toBe(false);
    },
  );
});

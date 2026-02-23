import { describe, it, expect } from 'vitest';

// ─── Extracted pure logic from the Edge Function for testing ────────────────

type AttainmentLevel = 'Excellent' | 'Satisfactory' | 'Developing' | 'Not_Yet';

function classifyAttainment(percent: number): AttainmentLevel {
  if (percent >= 85) return 'Excellent';
  if (percent >= 70) return 'Satisfactory';
  if (percent >= 50) return 'Developing';
  return 'Not_Yet';
}

function calculateWeightedAverage(
  items: Array<{ percent: number; weight: number }>,
): number | null {
  let weightedSum = 0;
  let totalWeight = 0;
  for (const item of items) {
    weightedSum += item.percent * item.weight;
    totalWeight += item.weight;
  }
  if (totalWeight === 0) return null;
  return Math.round((weightedSum / totalWeight) * 100) / 100;
}

function calculateSimpleAverage(scores: number[]): number | null {
  if (scores.length === 0) return null;
  return scores.reduce((sum, s) => sum + s, 0) / scores.length;
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('classifyAttainment', () => {
  it('returns Excellent for scores >= 85', () => {
    expect(classifyAttainment(85)).toBe('Excellent');
    expect(classifyAttainment(100)).toBe('Excellent');
    expect(classifyAttainment(92.5)).toBe('Excellent');
  });

  it('returns Satisfactory for scores 70-84', () => {
    expect(classifyAttainment(70)).toBe('Satisfactory');
    expect(classifyAttainment(84)).toBe('Satisfactory');
    expect(classifyAttainment(84.99)).toBe('Satisfactory');
  });

  it('returns Developing for scores 50-69', () => {
    expect(classifyAttainment(50)).toBe('Developing');
    expect(classifyAttainment(69)).toBe('Developing');
    expect(classifyAttainment(69.99)).toBe('Developing');
  });

  it('returns Not_Yet for scores < 50', () => {
    expect(classifyAttainment(0)).toBe('Not_Yet');
    expect(classifyAttainment(49)).toBe('Not_Yet');
    expect(classifyAttainment(49.99)).toBe('Not_Yet');
  });

  it('handles boundary values exactly', () => {
    expect(classifyAttainment(85)).toBe('Excellent');
    expect(classifyAttainment(70)).toBe('Satisfactory');
    expect(classifyAttainment(50)).toBe('Developing');
  });
});

describe('calculateWeightedAverage', () => {
  it('calculates weighted average correctly', () => {
    const items = [
      { percent: 80, weight: 0.6 },
      { percent: 90, weight: 0.4 },
    ];
    // (80*0.6 + 90*0.4) / (0.6+0.4) = (48+36)/1 = 84
    expect(calculateWeightedAverage(items)).toBe(84);
  });

  it('returns null for empty items', () => {
    expect(calculateWeightedAverage([])).toBeNull();
  });

  it('returns null when total weight is zero', () => {
    expect(calculateWeightedAverage([{ percent: 80, weight: 0 }])).toBeNull();
  });

  it('handles single item', () => {
    expect(calculateWeightedAverage([{ percent: 75, weight: 1 }])).toBe(75);
  });

  it('handles unequal weights', () => {
    const items = [
      { percent: 100, weight: 0.3 },
      { percent: 60, weight: 0.7 },
    ];
    // (100*0.3 + 60*0.7) / 1.0 = (30+42)/1 = 72
    expect(calculateWeightedAverage(items)).toBe(72);
  });
});

describe('calculateSimpleAverage', () => {
  it('calculates simple average correctly', () => {
    expect(calculateSimpleAverage([80, 90, 70])).toBe(80);
  });

  it('returns null for empty array', () => {
    expect(calculateSimpleAverage([])).toBeNull();
  });

  it('handles single score', () => {
    expect(calculateSimpleAverage([85])).toBe(85);
  });

  it('handles decimal scores', () => {
    expect(calculateSimpleAverage([75.5, 84.5])).toBe(80);
  });
});

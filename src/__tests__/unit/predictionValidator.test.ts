import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Supabase mock — fine-grained control per table + operation
// ---------------------------------------------------------------------------

interface MockQueryResult {
  data: unknown;
  error: unknown;
}

let aiFeedbackSelectResult: MockQueryResult;
let aiFeedbackUpdateResult: MockQueryResult;
let outcomeAttainmentSelectResult: MockQueryResult;

// Track calls for assertions
const aiFeedbackSelectCalls: Array<{ method: string; args: unknown[] }> = [];
const aiFeedbackUpdateCalls: Array<{ method: string; args: unknown[] }> = [];
const outcomeAttainmentSelectCalls: Array<{ method: string; args: unknown[] }> = [];

function createSelectChain(resultRef: () => MockQueryResult, tracker: typeof aiFeedbackSelectCalls) {
  const chain: Record<string, (...args: unknown[]) => unknown> = {};
  const proxy = new Proxy(chain, {
    get(_target, prop: string) {
      if (prop === 'then' || prop === 'catch') return undefined;
      if (prop === 'data') return resultRef().data;
      if (prop === 'error') return resultRef().error;
      return (...args: unknown[]) => {
        tracker.push({ method: prop, args });
        return proxy;
      };
    },
  });
  return proxy;
}

function createUpdateChain(resultRef: () => MockQueryResult, tracker: typeof aiFeedbackUpdateCalls) {
  const chain: Record<string, (...args: unknown[]) => unknown> = {};
  const proxy = new Proxy(chain, {
    get(_target, prop: string) {
      if (prop === 'then' || prop === 'catch') return undefined;
      if (prop === 'data') return resultRef().data;
      if (prop === 'error') return resultRef().error;
      return (...args: unknown[]) => {
        tracker.push({ method: prop, args });
        return proxy;
      };
    },
  });
  return proxy;
}

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (table: string) => {
      if (table === 'ai_feedback') {
        return {
          select: (...args: unknown[]) => {
            aiFeedbackSelectCalls.push({ method: 'select', args });
            return createSelectChain(() => aiFeedbackSelectResult, aiFeedbackSelectCalls);
          },
          update: (...args: unknown[]) => {
            aiFeedbackUpdateCalls.push({ method: 'update', args });
            return createUpdateChain(() => aiFeedbackUpdateResult, aiFeedbackUpdateCalls);
          },
        };
      }
      if (table === 'outcome_attainment') {
        return {
          select: (...args: unknown[]) => {
            outcomeAttainmentSelectCalls.push({ method: 'select', args });
            return createSelectChain(() => outcomeAttainmentSelectResult, outcomeAttainmentSelectCalls);
          },
        };
      }
      return createSelectChain(() => ({ data: null, error: null }), []);
    },
  },
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

import { validateAtRiskPredictions } from '@/lib/predictionValidator';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('validateAtRiskPredictions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    aiFeedbackSelectCalls.length = 0;
    aiFeedbackUpdateCalls.length = 0;
    outcomeAttainmentSelectCalls.length = 0;

    aiFeedbackSelectResult = { data: [], error: null };
    aiFeedbackUpdateResult = { data: null, error: null };
    outcomeAttainmentSelectResult = { data: [], error: null };
  });

  it('returns early with zero updates when studentId is empty', async () => {
    const result = await validateAtRiskPredictions('', ['clo-1']);
    expect(result.updatedCount).toBe(0);
    expect(result.errors).toHaveLength(0);
  });

  it('returns early with zero updates when cloIds is empty', async () => {
    const result = await validateAtRiskPredictions('student-1', []);
    expect(result.updatedCount).toBe(0);
    expect(result.errors).toHaveLength(0);
  });

  it('returns zero updates when no predictions exist', async () => {
    aiFeedbackSelectResult = { data: [], error: null };

    const result = await validateAtRiskPredictions('student-1', ['clo-1']);
    expect(result.updatedCount).toBe(0);
    expect(result.errors).toHaveLength(0);
  });

  it('returns zero updates when predictions exist but none match the CLO IDs', async () => {
    aiFeedbackSelectResult = {
      data: [
        { id: 'pred-1', suggestion_data: { at_risk_clo_id: 'clo-99' } },
      ],
      error: null,
    };

    const result = await validateAtRiskPredictions('student-1', ['clo-1']);
    expect(result.updatedCount).toBe(0);
  });

  it('marks prediction as "correct" when attainment is below 70%', async () => {
    aiFeedbackSelectResult = {
      data: [
        { id: 'pred-1', suggestion_data: { at_risk_clo_id: 'clo-1' } },
      ],
      error: null,
    };
    outcomeAttainmentSelectResult = {
      data: [{ outcome_id: 'clo-1', attainment_percent: 55 }],
      error: null,
    };
    aiFeedbackUpdateResult = { data: null, error: null };

    const result = await validateAtRiskPredictions('student-1', ['clo-1']);
    expect(result.updatedCount).toBe(1);
    expect(result.errors).toHaveLength(0);

    // Verify the update was called with 'correct'
    const updateCall = aiFeedbackUpdateCalls.find((c) => c.method === 'update');
    expect(updateCall).toBeDefined();
    expect(updateCall!.args[0]).toEqual({ validated_outcome: 'correct' });
  });

  it('marks prediction as "incorrect" when attainment is >= 70%', async () => {
    aiFeedbackSelectResult = {
      data: [
        { id: 'pred-1', suggestion_data: { at_risk_clo_id: 'clo-1' } },
      ],
      error: null,
    };
    outcomeAttainmentSelectResult = {
      data: [{ outcome_id: 'clo-1', attainment_percent: 85 }],
      error: null,
    };
    aiFeedbackUpdateResult = { data: null, error: null };

    const result = await validateAtRiskPredictions('student-1', ['clo-1']);
    expect(result.updatedCount).toBe(1);

    const updateCall = aiFeedbackUpdateCalls.find((c) => c.method === 'update');
    expect(updateCall).toBeDefined();
    expect(updateCall!.args[0]).toEqual({ validated_outcome: 'incorrect' });
  });

  it('marks prediction as "correct" when no attainment record exists', async () => {
    aiFeedbackSelectResult = {
      data: [
        { id: 'pred-1', suggestion_data: { at_risk_clo_id: 'clo-1' } },
      ],
      error: null,
    };
    outcomeAttainmentSelectResult = { data: [], error: null };
    aiFeedbackUpdateResult = { data: null, error: null };

    const result = await validateAtRiskPredictions('student-1', ['clo-1']);
    expect(result.updatedCount).toBe(1);

    const updateCall = aiFeedbackUpdateCalls.find((c) => c.method === 'update');
    expect(updateCall!.args[0]).toEqual({ validated_outcome: 'correct' });
  });

  it('marks prediction as "incorrect" at exactly 70% threshold', async () => {
    aiFeedbackSelectResult = {
      data: [
        { id: 'pred-1', suggestion_data: { at_risk_clo_id: 'clo-1' } },
      ],
      error: null,
    };
    outcomeAttainmentSelectResult = {
      data: [{ outcome_id: 'clo-1', attainment_percent: 70 }],
      error: null,
    };
    aiFeedbackUpdateResult = { data: null, error: null };

    const result = await validateAtRiskPredictions('student-1', ['clo-1']);
    expect(result.updatedCount).toBe(1);

    const updateCall = aiFeedbackUpdateCalls.find((c) => c.method === 'update');
    expect(updateCall!.args[0]).toEqual({ validated_outcome: 'incorrect' });
  });

  it('collects error when ai_feedback select fails', async () => {
    aiFeedbackSelectResult = { data: null, error: { message: 'DB error' } };

    const result = await validateAtRiskPredictions('student-1', ['clo-1']);
    expect(result.updatedCount).toBe(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('Failed to fetch predictions');
  });

  it('collects error when outcome_attainment select fails', async () => {
    aiFeedbackSelectResult = {
      data: [
        { id: 'pred-1', suggestion_data: { at_risk_clo_id: 'clo-1' } },
      ],
      error: null,
    };
    outcomeAttainmentSelectResult = { data: null, error: { message: 'Attainment error' } };

    const result = await validateAtRiskPredictions('student-1', ['clo-1']);
    expect(result.updatedCount).toBe(0);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('Failed to fetch attainment');
  });

  it('handles multiple predictions for different CLOs', async () => {
    aiFeedbackSelectResult = {
      data: [
        { id: 'pred-1', suggestion_data: { at_risk_clo_id: 'clo-1' } },
        { id: 'pred-2', suggestion_data: { at_risk_clo_id: 'clo-2' } },
      ],
      error: null,
    };
    outcomeAttainmentSelectResult = {
      data: [
        { outcome_id: 'clo-1', attainment_percent: 45 },
        { outcome_id: 'clo-2', attainment_percent: 80 },
      ],
      error: null,
    };
    aiFeedbackUpdateResult = { data: null, error: null };

    const result = await validateAtRiskPredictions('student-1', ['clo-1', 'clo-2']);
    expect(result.updatedCount).toBe(2);
    expect(result.errors).toHaveLength(0);
  });
});

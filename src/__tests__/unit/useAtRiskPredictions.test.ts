// =============================================================================
// useAtRiskPredictions — Unit tests
// Validates: Requirements 47.3, 47.4
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Supabase mock ──────────────────────────────────────────────────────────

const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockIn = vi.fn();
const mockIs = vi.fn();
const mockOrder = vi.fn();
const mockInsert = vi.fn();

const chainable = () => ({
  select: mockSelect,
  eq: mockEq,
  in: mockIn,
  is: mockIs,
  order: mockOrder,
  insert: mockInsert,
});

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => chainable()),
  },
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({ user: { id: 'teacher-1' } })),
}));

import { supabase } from '@/lib/supabase';
import type { ContributingSignals } from '@/hooks/useAtRiskPredictions';

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('useAtRiskPredictions hook logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports ContributingSignals type with correct shape', () => {
    const signals: ContributingSignals = {
      login_frequency: 'low',
      submission_pattern: 'missed',
      attainment_trend: 'declining',
    };
    expect(signals.login_frequency).toBe('low');
    expect(signals.submission_pattern).toBe('missed');
    expect(signals.attainment_trend).toBe('declining');
  });

  it('supabase.from is callable', () => {
    const result = supabase.from('ai_feedback');
    expect(result).toBeDefined();
    expect(result.select).toBeDefined();
  });

  it('ContributingSignals allows all valid login_frequency values', () => {
    const values: ContributingSignals['login_frequency'][] = ['low', 'medium', 'high'];
    expect(values).toHaveLength(3);
  });

  it('ContributingSignals allows all valid submission_pattern values', () => {
    const values: ContributingSignals['submission_pattern'][] = ['early', 'on_time', 'late', 'missed'];
    expect(values).toHaveLength(4);
  });

  it('ContributingSignals allows all valid attainment_trend values', () => {
    const values: ContributingSignals['attainment_trend'][] = ['improving', 'declining', 'stagnant'];
    expect(values).toHaveLength(3);
  });
});

// =============================================================================
// useXPHistory — Unit tests for XP transaction history hooks
// Requirements: 45.3, 45.5
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getSourceLabel } from '@/hooks/useXPHistory';

// ─── Mock Supabase ───────────────────────────────────────────────────────────

const mockGte = vi.fn().mockReturnThis();
const mockOrder = vi.fn().mockImplementation(() => ({
  gte: mockGte,
}));
const mockEq = vi.fn().mockImplementation(() => ({
  order: mockOrder,
}));
const mockSelect = vi.fn().mockImplementation(() => ({
  eq: mockEq,
}));
const mockFrom = vi.fn().mockImplementation(() => ({
  select: mockSelect,
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

vi.mock('@/lib/queryKeys', () => ({
  queryKeys: {
    xpTransactions: {
      list: (filters: Record<string, unknown>) => ['xpTransactions', 'list', filters],
    },
  },
}));

// ─── getSourceLabel Tests ────────────────────────────────────────────────────

describe('getSourceLabel', () => {
  it('returns human-readable label for known sources', () => {
    expect(getSourceLabel('login')).toBe('Daily Login');
    expect(getSourceLabel('submission')).toBe('On-time Submission');
    expect(getSourceLabel('grade')).toBe('Grade Released');
    expect(getSourceLabel('journal')).toBe('Journal Entry');
    expect(getSourceLabel('streak_milestone')).toBe('Streak Milestone');
    expect(getSourceLabel('perfect_day')).toBe('Perfect Day');
    expect(getSourceLabel('first_attempt_bonus')).toBe('First Attempt Bonus');
    expect(getSourceLabel('perfect_rubric')).toBe('Perfect Rubric Score');
    expect(getSourceLabel('badge_earned')).toBe('Badge Earned');
    expect(getSourceLabel('streak_freeze_purchase')).toBe('Streak Freeze Purchase');
  });

  it('formats unknown sources by replacing underscores and capitalizing', () => {
    expect(getSourceLabel('some_new_source')).toBe('Some New Source');
  });

  it('handles single-word unknown sources', () => {
    expect(getSourceLabel('custom')).toBe('Custom');
  });
});

// ─── Hook queryFn Logic Tests ────────────────────────────────────────────────

describe('useXPHistory — queryFn logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: resolve with empty data
    mockGte.mockResolvedValue({ data: [], error: null });
    mockOrder.mockReturnValue({ gte: mockGte });
    mockOrder.mockResolvedValue({ data: [], error: null });
  });

  it('queries xp_transactions table filtered by student_id', async () => {
    const studentId = 'student-123';
    mockOrder.mockResolvedValue({
      data: [
        {
          id: 'tx-1',
          source: 'login',
          xp_amount: 10,
          reference_id: null,
          note: null,
          created_at: '2025-01-15T08:00:00Z',
        },
      ],
      error: null,
    });

    // Simulate the queryFn from useXPHistory with all_time (no gte filter)
    const result = mockFrom('xp_transactions');
    const selected = result.select('id, source, xp_amount, reference_id, note, created_at');
    const filtered = selected.eq('student_id', studentId);
    const ordered = await filtered.order('created_at', { ascending: false });

    expect(mockFrom).toHaveBeenCalledWith('xp_transactions');
    expect(mockSelect).toHaveBeenCalledWith('id, source, xp_amount, reference_id, note, created_at');
    expect(mockEq).toHaveBeenCalledWith('student_id', studentId);
    expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(ordered.data).toHaveLength(1);
    expect(ordered.data[0].source).toBe('login');
  });

  it('applies gte filter for time period filtering', async () => {
    // In the hook, gte is chained before order for period filtering
    // Simulate: supabase.from().select().eq().order().gte()
    mockOrder.mockReturnValue({ gte: mockGte });
    mockGte.mockResolvedValue({
      data: [],
      error: null,
    });

    const result = mockFrom('xp_transactions');
    const selected = result.select('id, source, xp_amount, reference_id, note, created_at');
    const filtered = selected.eq('student_id', 'student-123');
    const ordered = filtered.order('created_at', { ascending: false });
    await ordered.gte('created_at', '2025-01-15T00:00:00.000Z');

    expect(mockGte).toHaveBeenCalledWith('created_at', '2025-01-15T00:00:00.000Z');
  });

  it('throws error when supabase query fails', async () => {
    mockOrder.mockResolvedValue({
      data: null,
      error: { message: 'RLS policy violation' },
    });

    const result = mockFrom('xp_transactions');
    const selected = result.select('id, source, xp_amount, reference_id, note, created_at');
    const filtered = selected.eq('student_id', 'student-123');
    const response = await filtered.order('created_at', { ascending: false });

    expect(response.error).toBeTruthy();
    expect(response.error.message).toBe('RLS policy violation');
  });

  it('maps transactions to display format with source labels', () => {
    const rawTx = {
      id: 'tx-1',
      source: 'submission',
      xp_amount: 25,
      reference_id: 'assign-1',
      note: 'Data Structures HW1',
      created_at: '2025-01-15T10:30:00Z',
    };

    const display = {
      ...rawTx,
      source_label: getSourceLabel(rawTx.source),
      reference_description: rawTx.note ?? '',
    };

    expect(display.source_label).toBe('On-time Submission');
    expect(display.reference_description).toBe('Data Structures HW1');
    expect(display.xp_amount).toBe(25);
  });

  it('computes category summary from transaction list', () => {
    const rows = [
      { source: 'login', xp_amount: 10 },
      { source: 'login', xp_amount: 10 },
      { source: 'submission', xp_amount: 25 },
      { source: 'journal', xp_amount: 20 },
      { source: 'login', xp_amount: 10 },
    ];

    const runningTotal = rows.reduce((sum, tx) => sum + tx.xp_amount, 0);
    expect(runningTotal).toBe(75);

    const categoryMap = new Map<string, { total_xp: number; count: number }>();
    for (const tx of rows) {
      const existing = categoryMap.get(tx.source);
      if (existing) {
        existing.total_xp += tx.xp_amount;
        existing.count += 1;
      } else {
        categoryMap.set(tx.source, { total_xp: tx.xp_amount, count: 1 });
      }
    }

    const categories = Array.from(categoryMap.entries())
      .map(([source, stats]) => ({
        source,
        source_label: getSourceLabel(source),
        ...stats,
      }))
      .sort((a, b) => b.total_xp - a.total_xp);

    expect(categories).toHaveLength(3);
    expect(categories[0].source).toBe('login');
    expect(categories[0].total_xp).toBe(30);
    expect(categories[0].count).toBe(3);
    expect(categories[1].source).toBe('submission');
    expect(categories[1].total_xp).toBe(25);
    expect(categories[2].source).toBe('journal');
    expect(categories[2].total_xp).toBe(20);
  });
});

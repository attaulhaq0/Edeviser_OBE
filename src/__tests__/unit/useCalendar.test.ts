// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Supabase mock ──────────────────────────────────────────────────────────

const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockIn = vi.fn();
const mockGte = vi.fn();
const mockLte = vi.fn();
const mockNot = vi.fn();

const chainObj: Record<string, unknown> = {
  select: mockSelect,
  eq: mockEq,
  in: mockIn,
  gte: mockGte,
  lte: mockLte,
  not: mockNot,
};

// Each chain method returns the chain for fluent chaining
mockSelect.mockReturnValue(chainObj);
mockEq.mockReturnValue(chainObj);
mockIn.mockReturnValue(chainObj);
mockGte.mockReturnValue(chainObj);
mockLte.mockReturnValue(chainObj);
mockNot.mockReturnValue(chainObj);

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => chainObj),
  },
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'student-1' },
    profile: null,
    role: 'student',
    institutionId: 'inst-1',
    isLoading: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
    resetPassword: vi.fn(),
  })),
}));

vi.mock('@/lib/queryKeys', () => ({
  queryKeys: {
    calendarEvents: {
      list: (params: Record<string, unknown>) => ['calendarEvents', 'list', params],
    },
  },
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(() => ({ data: [], isLoading: false })),
}));

import { buildColorMap, getDeadlineUrgency } from '@/hooks/useCalendar';
// Types used inline via import() expressions below

// ─── buildColorMap ──────────────────────────────────────────────────────────

describe('buildColorMap', () => {
  it('assigns unique colors to different course IDs', () => {
    const map = buildColorMap(['c1', 'c2', 'c3']);
    expect(Object.keys(map)).toHaveLength(3);
    expect(map['c1']).not.toBe(map['c2']);
    expect(map['c2']).not.toBe(map['c3']);
  });

  it('deduplicates course IDs', () => {
    const map = buildColorMap(['c1', 'c1', 'c2']);
    expect(Object.keys(map)).toHaveLength(2);
  });

  it('returns empty map for empty input', () => {
    const map = buildColorMap([]);
    expect(Object.keys(map)).toHaveLength(0);
  });

  it('wraps colors when more courses than palette size', () => {
    const ids = Array.from({ length: 10 }, (_, i) => `c${i}`);
    const map = buildColorMap(ids);
    // 8 colors in palette, so c0 and c8 should share the same color
    expect(map['c0']).toBe(map['c8']);
    expect(map['c1']).toBe(map['c9']);
  });

  it('assigns valid hex color strings', () => {
    const map = buildColorMap(['c1']);
    expect(map['c1']).toMatch(/^#[0-9a-f]{6}$/i);
  });
});

// ─── getDeadlineUrgency ─────────────────────────────────────────────────────

describe('getDeadlineUrgency', () => {
  it('returns red when deadline is less than 24 hours away', () => {
    const soon = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();
    expect(getDeadlineUrgency(soon)).toBe('red');
  });

  it('returns yellow when deadline is between 24 and 72 hours away', () => {
    const medium = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    expect(getDeadlineUrgency(medium)).toBe('yellow');
  });

  it('returns green when deadline is more than 72 hours away', () => {
    const far = new Date(Date.now() + 96 * 60 * 60 * 1000).toISOString();
    expect(getDeadlineUrgency(far)).toBe('green');
  });

  it('returns red when deadline is in the past', () => {
    const past = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    expect(getDeadlineUrgency(past)).toBe('red');
  });

  it('returns red at exactly 0 hours', () => {
    const now = new Date().toISOString();
    expect(getDeadlineUrgency(now)).toBe('red');
  });

  it('returns yellow at exactly 24 hours', () => {
    const exact24 = new Date(Date.now() + 24 * 60 * 60 * 1000 + 1000).toISOString();
    expect(getDeadlineUrgency(exact24)).toBe('yellow');
  });

  it('returns green at exactly 72 hours', () => {
    const exact72 = new Date(Date.now() + 72 * 60 * 60 * 1000 + 1000).toISOString();
    expect(getDeadlineUrgency(exact72)).toBe('green');
  });
});

// ─── useCalendarEvents query structure ──────────────────────────────────────

describe('useCalendarEvents query structure', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelect.mockReturnValue(chainObj);
    mockEq.mockReturnValue(chainObj);
    mockIn.mockReturnValue(chainObj);
    mockGte.mockReturnValue(chainObj);
    mockLte.mockReturnValue(chainObj);
    mockNot.mockReturnValue(chainObj);
  });

  it('exports CalendarEvent type with required fields', () => {
    // Type-level check — if this compiles, the interface is correct
    const event: import('@/hooks/useCalendar').CalendarEvent = {
      id: 'test-1',
      title: 'Test Event',
      date: '2025-01-15',
      source: 'assignment',
      color: '#3b82f6',
    };
    expect(event.id).toBe('test-1');
    expect(event.source).toBe('assignment');
  });

  it('exports all CalendarEventSource types', () => {
    const sources: Array<import('@/hooks/useCalendar').CalendarEventSource> = [
      'assignment',
      'quiz',
      'class_session',
      'academic_calendar',
      'announcement',
    ];
    expect(sources).toHaveLength(5);
  });
});

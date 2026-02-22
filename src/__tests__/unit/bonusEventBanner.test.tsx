import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mock useBonusEvents hook
// ---------------------------------------------------------------------------
const mockUseActiveBonusEvent = vi.fn();

vi.mock('@/hooks/useBonusEvents', () => ({
  useActiveBonusEvent: () => mockUseActiveBonusEvent(),
}));

// ---------------------------------------------------------------------------
// Mock framer-motion to avoid animation complexity in tests
// ---------------------------------------------------------------------------
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, transition, ...rest } = props;
      void initial;
      void animate;
      void transition;
      return <div {...rest}>{children}</div>;
    },
  },
  useReducedMotion: () => false,
}));

import BonusEventBanner from '@/components/shared/BonusEventBanner';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('BonusEventBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders nothing when no active bonus event exists', () => {
    mockUseActiveBonusEvent.mockReturnValue({ data: null });

    const { container } = render(<BonusEventBanner />);
    expect(container.innerHTML).toBe('');
  });

  it('renders event title and multiplier when active event exists', () => {
    const futureDate = new Date(Date.now() + 3600000).toISOString(); // 1 hour from now
    mockUseActiveBonusEvent.mockReturnValue({
      data: {
        id: 'evt-1',
        title: 'Weekend Bonus',
        multiplier: 2,
        starts_at: new Date().toISOString(),
        ends_at: futureDate,
        is_active: true,
        created_by: 'admin-1',
        created_at: new Date().toISOString(),
      },
    });

    render(<BonusEventBanner />);

    expect(screen.getByText('Weekend Bonus')).toBeInTheDocument();
    expect(screen.getByText('2x XP')).toBeInTheDocument();
  });

  it('displays countdown timer in HH:MM:SS format', () => {
    // Set a known time so countdown is deterministic
    const now = new Date('2024-06-15T12:00:00Z').getTime();
    vi.setSystemTime(now);

    const endsAt = new Date('2024-06-15T14:30:45Z').toISOString(); // 2h 30m 45s from now
    mockUseActiveBonusEvent.mockReturnValue({
      data: {
        id: 'evt-2',
        title: 'Double XP',
        multiplier: 3,
        starts_at: new Date(now - 3600000).toISOString(),
        ends_at: endsAt,
        is_active: true,
        created_by: 'admin-1',
        created_at: new Date(now - 3600000).toISOString(),
      },
    });

    render(<BonusEventBanner />);

    expect(screen.getByText('02:30:45')).toBeInTheDocument();
  });

  it('shows "Ended" when the event end time has passed', () => {
    const pastDate = new Date(Date.now() - 1000).toISOString();
    mockUseActiveBonusEvent.mockReturnValue({
      data: {
        id: 'evt-3',
        title: 'Expired Event',
        multiplier: 2,
        starts_at: new Date(Date.now() - 7200000).toISOString(),
        ends_at: pastDate,
        is_active: true,
        created_by: 'admin-1',
        created_at: new Date(Date.now() - 7200000).toISOString(),
      },
    });

    render(<BonusEventBanner />);

    expect(screen.getByText('Ended')).toBeInTheDocument();
  });

  it('updates countdown every second', () => {
    const now = new Date('2024-06-15T12:00:00Z').getTime();
    vi.setSystemTime(now);

    mockUseActiveBonusEvent.mockReturnValue({
      data: {
        id: 'evt-4',
        title: 'Ticking Event',
        multiplier: 2,
        starts_at: new Date(now - 3600000).toISOString(),
        ends_at: new Date('2024-06-15T12:00:10Z').toISOString(), // 10 seconds from now
        is_active: true,
        created_by: 'admin-1',
        created_at: new Date(now - 3600000).toISOString(),
      },
    });

    render(<BonusEventBanner />);

    expect(screen.getByText('00:00:10')).toBeInTheDocument();

    // Advance 5 seconds
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.getByText('00:00:05')).toBeInTheDocument();
  });
});

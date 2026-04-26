// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import ActiveBoostIndicator from '@/components/shared/ActiveBoostIndicator';
import type { ActiveBoost } from '@/hooks/useActiveBoosts';

// ── Helpers ──────────────────────────────────────────────────────────────────

const makeBoost = (overrides: Partial<ActiveBoost> = {}): ActiveBoost => ({
  id: 'boost-001',
  boost_type: 'xp_boost',
  multiplier: 2,
  activated_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min from now
  ...overrides,
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe('ActiveBoostIndicator', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders countdown timer showing remaining minutes and seconds', () => {
    const now = new Date('2026-08-01T12:00:00Z').getTime();
    vi.setSystemTime(now);

    const boost = makeBoost({
      expires_at: new Date(now + 5 * 60 * 1000 + 30 * 1000).toISOString(), // 5:30 remaining
    });

    render(<ActiveBoostIndicator boost={boost} />);

    expect(screen.getByText('5:30')).toBeInTheDocument();
  });

  it('shows multiplier label', () => {
    const now = new Date('2026-08-01T12:00:00Z').getTime();
    vi.setSystemTime(now);

    const boost = makeBoost({
      multiplier: 2,
      expires_at: new Date(now + 10 * 60 * 1000).toISOString(),
    });

    render(<ActiveBoostIndicator boost={boost} />);

    expect(screen.getByText('2x XP')).toBeInTheDocument();
  });

  it('shows pulse animation class when active', () => {
    const now = new Date('2026-08-01T12:00:00Z').getTime();
    vi.setSystemTime(now);

    const boost = makeBoost({
      expires_at: new Date(now + 10 * 60 * 1000).toISOString(),
    });

    const { container } = render(<ActiveBoostIndicator boost={boost} />);

    const wrapper = container.firstElementChild;
    expect(wrapper?.className).toContain('animate-xp-pulse');
  });

  it('does not render when boost has expired', () => {
    const now = new Date('2026-08-01T12:00:00Z').getTime();
    vi.setSystemTime(now);

    const boost = makeBoost({
      expires_at: new Date(now - 1000).toISOString(), // expired 1 second ago
    });

    const { container } = render(<ActiveBoostIndicator boost={boost} />);

    // Component returns null when expired
    expect(container.firstElementChild).toBeNull();
  });

  it('does not render when no active boost exists (expired)', () => {
    const now = new Date('2026-08-01T12:00:00Z').getTime();
    vi.setSystemTime(now);

    const boost = makeBoost({
      expires_at: new Date(now - 60 * 60 * 1000).toISOString(), // expired 1 hour ago
    });

    const { container } = render(<ActiveBoostIndicator boost={boost} />);

    expect(container.innerHTML).toBe('');
  });

  it('updates countdown as time passes', () => {
    const now = new Date('2026-08-01T12:00:00Z').getTime();
    vi.setSystemTime(now);

    const boost = makeBoost({
      expires_at: new Date(now + 2 * 60 * 1000).toISOString(), // 2 minutes
    });

    render(<ActiveBoostIndicator boost={boost} />);

    expect(screen.getByText('2:00')).toBeInTheDocument();

    // Advance 30 seconds inside act() to flush state updates
    act(() => {
      vi.advanceTimersByTime(30 * 1000);
    });

    expect(screen.getByText('1:30')).toBeInTheDocument();
  });
});

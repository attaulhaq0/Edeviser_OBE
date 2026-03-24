// =============================================================================
// BloomsProgressionLadder — Unit tests
// Validates: Task 17.5, Bloom's Progression Pathway visualization
// =============================================================================

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock framer-motion to avoid animation complexity in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, transition, exit, ...rest } = props;
      void initial; void animate; void transition; void exit;
      const domProps: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(rest)) {
        if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
          domProps[k] = v;
        }
      }
      return <div {...domProps}>{children}</div>;
    },
  },
  useReducedMotion: () => false,
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

import { BloomsProgressionLadder } from '@/components/shared/BloomsProgressionLadder';

// ─── 6-level rendering ──────────────────────────────────────────────────────

describe('BloomsProgressionLadder — 6-level rendering', () => {
  it('renders all 6 Bloom\'s taxonomy levels', () => {
    render(<BloomsProgressionLadder highestLevel={0} />);
    expect(screen.getByText('Remembering')).toBeInTheDocument();
    expect(screen.getByText('Understanding')).toBeInTheDocument();
    expect(screen.getByText('Applying')).toBeInTheDocument();
    expect(screen.getByText('Analyzing')).toBeInTheDocument();
    expect(screen.getByText('Evaluating')).toBeInTheDocument();
    expect(screen.getByText('Creating')).toBeInTheDocument();
  });

  it('renders level numbers 1 through 6', () => {
    render(<BloomsProgressionLadder highestLevel={3} />);
    for (let i = 1; i <= 6; i++) {
      expect(screen.getByText(String(i))).toBeInTheDocument();
    }
  });

  it('renders Creating at top and Remembering at bottom', () => {
    const { container } = render(<BloomsProgressionLadder highestLevel={0} />);
    const levels = container.querySelectorAll('[class*="rounded-md"]');
    expect(levels.length).toBe(6);
    // First rendered = Creating (top), last = Remembering (bottom)
    expect(levels[0]?.textContent).toContain('Creating');
    expect(levels[5]?.textContent).toContain('Remembering');
  });
});

// ─── Bloom's color coding ───────────────────────────────────────────────────

describe('BloomsProgressionLadder — Color coding', () => {
  it('applies active color for reached levels', () => {
    const { container } = render(<BloomsProgressionLadder highestLevel={3} />);
    const levels = container.querySelectorAll('[class*="rounded-md"]');
    // Levels 1-3 are reached (Remembering, Understanding, Applying)
    // Remembering (index 5) = purple-500
    expect(levels[5]?.className).toContain('bg-purple-500');
    // Understanding (index 4) = blue-500
    expect(levels[4]?.className).toContain('bg-blue-500');
    // Applying (index 3) = green-500
    expect(levels[3]?.className).toContain('bg-green-500');
  });

  it('applies dimmed color for unreached levels', () => {
    const { container } = render(<BloomsProgressionLadder highestLevel={2} />);
    const levels = container.querySelectorAll('[class*="rounded-md"]');
    // Creating (index 0) should be dimmed
    expect(levels[0]?.className).toContain('bg-red-100');
    // Evaluating (index 1) should be dimmed
    expect(levels[1]?.className).toContain('bg-orange-100');
    // Analyzing (index 2) should be dimmed
    expect(levels[2]?.className).toContain('bg-yellow-100');
    // Applying (index 3) should be dimmed
    expect(levels[3]?.className).toContain('bg-green-100');
  });

  it('all levels dimmed when highestLevel is 0', () => {
    const { container } = render(<BloomsProgressionLadder highestLevel={0} />);
    const levels = container.querySelectorAll('[class*="rounded-md"]');
    for (const level of levels) {
      // All should have the dimmed -100 variant
      expect(level.className).toMatch(/bg-\w+-100/);
    }
  });

  it('all levels active when highestLevel is 6', () => {
    const { container } = render(<BloomsProgressionLadder highestLevel={6} />);
    const levels = container.querySelectorAll('[class*="rounded-md"]');
    // None should have the dimmed -100 variant only
    expect(levels[0]?.className).toContain('bg-red-500');
    expect(levels[5]?.className).toContain('bg-purple-500');
  });
});

// ─── Highlighted highest level ──────────────────────────────────────────────

describe('BloomsProgressionLadder — Highlighted level', () => {
  it('highlights the highest reached level with ring', () => {
    const { container } = render(<BloomsProgressionLadder highestLevel={4} />);
    const levels = container.querySelectorAll('[class*="rounded-md"]');
    // Analyzing is level 4, index 2
    expect(levels[2]?.className).toContain('ring-2');
  });

  it('shows star indicator on highest level', () => {
    render(<BloomsProgressionLadder highestLevel={3} />);
    expect(screen.getByText('★')).toBeInTheDocument();
  });

  it('does not show star when highestLevel is 0', () => {
    render(<BloomsProgressionLadder highestLevel={0} />);
    expect(screen.queryByText('★')).not.toBeInTheDocument();
  });

  it('does not highlight any level with ring when highestLevel is 0', () => {
    const { container } = render(<BloomsProgressionLadder highestLevel={0} />);
    const levels = container.querySelectorAll('[class*="ring-2"]');
    expect(levels.length).toBe(0);
  });
});

// ─── CLO title ──────────────────────────────────────────────────────────────

describe('BloomsProgressionLadder — CLO title', () => {
  it('renders CLO title when provided', () => {
    render(<BloomsProgressionLadder highestLevel={2} cloTitle="Apply OOP principles" />);
    expect(screen.getByText('Apply OOP principles')).toBeInTheDocument();
  });

  it('does not render title element when cloTitle is not provided', () => {
    const { container } = render(<BloomsProgressionLadder highestLevel={2} />);
    // Only the level labels should be present, no extra text element
    const paragraphs = container.querySelectorAll('p');
    expect(paragraphs.length).toBe(0);
  });
});

// ─── Compact mode ───────────────────────────────────────────────────────────

describe('BloomsProgressionLadder — Compact mode', () => {
  it('applies compact styling when compact is true', () => {
    const { container } = render(<BloomsProgressionLadder highestLevel={3} compact />);
    const levels = container.querySelectorAll('[class*="rounded-md"]');
    // Compact uses smaller padding/text
    expect(levels[0]?.className).toContain('px-2');
    expect(levels[0]?.className).toContain('py-0.5');
  });

  it('applies normal styling when compact is false', () => {
    const { container } = render(<BloomsProgressionLadder highestLevel={3} />);
    const levels = container.querySelectorAll('[class*="rounded-md"]');
    expect(levels[0]?.className).toContain('px-3');
    expect(levels[0]?.className).toContain('py-1.5');
  });
});

// ─── Accessibility ──────────────────────────────────────────────────────────

describe('BloomsProgressionLadder — Accessibility', () => {
  it('has role="img" with descriptive aria-label', () => {
    render(<BloomsProgressionLadder highestLevel={3} cloTitle="Design patterns" />);
    const ladder = screen.getByRole('img');
    expect(ladder).toHaveAttribute(
      'aria-label',
      expect.stringContaining('Applying'),
    );
    expect(ladder).toHaveAttribute(
      'aria-label',
      expect.stringContaining('Design patterns'),
    );
  });

  it('aria-label says None when highestLevel is 0', () => {
    render(<BloomsProgressionLadder highestLevel={0} />);
    const ladder = screen.getByRole('img');
    expect(ladder).toHaveAttribute(
      'aria-label',
      expect.stringContaining('None'),
    );
  });
});

// ─── Edge cases ─────────────────────────────────────────────────────────────

describe('BloomsProgressionLadder — Edge cases', () => {
  it('clamps highestLevel above 6 to 6', () => {
    const { container } = render(<BloomsProgressionLadder highestLevel={10} />);
    const levels = container.querySelectorAll('[class*="rounded-md"]');
    // All should be active
    expect(levels[0]?.className).toContain('bg-red-500');
    // Level 6 (Creating) should have ring
    expect(levels[0]?.className).toContain('ring-2');
  });

  it('clamps negative highestLevel to 0', () => {
    const { container } = render(<BloomsProgressionLadder highestLevel={-1} />);
    const levels = container.querySelectorAll('[class*="rounded-md"]');
    for (const level of levels) {
      expect(level.className).toMatch(/bg-\w+-100/);
    }
  });
});

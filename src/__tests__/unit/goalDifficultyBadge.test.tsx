// @vitest-environment happy-dom
// =============================================================================
// GoalDifficultyBadge — Unit tests
// Badge rendering for Easy (green), Moderate (amber), Ambitious (red)
// =============================================================================

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import GoalDifficultyBadge from '@/components/shared/GoalDifficultyBadge';
import type { GoalDifficulty } from '@/lib/goalTemplates';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const renderBadge = (difficulty: GoalDifficulty, className?: string) =>
  render(<GoalDifficultyBadge difficulty={difficulty} className={className} />);

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('GoalDifficultyBadge', () => {
  // ── Label rendering ────────────────────────────────────────────────────

  describe('label rendering', () => {
    it('renders "Easy" label for easy difficulty', () => {
      renderBadge('easy');
      expect(screen.getByText('Easy')).toBeInTheDocument();
    });

    it('renders "Moderate" label for moderate difficulty', () => {
      renderBadge('moderate');
      expect(screen.getByText('Moderate')).toBeInTheDocument();
    });

    it('renders "Ambitious" label for ambitious difficulty', () => {
      renderBadge('ambitious');
      expect(screen.getByText('Ambitious')).toBeInTheDocument();
    });
  });

  // ── Color classes ──────────────────────────────────────────────────────

  describe('difficulty color classes', () => {
    it('applies green classes for easy difficulty', () => {
      renderBadge('easy');
      const badge = screen.getByText('Easy');
      expect(badge.className).toContain('bg-green-100');
      expect(badge.className).toContain('text-green-700');
      expect(badge.className).toContain('border-green-200');
    });

    it('applies amber classes for moderate difficulty', () => {
      renderBadge('moderate');
      const badge = screen.getByText('Moderate');
      expect(badge.className).toContain('bg-amber-100');
      expect(badge.className).toContain('text-amber-700');
      expect(badge.className).toContain('border-amber-200');
    });

    it('applies red classes for ambitious difficulty', () => {
      renderBadge('ambitious');
      const badge = screen.getByText('Ambitious');
      expect(badge.className).toContain('bg-red-100');
      expect(badge.className).toContain('text-red-700');
      expect(badge.className).toContain('border-red-200');
    });
  });

  // ── Custom className ───────────────────────────────────────────────────

  describe('custom className', () => {
    it('applies custom className when provided', () => {
      renderBadge('easy', 'my-custom-class');
      const badge = screen.getByText('Easy');
      expect(badge.className).toContain('my-custom-class');
    });
  });

  // ── Base classes ───────────────────────────────────────────────────────

  describe('base classes', () => {
    it.each<GoalDifficulty>(['easy', 'moderate', 'ambitious'])(
      'includes base typography classes for %s difficulty',
      (difficulty) => {
        renderBadge(difficulty);
        const badge = screen.getByText(
          difficulty === 'easy' ? 'Easy' : difficulty === 'moderate' ? 'Moderate' : 'Ambitious',
        );
        expect(badge.className).toContain('font-bold');
        expect(badge.className).toContain('tracking-wide');
        expect(badge.className).toContain('uppercase');
      },
    );
  });

  // ── Outline variant ────────────────────────────────────────────────────

  describe('outline variant', () => {
    it('uses outline variant on the Badge', () => {
      renderBadge('moderate');
      const badge = screen.getByText('Moderate');
      expect(badge.getAttribute('data-variant')).toBe('outline');
    });
  });
});

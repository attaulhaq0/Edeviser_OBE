// =============================================================================
// QuestionQualityIndicator — Unit tests
// Validates: Requirement 11 (Per-Question Analytics Dashboard), Task 7.3
// =============================================================================

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import QuestionQualityIndicator from '@/components/shared/QuestionQualityIndicator';

// ─── Quality flag rendering ──────────────────────────────────────────────────

describe('QuestionQualityIndicator — Quality flags', () => {
  it('renders green dot and "Good" label for good flag', () => {
    const { container } = render(<QuestionQualityIndicator qualityFlag="good" />);
    expect(screen.getByText('Good')).toBeInTheDocument();
    const dot = container.querySelector('[class*="bg-green-500"]');
    expect(dot).not.toBeNull();
    expect(screen.getByText('Good').className).toContain('text-green');
  });

  it('renders yellow dot and "Low Discrimination" label for low_discrimination flag', () => {
    const { container } = render(<QuestionQualityIndicator qualityFlag="low_discrimination" />);
    expect(screen.getByText('Low Discrimination')).toBeInTheDocument();
    const dot = container.querySelector('[class*="bg-yellow-500"]');
    expect(dot).not.toBeNull();
    expect(screen.getByText('Low Discrimination').className).toContain('text-yellow');
  });

  it('renders yellow dot and "Too Easy" label for too_easy flag', () => {
    const { container } = render(<QuestionQualityIndicator qualityFlag="too_easy" />);
    expect(screen.getByText('Too Easy')).toBeInTheDocument();
    const dot = container.querySelector('[class*="bg-yellow-500"]');
    expect(dot).not.toBeNull();
    expect(screen.getByText('Too Easy').className).toContain('text-yellow');
  });

  it('renders red dot and "Too Hard" label for too_hard flag', () => {
    const { container } = render(<QuestionQualityIndicator qualityFlag="too_hard" />);
    expect(screen.getByText('Too Hard')).toBeInTheDocument();
    const dot = container.querySelector('[class*="bg-red-500"]');
    expect(dot).not.toBeNull();
    expect(screen.getByText('Too Hard').className).toContain('text-red');
  });

  it('renders green dot and "Good" label for null flag (default)', () => {
    const { container } = render(<QuestionQualityIndicator qualityFlag={null} />);
    expect(screen.getByText('Good')).toBeInTheDocument();
    const dot = container.querySelector('[class*="bg-green-500"]');
    expect(dot).not.toBeNull();
  });
});

// ─── className prop ──────────────────────────────────────────────────────────

describe('QuestionQualityIndicator — className prop', () => {
  it('applies custom className to the wrapper', () => {
    const { container } = render(
      <QuestionQualityIndicator qualityFlag="good" className="my-indicator-class" />,
    );
    const wrapper = container.firstElementChild;
    expect(wrapper?.className).toContain('my-indicator-class');
  });
});

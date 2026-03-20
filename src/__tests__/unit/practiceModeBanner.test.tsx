// =============================================================================
// PracticeModeBanner — Unit tests
// Validates: Task 19.7 — Banner visibility, correct styling, text content
// =============================================================================

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PracticeModeBanner } from '@/components/shared/PracticeModeBanner';

// ── Banner text content ─────────────────────────────────────────────────────

describe('PracticeModeBanner — Text content', () => {
  it('renders the correct banner text', () => {
    render(<PracticeModeBanner />);
    expect(
      screen.getByText('Practice Mode — This attempt will not affect your grades'),
    ).toBeInTheDocument();
  });

  it('contains "Practice Mode" in the text', () => {
    render(<PracticeModeBanner />);
    expect(screen.getByText(/Practice Mode/)).toBeInTheDocument();
  });

  it('contains grade impact disclaimer', () => {
    render(<PracticeModeBanner />);
    expect(
      screen.getByText(/will not affect your grades/),
    ).toBeInTheDocument();
  });
});

// ── Banner styling ──────────────────────────────────────────────────────────

describe('PracticeModeBanner — Styling', () => {
  it('has bg-blue-50 background', () => {
    const { container } = render(<PracticeModeBanner />);
    const banner = container.firstElementChild;
    expect(banner?.className).toContain('bg-blue-50');
  });

  it('has text-blue-700 text color', () => {
    const { container } = render(<PracticeModeBanner />);
    const banner = container.firstElementChild;
    expect(banner?.className).toContain('text-blue-700');
  });

  it('has border-blue-200 border', () => {
    const { container } = render(<PracticeModeBanner />);
    const banner = container.firstElementChild;
    expect(banner?.className).toContain('border-blue-200');
  });

  it('has rounded-lg border radius', () => {
    const { container } = render(<PracticeModeBanner />);
    const banner = container.firstElementChild;
    expect(banner?.className).toContain('rounded-lg');
  });

  it('applies custom className when provided', () => {
    const { container } = render(<PracticeModeBanner className="mt-4" />);
    const banner = container.firstElementChild;
    expect(banner?.className).toContain('mt-4');
  });
});

// ── Banner rendering ────────────────────────────────────────────────────────

describe('PracticeModeBanner — Rendering', () => {
  it('renders as a div element', () => {
    const { container } = render(<PracticeModeBanner />);
    expect(container.firstElementChild?.tagName).toBe('DIV');
  });

  it('has role="status" for accessibility', () => {
    render(<PracticeModeBanner />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('has aria-label for accessibility', () => {
    render(<PracticeModeBanner />);
    const banner = screen.getByRole('status');
    expect(banner).toHaveAttribute('aria-label', 'Practice Mode');
  });

  it('renders an info icon', () => {
    const { container } = render(<PracticeModeBanner />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });
});

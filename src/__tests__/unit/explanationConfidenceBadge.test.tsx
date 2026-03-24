// =============================================================================
// ExplanationConfidenceBadge — Unit tests
// Validates: Task 19.6 — Green/amber/blue badge rendering based on confidence
// =============================================================================

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ExplanationConfidenceBadge } from '@/components/shared/ExplanationConfidenceBadge';

// ── Green badge (confidence >= 0.8, not verified) ───────────────────────────

describe('ExplanationConfidenceBadge — Green badge (high confidence)', () => {
  it('renders green badge when confidence is exactly 0.8', () => {
    const { container } = render(
      <ExplanationConfidenceBadge confidence={0.8} isVerified={false} />,
    );
    const badge = container.querySelector('[class*="bg-green-100"]');
    expect(badge).toBeInTheDocument();
  });

  it('renders green badge when confidence is above 0.8', () => {
    const { container } = render(
      <ExplanationConfidenceBadge confidence={0.95} isVerified={false} />,
    );
    const badge = container.querySelector('[class*="bg-green-100"]');
    expect(badge).toBeInTheDocument();
  });

  it('shows "Verified by course materials" text for high confidence', () => {
    render(<ExplanationConfidenceBadge confidence={0.85} isVerified={false} />);
    expect(screen.getByText('Verified by course materials')).toBeInTheDocument();
  });

  it('shows confidence percentage in title for high confidence', () => {
    const { container } = render(
      <ExplanationConfidenceBadge confidence={0.85} isVerified={false} />,
    );
    const badge = container.querySelector('[title="Confidence: 85%"]');
    expect(badge).toBeInTheDocument();
  });
});

// ── Amber badge (confidence < 0.8, not verified) ────────────────────────────

describe('ExplanationConfidenceBadge — Amber badge (low confidence)', () => {
  it('renders amber badge when confidence is below 0.8', () => {
    const { container } = render(
      <ExplanationConfidenceBadge confidence={0.5} isVerified={false} />,
    );
    const badge = container.querySelector('[class*="bg-amber-100"]');
    expect(badge).toBeInTheDocument();
  });

  it('renders amber badge when confidence is 0.79', () => {
    const { container } = render(
      <ExplanationConfidenceBadge confidence={0.79} isVerified={false} />,
    );
    const badge = container.querySelector('[class*="bg-amber-100"]');
    expect(badge).toBeInTheDocument();
  });

  it('shows verification warning text for low confidence', () => {
    render(<ExplanationConfidenceBadge confidence={0.3} isVerified={false} />);
    expect(
      screen.getByText('This explanation may need teacher verification'),
    ).toBeInTheDocument();
  });

  it('shows confidence percentage in title for low confidence', () => {
    const { container } = render(
      <ExplanationConfidenceBadge confidence={0.45} isVerified={false} />,
    );
    const badge = container.querySelector('[title="Confidence: 45%"]');
    expect(badge).toBeInTheDocument();
  });
});

// ── Blue badge (teacher verified) ───────────────────────────────────────────

describe('ExplanationConfidenceBadge — Blue badge (teacher verified)', () => {
  it('renders blue badge when isVerified is true', () => {
    const { container } = render(
      <ExplanationConfidenceBadge confidence={0.5} isVerified={true} />,
    );
    const badge = container.querySelector('[class*="bg-blue-100"]');
    expect(badge).toBeInTheDocument();
  });

  it('shows "Teacher verified" text', () => {
    render(<ExplanationConfidenceBadge confidence={0.9} isVerified={true} />);
    expect(screen.getByText('Teacher verified')).toBeInTheDocument();
  });

  it('blue badge takes priority over green even with high confidence', () => {
    render(<ExplanationConfidenceBadge confidence={0.95} isVerified={true} />);
    expect(screen.getByText('Teacher verified')).toBeInTheDocument();
    expect(screen.queryByText('Verified by course materials')).not.toBeInTheDocument();
  });

  it('blue badge takes priority over amber even with low confidence', () => {
    render(<ExplanationConfidenceBadge confidence={0.3} isVerified={true} />);
    expect(screen.getByText('Teacher verified')).toBeInTheDocument();
    expect(
      screen.queryByText('This explanation may need teacher verification'),
    ).not.toBeInTheDocument();
  });

  it('shows confidence in title when verified and confidence is provided', () => {
    const { container } = render(
      <ExplanationConfidenceBadge confidence={0.75} isVerified={true} />,
    );
    const badge = container.querySelector('[title="Confidence: 75%"]');
    expect(badge).toBeInTheDocument();
  });

  it('does not show title when verified but confidence is null', () => {
    const { container } = render(
      <ExplanationConfidenceBadge confidence={null} isVerified={true} />,
    );
    const badge = container.querySelector('[title]');
    // The badge should exist but without a title attribute (or title is undefined)
    expect(screen.getByText('Teacher verified')).toBeInTheDocument();
    // No title attribute when confidence is null
    const badgeEl = screen.getByText('Teacher verified').closest('[class*="bg-blue-100"]');
    expect(badgeEl?.getAttribute('title')).toBeNull();
  });
});

// ── Null confidence ─────────────────────────────────────────────────────────

describe('ExplanationConfidenceBadge — Null confidence', () => {
  it('renders nothing when confidence is null and not verified', () => {
    const { container } = render(
      <ExplanationConfidenceBadge confidence={null} isVerified={false} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('still renders blue badge when confidence is null but verified', () => {
    render(<ExplanationConfidenceBadge confidence={null} isVerified={true} />);
    expect(screen.getByText('Teacher verified')).toBeInTheDocument();
  });
});

// ── Tooltip confidence score ────────────────────────────────────────────────

describe('ExplanationConfidenceBadge — Tooltip confidence score', () => {
  it('formats confidence as integer percentage', () => {
    const { container } = render(
      <ExplanationConfidenceBadge confidence={0.876} isVerified={false} />,
    );
    const badge = container.querySelector('[title="Confidence: 88%"]');
    expect(badge).toBeInTheDocument();
  });

  it('shows 100% for confidence of 1.0', () => {
    const { container } = render(
      <ExplanationConfidenceBadge confidence={1.0} isVerified={false} />,
    );
    const badge = container.querySelector('[title="Confidence: 100%"]');
    expect(badge).toBeInTheDocument();
  });

  it('shows 0% for confidence of 0', () => {
    const { container } = render(
      <ExplanationConfidenceBadge confidence={0} isVerified={false} />,
    );
    const badge = container.querySelector('[title="Confidence: 0%"]');
    expect(badge).toBeInTheDocument();
  });
});

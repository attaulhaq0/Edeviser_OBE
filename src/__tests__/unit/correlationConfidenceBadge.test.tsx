import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import CorrelationConfidenceBadge from '@/components/shared/CorrelationConfidenceBadge';
import CorrelationDisclaimer from '@/components/shared/CorrelationDisclaimer';
import { getCorrelationConfidenceLevel } from '@/lib/correlationConfidence';
import type { CorrelationConfidenceLevel } from '@/types/habits';

// ─── getCorrelationConfidenceLevel pure function ────────────────────────────

describe('getCorrelationConfidenceLevel', () => {
  it('returns null for count below 30', () => {
    expect(getCorrelationConfidenceLevel(0)).toBeNull();
    expect(getCorrelationConfidenceLevel(15)).toBeNull();
    expect(getCorrelationConfidenceLevel(29)).toBeNull();
  });

  it('returns early_pattern for 30-59', () => {
    expect(getCorrelationConfidenceLevel(30)).toBe('early_pattern');
    expect(getCorrelationConfidenceLevel(45)).toBe('early_pattern');
    expect(getCorrelationConfidenceLevel(59)).toBe('early_pattern');
  });

  it('returns emerging_trend for 60-89', () => {
    expect(getCorrelationConfidenceLevel(60)).toBe('emerging_trend');
    expect(getCorrelationConfidenceLevel(75)).toBe('emerging_trend');
    expect(getCorrelationConfidenceLevel(89)).toBe('emerging_trend');
  });

  it('returns strong_pattern for 90+', () => {
    expect(getCorrelationConfidenceLevel(90)).toBe('strong_pattern');
    expect(getCorrelationConfidenceLevel(120)).toBe('strong_pattern');
    expect(getCorrelationConfidenceLevel(365)).toBe('strong_pattern');
  });
});

// ─── CorrelationConfidenceBadge component ───────────────────────────────────

describe('CorrelationConfidenceBadge', () => {
  const levels: Array<{
    level: CorrelationConfidenceLevel;
    label: string;
    colorClass: string;
  }> = [
    { level: 'early_pattern', label: 'Early Pattern', colorClass: 'bg-amber-50' },
    { level: 'emerging_trend', label: 'Emerging Trend', colorClass: 'bg-blue-50' },
    { level: 'strong_pattern', label: 'Strong Pattern', colorClass: 'bg-green-50' },
  ];

  levels.forEach(({ level, label, colorClass }) => {
    it(`renders "${label}" badge for ${level}`, () => {
      render(<CorrelationConfidenceBadge level={level} dataPointCount={45} />);
      expect(screen.getByText(`${label} (45 days)`)).toBeInTheDocument();
    });

    it(`has correct test id for ${level}`, () => {
      render(<CorrelationConfidenceBadge level={level} dataPointCount={60} />);
      expect(screen.getByTestId(`confidence-badge-${level}`)).toBeInTheDocument();
    });

    it(`applies ${colorClass} styling for ${level}`, () => {
      const { container } = render(
        <CorrelationConfidenceBadge level={level} dataPointCount={50} />,
      );
      const badge = container.querySelector(`.${colorClass}`);
      expect(badge).toBeInTheDocument();
    });
  });

  it('displays the correct day count', () => {
    render(<CorrelationConfidenceBadge level="strong_pattern" dataPointCount={120} />);
    expect(screen.getByText('Strong Pattern (120 days)')).toBeInTheDocument();
  });
});

// ─── CorrelationDisclaimer component ────────────────────────────────────────

describe('CorrelationDisclaimer', () => {
  it('renders the disclaimer text', () => {
    render(<CorrelationDisclaimer />);
    expect(
      screen.getByText(/These insights show patterns in your data, not cause-and-effect relationships/),
    ).toBeInTheDocument();
  });

  it('renders with correct test id', () => {
    render(<CorrelationDisclaimer />);
    expect(screen.getByTestId('correlation-disclaimer')).toBeInTheDocument();
  });

  it('mentions academic performance', () => {
    render(<CorrelationDisclaimer />);
    expect(
      screen.getByText(/Many factors influence academic performance/),
    ).toBeInTheDocument();
  });
});

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import QualityFeedbackBanner from '@/components/shared/QualityFeedbackBanner';

describe('QualityFeedbackBanner', () => {
  it('renders thoughtful category', () => {
    render(
      <QualityFeedbackBanner
        qualityCategory="thoughtful"
        suggestions={['Great reflection!']}
      />,
    );
    expect(screen.getByText('Thoughtful reflection')).toBeInTheDocument();
    expect(screen.getByText('• Great reflection!')).toBeInTheDocument();
  });

  it('renders good_effort category', () => {
    render(
      <QualityFeedbackBanner
        qualityCategory="good_effort"
        suggestions={['Try connecting to CLOs.']}
      />,
    );
    expect(screen.getByText('Good effort')).toBeInTheDocument();
  });

  it('renders needs_detail category', () => {
    render(
      <QualityFeedbackBanner
        qualityCategory="needs_detail"
        suggestions={['Go deeper.', 'Add more detail.']}
      />,
    );
    expect(screen.getByText('Try adding more detail')).toBeInTheDocument();
    expect(screen.getByText('• Go deeper.')).toBeInTheDocument();
    expect(screen.getByText('• Add more detail.')).toBeInTheDocument();
  });

  it('renders with empty suggestions', () => {
    render(
      <QualityFeedbackBanner qualityCategory="thoughtful" suggestions={[]} />,
    );
    expect(screen.getByTestId('quality-feedback-banner')).toBeInTheDocument();
  });
});

// @vitest-environment happy-dom
// =============================================================================
// ProfileSummaryCard — Unit tests
// Radar chart rendering, VARK "Self-Awareness" section with disclaimer,
// null state handling, retake link
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ─── Mock recharts to avoid canvas issues in happy-dom ───────────────────────

vi.mock('recharts', () => {
  const React = require('react');
  return {
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) =>
      React.createElement('div', { 'data-testid': 'responsive-container' }, children),
    RadarChart: ({ children, data }: { children: React.ReactNode; data: unknown[] }) =>
      React.createElement('div', { 'data-testid': 'radar-chart', 'data-points': data.length }, children),
    Radar: ({ dataKey, name }: { dataKey: string; name: string }) =>
      React.createElement('div', { 'data-testid': 'radar', 'data-key': dataKey, 'data-name': name }),
    PolarGrid: () => React.createElement('div', { 'data-testid': 'polar-grid' }),
    PolarAngleAxis: ({ dataKey }: { dataKey: string }) =>
      React.createElement('div', { 'data-testid': 'polar-angle-axis', 'data-key': dataKey }),
    PolarRadiusAxis: () => React.createElement('div', { 'data-testid': 'polar-radius-axis' }),
  };
});

import ProfileSummaryCard, {
  type ProfileSummaryCardProps,
} from '@/components/shared/ProfileSummaryCard';
import type { BigFiveTraits, VARKProfile, SelfEfficacyProfile, StudyStrategyProfile } from '@/lib/scoreCalculator';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const sampleTraits: BigFiveTraits = {
  openness: 72,
  conscientiousness: 85,
  extraversion: 60,
  agreeableness: 90,
  neuroticism: 45,
};

const sampleVARK: VARKProfile = {
  visual: 44,
  auditory: 25,
  read_write: 19,
  kinesthetic: 12,
  dominant_style: 'visual',
};

const sampleSelfEfficacy: SelfEfficacyProfile = {
  overall: 70,
  general_academic: 75,
  course_specific: 65,
  self_regulated_learning: 70,
};

const sampleStudyStrategies: StudyStrategyProfile = {
  time_management: 80,
  elaboration: 65,
  self_testing: 70,
  help_seeking: 55,
};

const fullProps: ProfileSummaryCardProps = {
  personalityTraits: sampleTraits,
  learningStyle: sampleVARK,
  selfEfficacy: sampleSelfEfficacy,
  studyStrategies: sampleStudyStrategies,
  onRetake: vi.fn(),
};

const renderCard = (overrides: Partial<ProfileSummaryCardProps> = {}) =>
  render(<ProfileSummaryCard {...fullProps} {...overrides} />);

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('ProfileSummaryCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Radar chart rendering ────────────────────────────────────────────────

  describe('radar chart rendering', () => {
    it('renders the radar chart when personalityTraits is provided', () => {
      renderCard();
      expect(screen.getByTestId('radar-chart')).toBeDefined();
      expect(screen.getByTestId('radar')).toBeDefined();
      expect(screen.getByTestId('polar-grid')).toBeDefined();
    });

    it('passes 5 data points to the radar chart (one per Big Five trait)', () => {
      renderCard();
      const chart = screen.getByTestId('radar-chart');
      expect(chart.getAttribute('data-points')).toBe('5');
    });

    it('renders the "Personality Traits" heading', () => {
      renderCard();
      expect(screen.getByText('Personality Traits')).toBeDefined();
    });

    it('does not render radar chart when personalityTraits is null', () => {
      renderCard({ personalityTraits: null });
      expect(screen.queryByTestId('radar-chart')).toBeNull();
      expect(screen.queryByText('Personality Traits')).toBeNull();
    });
  });

  // ── VARK "Self-Awareness" section ────────────────────────────────────────

  describe('VARK Self-Awareness section', () => {
    it('renders the "Self-Awareness" heading', () => {
      renderCard();
      expect(screen.getByText('Self-Awareness')).toBeDefined();
    });

    it('displays the "For reflection only" badge', () => {
      renderCard();
      expect(screen.getByText('For reflection only')).toBeDefined();
    });

    it('shows the dominant learning style label', () => {
      renderCard();
      expect(screen.getByText('Visual Learner')).toBeDefined();
    });

    it('shows the learning style description', () => {
      renderCard();
      expect(
        screen.getByText('You learn best through diagrams, charts, and spatial understanding'),
      ).toBeDefined();
    });

    it('displays the research disclaimer text', () => {
      renderCard();
      expect(
        screen.getByText(
          /Learning style preferences are provided as a self-awareness exercise/,
        ),
      ).toBeDefined();
    });

    it('disclaimer mentions content adaptation exclusion', () => {
      renderCard();
      expect(
        screen.getByText(/not used for content adaptation/),
      ).toBeDefined();
    });

    it('does not render VARK section when learningStyle is null', () => {
      renderCard({ learningStyle: null });
      expect(screen.queryByText('Self-Awareness')).toBeNull();
      expect(screen.queryByText('For reflection only')).toBeNull();
    });

    it('renders correct style for auditory dominant', () => {
      const auditoryVARK: VARKProfile = {
        ...sampleVARK,
        dominant_style: 'auditory',
      };
      renderCard({ learningStyle: auditoryVARK });
      expect(screen.getByText('Auditory Learner')).toBeDefined();
    });

    it('renders correct style for kinesthetic dominant', () => {
      const kinestheticVARK: VARKProfile = {
        ...sampleVARK,
        dominant_style: 'kinesthetic',
      };
      renderCard({ learningStyle: kinestheticVARK });
      expect(screen.getByText('Kinesthetic Learner')).toBeDefined();
    });

    it('renders correct style for read_write dominant', () => {
      const rwVARK: VARKProfile = {
        ...sampleVARK,
        dominant_style: 'read_write',
      };
      renderCard({ learningStyle: rwVARK });
      expect(screen.getByText('Read/Write Learner')).toBeDefined();
    });

    it('renders correct style for multimodal dominant', () => {
      const multiVARK: VARKProfile = {
        ...sampleVARK,
        dominant_style: 'multimodal',
      };
      renderCard({ learningStyle: multiVARK });
      expect(screen.getByText('Multimodal Learner')).toBeDefined();
    });
  });

  // ── Self-Efficacy section ────────────────────────────────────────────────

  describe('self-efficacy section', () => {
    it('renders the "Self-Efficacy" heading', () => {
      renderCard();
      expect(screen.getByText('Self-Efficacy')).toBeDefined();
    });

    it('displays all three self-efficacy domains', () => {
      renderCard();
      expect(screen.getByText('General Academic')).toBeDefined();
      expect(screen.getByText('Course-Specific')).toBeDefined();
      expect(screen.getByText('Self-Regulated Learning')).toBeDefined();
    });

    it('does not render self-efficacy section when null', () => {
      renderCard({ selfEfficacy: null });
      expect(screen.queryByText('Self-Efficacy')).toBeNull();
    });
  });

  // ── Study Strategies section ─────────────────────────────────────────────

  describe('study strategies section', () => {
    it('renders the "Study Strategies" heading', () => {
      renderCard();
      expect(screen.getByText('Study Strategies')).toBeDefined();
    });

    it('displays all four study strategy dimensions', () => {
      renderCard();
      expect(screen.getByText('Time Management')).toBeDefined();
      expect(screen.getByText('Elaboration')).toBeDefined();
      expect(screen.getByText('Self-Testing')).toBeDefined();
      expect(screen.getByText('Help Seeking')).toBeDefined();
    });

    it('does not render study strategies section when null', () => {
      renderCard({ studyStrategies: null });
      expect(screen.queryByText('Study Strategies')).toBeNull();
    });
  });

  // ── Null state handling ──────────────────────────────────────────────────

  describe('null state handling', () => {
    it('renders the card header even when all data is null', () => {
      renderCard({
        personalityTraits: null,
        learningStyle: null,
        selfEfficacy: null,
        studyStrategies: null,
        onRetake: undefined,
      });
      expect(screen.getByText('My Profile')).toBeDefined();
    });

    it('renders no data sections when all props are null', () => {
      renderCard({
        personalityTraits: null,
        learningStyle: null,
        selfEfficacy: null,
        studyStrategies: null,
      });
      expect(screen.queryByText('Personality Traits')).toBeNull();
      expect(screen.queryByText('Self-Awareness')).toBeNull();
      expect(screen.queryByText('Self-Efficacy')).toBeNull();
      expect(screen.queryByText('Study Strategies')).toBeNull();
    });

    it('renders only the sections with non-null data', () => {
      renderCard({
        personalityTraits: sampleTraits,
        learningStyle: null,
        selfEfficacy: null,
        studyStrategies: null,
      });
      expect(screen.getByText('Personality Traits')).toBeDefined();
      expect(screen.queryByText('Self-Awareness')).toBeNull();
      expect(screen.queryByText('Self-Efficacy')).toBeNull();
      expect(screen.queryByText('Study Strategies')).toBeNull();
    });
  });

  // ── Retake link ──────────────────────────────────────────────────────────

  describe('retake link', () => {
    it('renders the "Retake Assessment" button when onRetake is provided', () => {
      renderCard({ onRetake: vi.fn() });
      expect(screen.getByText('Retake Assessment')).toBeDefined();
    });

    it('calls onRetake when the retake button is clicked', async () => {
      const onRetake = vi.fn();
      renderCard({ onRetake });
      const user = userEvent.setup();

      await user.click(screen.getByText('Retake Assessment'));
      expect(onRetake).toHaveBeenCalledOnce();
    });

    it('does not render retake button when onRetake is undefined', () => {
      renderCard({ onRetake: undefined });
      expect(screen.queryByText('Retake Assessment')).toBeNull();
    });
  });

  // ── Complete Assessment button ───────────────────────────────────────────

  describe('complete assessment button', () => {
    it('renders "Complete Assessment" when hasSkippedSections and onCompleteRemaining are set', () => {
      renderCard({
        hasSkippedSections: true,
        onCompleteRemaining: vi.fn(),
      });
      expect(screen.getByText('Complete Assessment')).toBeDefined();
    });

    it('calls onCompleteRemaining when clicked', async () => {
      const onCompleteRemaining = vi.fn();
      renderCard({ hasSkippedSections: true, onCompleteRemaining });
      const user = userEvent.setup();

      await user.click(screen.getByText('Complete Assessment'));
      expect(onCompleteRemaining).toHaveBeenCalledOnce();
    });

    it('does not render "Complete Assessment" when hasSkippedSections is false', () => {
      renderCard({ hasSkippedSections: false, onCompleteRemaining: vi.fn() });
      expect(screen.queryByText('Complete Assessment')).toBeNull();
    });
  });

  // ── Card header ──────────────────────────────────────────────────────────

  describe('card header', () => {
    it('renders "My Profile" heading', () => {
      renderCard();
      expect(screen.getByText('My Profile')).toBeDefined();
    });
  });
});

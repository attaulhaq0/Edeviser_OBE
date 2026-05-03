// =============================================================================
// Unit Test: Bonus Question Popup
// Task 26.3 — Bonus question rendering, timer, answer submission
// =============================================================================

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import BonusQuestionPopup from '@/components/shared/BonusQuestionPopup';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

const defaultQuestion = {
  text: 'What is the key concept?',
  type: 'open_ended',
  clo_id: null,
  time_limit_seconds: 30,
  xp_reward: 25,
};

describe('BonusQuestionPopup', () => {
  it('renders the question text when open', () => {
    render(
      <BonusQuestionPopup
        open={true}
        onClose={() => {}}
        question={defaultQuestion}
        studentId="student-1"
        institutionId="inst-1"
      />,
      { wrapper },
    );

    expect(screen.getByText('What is the key concept?')).toBeDefined();
  });

  it('displays the XP reward amount', () => {
    render(
      <BonusQuestionPopup
        open={true}
        onClose={() => {}}
        question={defaultQuestion}
        studentId="student-1"
        institutionId="inst-1"
      />,
      { wrapper },
    );

    expect(screen.getByText('+25 XP reward')).toBeDefined();
  });

  it('shows the timer', () => {
    render(
      <BonusQuestionPopup
        open={true}
        onClose={() => {}}
        question={defaultQuestion}
        studentId="student-1"
        institutionId="inst-1"
      />,
      { wrapper },
    );

    expect(screen.getByText('30s')).toBeDefined();
  });

  it('has a submit button', () => {
    render(
      <BonusQuestionPopup
        open={true}
        onClose={() => {}}
        question={defaultQuestion}
        studentId="student-1"
        institutionId="inst-1"
      />,
      { wrapper },
    );

    expect(screen.getByText('Submit')).toBeDefined();
  });

  it('has a skip button', () => {
    render(
      <BonusQuestionPopup
        open={true}
        onClose={() => {}}
        question={defaultQuestion}
        studentId="student-1"
        institutionId="inst-1"
      />,
      { wrapper },
    );

    expect(screen.getByText('Skip')).toBeDefined();
  });
});

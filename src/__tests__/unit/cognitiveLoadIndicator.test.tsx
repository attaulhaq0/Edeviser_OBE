// Feature: i18n-rtl-support, Property 15: Cognitive Load Indicator Threshold Consistency
// **Validates: Requirements 21.1**

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/lib/i18n';
import { CognitiveLoadIndicator } from '@/components/shared/CognitiveLoadIndicator';

// Mock the accessibility preferences hook
vi.mock('@/hooks/useAccessibilityPreferences', () => ({
  useAccessibilityPreferences: () => ({
    data: {
      font_size: 'default',
      high_contrast: false,
      reduced_animations: false,
      dyslexia_font: false,
      simplified_view: false,
    },
  }),
  useUpdateAccessibilityPreferences: () => ({ mutate: vi.fn() }),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
    </QueryClientProvider>
  );
};

describe('CognitiveLoadIndicator', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders banner when sectionCount > threshold', () => {
    render(
      <CognitiveLoadIndicator sectionCount={8} threshold={6} pageId="test-page" />,
      { wrapper: createWrapper() },
    );
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders null when sectionCount <= threshold', () => {
    const { container } = render(
      <CognitiveLoadIndicator sectionCount={5} threshold={6} pageId="test-page" />,
      { wrapper: createWrapper() },
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders null when sectionCount equals threshold', () => {
    const { container } = render(
      <CognitiveLoadIndicator sectionCount={6} threshold={6} pageId="test-page" />,
      { wrapper: createWrapper() },
    );
    expect(container.innerHTML).toBe('');
  });

  it('uses default threshold of 6', () => {
    render(
      <CognitiveLoadIndicator sectionCount={7} pageId="test-page" />,
      { wrapper: createWrapper() },
    );
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders null when page was previously dismissed', () => {
    localStorage.setItem(
      'edeviser-cognitive-dismissed',
      JSON.stringify(['test-page']),
    );
    const { container } = render(
      <CognitiveLoadIndicator sectionCount={10} threshold={6} pageId="test-page" />,
      { wrapper: createWrapper() },
    );
    expect(container.innerHTML).toBe('');
  });
});

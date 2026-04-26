import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ReflectionTemplateSelector from '@/components/shared/ReflectionTemplateSelector';

describe('ReflectionTemplateSelector', () => {
  it('renders the selector', () => {
    render(
      <ReflectionTemplateSelector
        selectedTemplate="free_form"
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByTestId('reflection-template-selector')).toBeInTheDocument();
  });

  it('displays the current template label', () => {
    render(
      <ReflectionTemplateSelector
        selectedTemplate="free_form"
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText('Free-form')).toBeInTheDocument();
  });
});

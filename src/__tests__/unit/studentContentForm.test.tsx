// Task 26.10: Student Content Form — Content creation form, type selection
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ContentForm from '@/pages/student/content/ContentForm';

// ─── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'student-1' } }),
}));

const mockMutate = vi.fn();
vi.mock('@/hooks/useStudentContent', () => ({
  useCreateStudentContent: () => ({ mutate: mockMutate, isPending: false }),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const createWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
};

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('ContentForm', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('renders the form title', () => {
    render(<ContentForm onClose={vi.fn()} />, { wrapper: createWrapper() });
    expect(screen.getByText('Create Content')).toBeDefined();
  });

  it('renders content type selector', () => {
    render(<ContentForm onClose={vi.fn()} />, { wrapper: createWrapper() });
    expect(screen.getByText('Content Type')).toBeDefined();
  });

  it('renders title input', () => {
    render(<ContentForm onClose={vi.fn()} />, { wrapper: createWrapper() });
    expect(screen.getByText('Title')).toBeDefined();
  });

  it('renders submit button', () => {
    render(<ContentForm onClose={vi.fn()} />, { wrapper: createWrapper() });
    expect(screen.getByText('Submit for Review')).toBeDefined();
  });

  it('renders cancel button', () => {
    render(<ContentForm onClose={vi.fn()} />, { wrapper: createWrapper() });
    expect(screen.getByText('Cancel')).toBeDefined();
  });

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn();
    render(<ContentForm onClose={onClose} />, { wrapper: createWrapper() });
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when X button is clicked', () => {
    const onClose = vi.fn();
    render(<ContentForm onClose={onClose} />, { wrapper: createWrapper() });
    // The X button is a ghost button with X icon
    const closeButtons = screen.getAllByRole('button');
    const xButton = closeButtons.find((btn) => btn.className.includes('h-8'));
    if (xButton) fireEvent.click(xButton);
    expect(onClose).toHaveBeenCalled();
  });

  it('shows study plan details field by default', () => {
    render(<ContentForm onClose={vi.fn()} />, { wrapper: createWrapper() });
    expect(screen.getByText('Study Plan Details')).toBeDefined();
  });
});

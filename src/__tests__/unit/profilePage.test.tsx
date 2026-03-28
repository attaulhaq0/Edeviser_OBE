// @vitest-environment happy-dom
// =============================================================================
// ProfilePage — Unit tests
// Tests the shared Profile page for all roles (Req 8, 39.2)
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockMaybeSingle = vi.fn();
const mockUpdate = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: mockMaybeSingle,
        })),
      })),
      update: vi.fn((data: unknown) => {
        mockUpdate(data);
        return {
          eq: vi.fn().mockResolvedValue({ error: null }),
        };
      }),
    })),
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: { download_url: 'https://example.com/export.json' }, error: null }),
    },
  },
}));

const mockProfile = {
  id: 'user-1',
  email: 'user@test.com',
  full_name: 'Test User',
  role: 'admin' as const,
  avatar_url: null as string | null,
};

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'user-1' },
    profile: mockProfile,
  }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const mockSetTheme = vi.fn();
vi.mock('@/providers/ThemeProvider', () => ({
  useTheme: () => ({
    theme: 'system' as const,
    resolvedTheme: 'light' as const,
    setTheme: mockSetTheme,
  }),
  ThemePreference: {},
}));

const mockUploadAvatarFile = vi.fn();
vi.mock('@/lib/fileUpload', () => ({
  uploadAvatarFile: (...args: unknown[]) => mockUploadAvatarFile(...args),
  FileValidationError: class FileValidationError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'FileValidationError';
    }
  },
}));

import ProfilePage from '@/pages/shared/ProfilePage';
import { FileValidationError } from '@/lib/fileUpload';
import { toast } from 'sonner';

// ─── Helpers ────────────────────────────────────────────────────────────────

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const renderPage = () => {
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <ProfilePage />
    </QueryClientProvider>,
  );
};

const createFile = (name: string, type: string, sizeKB = 100): File => {
  const content = new Uint8Array(sizeKB * 1024);
  return new File([content], name, { type });
};

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProfile.avatar_url = null;
    mockMaybeSingle.mockResolvedValue({
      data: {
        email_preferences: {
          streak_risk: true,
          weekly_summary: true,
          new_assignment: true,
          grade_released: true,
        },
      },
      error: null,
    });
  });

  it('renders the page title', () => {
    renderPage();
    expect(screen.getByText('Profile Settings')).toBeDefined();
  });

  it('renders the profile section header', () => {
    renderPage();
    expect(screen.getByText('Profile')).toBeDefined();
  });

  it('displays the user full name', () => {
    renderPage();
    expect(screen.getByText('Test User')).toBeDefined();
  });

  it('displays the user email', () => {
    renderPage();
    expect(screen.getByText('user@test.com')).toBeDefined();
  });

  it('displays the user role', () => {
    renderPage();
    expect(screen.getByText('admin')).toBeDefined();
  });

  it('renders the EmailPreferencesSection', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Email Notifications')).toBeDefined();
    });
  });

  it('shows fallback icon when no avatar_url is set', () => {
    renderPage();
    const fallback = document.querySelector('.bg-blue-50.rounded-full');
    expect(fallback).not.toBeNull();
  });

  it('renders avatar image when avatar_url is set', () => {
    mockProfile.avatar_url = 'https://example.com/avatar.jpg';
    renderPage();
    const img = screen.getByAltText('Test User');
    expect(img).toBeDefined();
    expect(img.getAttribute('src')).toBe('https://example.com/avatar.jpg');
  });

  it('renders an upload avatar button', () => {
    renderPage();
    const btn = screen.getByRole('button', { name: /upload avatar/i });
    expect(btn).toBeDefined();
  });

  it('has a hidden file input with correct accept types', () => {
    renderPage();
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(input.accept).toBe('image/jpeg,image/png,image/gif,image/webp');
    expect(input.className).toContain('hidden');
  });

  it('uploads avatar and shows success toast on valid file', async () => {
    mockUploadAvatarFile.mockResolvedValue('https://storage.example.com/avatar.png');

    renderPage();
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = createFile('photo.png', 'image/png');

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(mockUploadAvatarFile).toHaveBeenCalledWith({
        file,
        userId: 'user-1',
      });
    });

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith({
        avatar_url: 'https://storage.example.com/avatar.png',
      });
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Avatar updated');
    });
  });

  it('shows validation error toast when file is invalid', async () => {
    mockUploadAvatarFile.mockRejectedValue(
      new FileValidationError('File size exceeds the 2MB limit. Your file is 3.0MB.'),
    );

    renderPage();
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = createFile('big.png', 'image/png', 3000);

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'File size exceeds the 2MB limit. Your file is 3.0MB.',
      );
    });
  });

  it('shows generic error toast on upload failure', async () => {
    mockUploadAvatarFile.mockRejectedValue(new Error('Network error'));

    renderPage();
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = createFile('photo.png', 'image/png');

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        'Failed to upload avatar. Please try again.',
      );
    });
  });

  it('renders the Appearance section with theme toggle buttons', () => {
    renderPage();
    expect(screen.getByText('Appearance')).toBeDefined();
    expect(screen.getByRole('radio', { name: /light/i })).toBeDefined();
    expect(screen.getByRole('radio', { name: /dark/i })).toBeDefined();
    expect(screen.getByRole('radio', { name: /system/i })).toBeDefined();
  });

  it('calls setTheme when a theme button is clicked', () => {
    renderPage();
    fireEvent.click(screen.getByRole('radio', { name: /dark/i }));
    expect(mockSetTheme).toHaveBeenCalledWith('dark');
  });

  it('marks the current theme as checked', () => {
    renderPage();
    const systemBtn = screen.getByRole('radio', { name: /system/i });
    expect(systemBtn.getAttribute('aria-checked')).toBe('true');
  });

  it('does not render Data Export section for non-student roles', () => {
    mockProfile.role = 'admin' as const;
    renderPage();
    expect(screen.queryByText('Data Export')).toBeNull();
  });

  it('renders Data Export section for student role', () => {
    mockProfile.role = 'student' as 'admin';
    renderPage();
    expect(screen.getByText('Data Export')).toBeDefined();
    expect(screen.getByRole('button', { name: /download my data/i })).toBeDefined();
  });
});

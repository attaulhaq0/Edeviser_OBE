// @vitest-environment happy-dom
// =============================================================================
// ThemeProvider / Dark Mode — Unit tests
// Validates: Requirement 61 (Dark Mode)
// =============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';

// ── Mocks ────────────────────────────────────────────────────────────────────

let mockProfile: Record<string, unknown> | null = null;
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ profile: mockProfile }),
}));

const mockUpdate = vi.fn().mockReturnValue({
  eq: vi.fn().mockResolvedValue({ error: null }),
});
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      update: (...args: unknown[]) => mockUpdate(...args),
    }),
  },
}));

import { ThemeProvider, useTheme } from '@/providers/ThemeProvider';

// ── Tests ────────────────────────────────────────────────────────────────────

describe('ThemeProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    document.documentElement.classList.remove('light', 'dark');
    mockProfile = null;
  });

  afterEach(() => {
    document.documentElement.classList.remove('light', 'dark');
  });

  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(ThemeProvider, null, children);

  it('defaults to system theme when no stored preference', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.theme).toBe('system');
  });

  it('resolves system theme to light when prefers-color-scheme is light', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    // happy-dom defaults to light
    expect(result.current.resolvedTheme).toBe('light');
  });

  it('reads stored theme from localStorage', () => {
    localStorage.setItem('theme', 'dark');
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.theme).toBe('dark');
    expect(result.current.resolvedTheme).toBe('dark');
  });

  it('applies dark class to html element when theme is dark', () => {
    localStorage.setItem('theme', 'dark');
    renderHook(() => useTheme(), { wrapper });
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('applies light class to html element when theme is light', () => {
    localStorage.setItem('theme', 'light');
    renderHook(() => useTheme(), { wrapper });
    expect(document.documentElement.classList.contains('light')).toBe(true);
  });

  it('setTheme updates localStorage and resolved theme', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });

    act(() => {
      result.current.setTheme('dark');
    });

    expect(localStorage.getItem('theme')).toBe('dark');
    expect(result.current.theme).toBe('dark');
    expect(result.current.resolvedTheme).toBe('dark');
  });

  it('setTheme persists to Supabase when profile exists', () => {
    mockProfile = { id: 'user-1', theme_preference: 'light' };
    const { result } = renderHook(() => useTheme(), { wrapper });

    act(() => {
      result.current.setTheme('dark');
    });

    expect(mockUpdate).toHaveBeenCalledWith({ theme_preference: 'dark' });
  });

  it('setTheme does not call Supabase when no profile', () => {
    mockProfile = null;
    const { result } = renderHook(() => useTheme(), { wrapper });

    act(() => {
      result.current.setTheme('dark');
    });

    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('syncs theme from profile on first load', () => {
    mockProfile = { id: 'user-1', theme_preference: 'dark' };
    renderHook(() => useTheme(), { wrapper });
    expect(localStorage.getItem('theme')).toBe('dark');
  });

  it('ignores invalid stored theme values', () => {
    localStorage.setItem('theme', 'invalid-value');
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.theme).toBe('system');
  });
});

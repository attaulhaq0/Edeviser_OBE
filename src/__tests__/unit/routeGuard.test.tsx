import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import RouteGuard from '@/router/RouteGuard';
import type { UserRole } from '@/types/app';

// ---------------------------------------------------------------------------
// Mock useAuth
// ---------------------------------------------------------------------------
const mockUseAuth = vi.fn();

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const buildAuth = (overrides: Record<string, unknown> = {}) => ({
  user: null,
  profile: null,
  role: null as UserRole | null,
  institutionId: null,
  isLoading: false,
  signIn: vi.fn(),
  signOut: vi.fn(),
  resetPassword: vi.fn(),
  ...overrides,
});

const renderGuard = (
  allowedRoles: UserRole[],
  initialPath: string,
) => {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/login" element={<div>Login Page</div>} />
        <Route path="/admin/dashboard" element={<div>Admin Dashboard</div>} />
        <Route path="/student/dashboard" element={<div>Student Dashboard</div>} />
        <Route path="/teacher/dashboard" element={<div>Teacher Dashboard</div>} />
        <Route path="/coordinator/dashboard" element={<div>Coordinator Dashboard</div>} />
        <Route path="/parent/dashboard" element={<div>Parent Dashboard</div>} />
        <Route
          path="/admin/*"
          element={
            <RouteGuard allowedRoles={allowedRoles}>
              <div>Protected Admin Content</div>
            </RouteGuard>
          }
        />
        <Route
          path="/student/*"
          element={
            <RouteGuard allowedRoles={allowedRoles}>
              <div>Protected Student Content</div>
            </RouteGuard>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('RouteGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading spinner while auth is loading', () => {
    mockUseAuth.mockReturnValue(buildAuth({ isLoading: true }));
    renderGuard(['admin'], '/admin/test');
    expect(screen.queryByText('Protected Admin Content')).not.toBeInTheDocument();
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
  });

  it('redirects to /login when user is not authenticated', () => {
    mockUseAuth.mockReturnValue(buildAuth());
    renderGuard(['admin'], '/admin/test');
    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('renders children when user has an allowed role', () => {
    mockUseAuth.mockReturnValue(
      buildAuth({ user: { id: '1' }, role: 'admin' }),
    );
    renderGuard(['admin'], '/admin/test');
    expect(screen.getByText('Protected Admin Content')).toBeInTheDocument();
  });

  it('redirects to role dashboard when user has wrong role', () => {
    mockUseAuth.mockReturnValue(
      buildAuth({ user: { id: '1' }, role: 'student' }),
    );
    renderGuard(['admin'], '/admin/test');
    expect(screen.getByText('Student Dashboard')).toBeInTheDocument();
  });

  it('redirects teacher to teacher dashboard when accessing admin route', () => {
    mockUseAuth.mockReturnValue(
      buildAuth({ user: { id: '1' }, role: 'teacher' }),
    );
    renderGuard(['admin'], '/admin/test');
    expect(screen.getByText('Teacher Dashboard')).toBeInTheDocument();
  });

  it('redirects coordinator to coordinator dashboard when accessing admin route', () => {
    mockUseAuth.mockReturnValue(
      buildAuth({ user: { id: '1' }, role: 'coordinator' }),
    );
    renderGuard(['admin'], '/admin/test');
    expect(screen.getByText('Coordinator Dashboard')).toBeInTheDocument();
  });

  it('redirects parent to parent dashboard when accessing student route', () => {
    mockUseAuth.mockReturnValue(
      buildAuth({ user: { id: '1' }, role: 'parent' }),
    );
    renderGuard(['student'], '/student/test');
    expect(screen.getByText('Parent Dashboard')).toBeInTheDocument();
  });

  it('redirects to /login when user exists but role is null', () => {
    mockUseAuth.mockReturnValue(
      buildAuth({ user: { id: '1' }, role: null }),
    );
    renderGuard(['admin'], '/admin/test');
    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });
});

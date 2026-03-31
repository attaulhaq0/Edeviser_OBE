// Feature: edeviser-platform, Property 6: Role-aware post-login redirect
// Feature: edeviser-platform, Property 7: Cross-role URL access denied
// Feature: edeviser-platform, Property 8: Unauthenticated → /login redirect
// **Validates: Requirements 3.1, 3.2, 3.3**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { UserRole } from '@/types/app';

// ─── Pure routing model ─────────────────────────────────────────────────────

const ROLE_DASHBOARDS: Record<Exclude<UserRole, 'parent'>, string> = {
  admin: '/admin',
  coordinator: '/coordinator',
  teacher: '/teacher',
  student: '/student',
};

const PARENT_DASHBOARD = '/parent';

const PROTECTED_PREFIXES = ['/admin', '/coordinator', '/teacher', '/student', '/parent'];

type RouteDecision =
  | { action: 'redirect'; to: string }
  | { action: 'allow' };

/** Pure function modeling post-login redirect. */
function getPostLoginRedirect(role: UserRole): string {
  if (role === 'parent') return PARENT_DASHBOARD;
  return ROLE_DASHBOARDS[role];
}

/** Pure function modeling route guard. */
function evaluateRouteGuard(
  path: string,
  isAuthenticated: boolean,
  userRole: UserRole | null,
): RouteDecision {
  // Unauthenticated → redirect to login
  if (!isAuthenticated || !userRole) {
    const isProtected = PROTECTED_PREFIXES.some((prefix) => path.startsWith(prefix));
    if (isProtected) {
      return { action: 'redirect', to: '/login' };
    }
    return { action: 'allow' };
  }

  // Check if user is accessing their own role's routes
  const userPrefix = userRole === 'parent' ? '/parent' : `/${userRole}`;
  const isOwnRoute = path.startsWith(userPrefix);
  const isProtectedRoute = PROTECTED_PREFIXES.some((prefix) => path.startsWith(prefix));

  if (isProtectedRoute && !isOwnRoute) {
    return { action: 'redirect', to: userPrefix };
  }

  return { action: 'allow' };
}

// ─── Arbitraries ────────────────────────────────────────────────────────────

const roleArb = fc.constantFrom<UserRole>('admin', 'coordinator', 'teacher', 'student', 'parent');
const nonParentRoleArb = fc.constantFrom<Exclude<UserRole, 'parent'>>('admin', 'coordinator', 'teacher', 'student');

const protectedPathArb = fc.constantFrom(
  '/admin/dashboard', '/admin/users', '/admin/programs',
  '/coordinator/dashboard', '/coordinator/courses',
  '/teacher/dashboard', '/teacher/grading',
  '/student/dashboard', '/student/assignments',
  '/parent/dashboard',
);

const publicPathArb = fc.constantFrom('/login', '/portfolio/abc', '/terms', '/privacy');

// ─── Property 6: Role-aware post-login redirect ─────────────────────────────

describe('Property 6 — Role-aware post-login redirect', () => {
  it('P6a: each role redirects to its own dashboard path', () => {
    fc.assert(
      fc.property(roleArb, (role) => {
        const redirect = getPostLoginRedirect(role);
        if (role === 'parent') {
          expect(redirect).toBe('/parent');
        } else {
          expect(redirect).toBe(`/${role}`);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('P6b: redirect path always starts with a slash', () => {
    fc.assert(
      fc.property(roleArb, (role) => {
        const redirect = getPostLoginRedirect(role);
        expect(redirect.startsWith('/')).toBe(true);
      }),
      { numRuns: 100 },
    );
  });
});

// ─── Property 7: Cross-role URL access denied ───────────────────────────────

describe('Property 7 — Cross-role URL access denied', () => {
  it('P7a: authenticated user accessing another role\'s route is redirected to own dashboard', () => {
    fc.assert(
      fc.property(
        roleArb,
        protectedPathArb,
        (userRole, path) => {
          const userPrefix = userRole === 'parent' ? '/parent' : `/${userRole}`;
          const isOwnRoute = path.startsWith(userPrefix);

          if (!isOwnRoute) {
            const decision = evaluateRouteGuard(path, true, userRole);
            expect(decision.action).toBe('redirect');
            if (decision.action === 'redirect') {
              expect(decision.to).toBe(userPrefix);
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P7b: authenticated user accessing own role\'s route is allowed', () => {
    fc.assert(
      fc.property(nonParentRoleArb, (role) => {
        const path = `/${role}/dashboard`;
        const decision = evaluateRouteGuard(path, true, role);
        expect(decision.action).toBe('allow');
      }),
      { numRuns: 100 },
    );
  });
});

// ─── Property 8: Unauthenticated → /login redirect ─────────────────────────

describe('Property 8 — Unauthenticated redirect to login', () => {
  it('P8a: unauthenticated user on protected route is redirected to /login', () => {
    fc.assert(
      fc.property(protectedPathArb, (path) => {
        const decision = evaluateRouteGuard(path, false, null);
        expect(decision.action).toBe('redirect');
        if (decision.action === 'redirect') {
          expect(decision.to).toBe('/login');
        }
      }),
      { numRuns: 100 },
    );
  });

  it('P8b: unauthenticated user on public route is allowed', () => {
    fc.assert(
      fc.property(publicPathArb, (path) => {
        const decision = evaluateRouteGuard(path, false, null);
        expect(decision.action).toBe('allow');
      }),
      { numRuns: 100 },
    );
  });
});

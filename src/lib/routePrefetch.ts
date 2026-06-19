/**
 * Route-chunk prefetch registry (spec: dashboard-and-ux-performance, Req 9).
 *
 * Maps a sidebar nav path to a thunk that dynamically `import()`s the SAME lazy
 * route module `AppRouter` loads. Calling it on hover/focus warms the route's JS
 * chunk so the click-through navigation has no lazy-load wait. The browser/Vite
 * dedupe the module, so re-importing is cheap and re-running is a no-op.
 *
 * Coverage is the high-traffic routes per role (dashboards + primary list
 * pages); unmapped paths are a safe no-op, so adding more is purely additive.
 * The import specifiers MUST match `AppRouter`'s `lazy(() => import(...))` exactly
 * so the same chunk is warmed (not a second copy).
 *
 * Intentionally only warms the JS chunk: a route's primary *query* prefetch needs
 * per-route keys/filters (and auth context), so that stays the route component's
 * responsibility rather than being guessed here.
 */
const ROUTE_CHUNK_LOADERS: Record<string, () => Promise<unknown>> = {
  // Admin
  "/admin/dashboard": () => import("@/pages/admin/AdminDashboard"),
  "/admin/users": () => import("@/pages/admin/users/UserListPage"),
  "/admin/programs": () => import("@/pages/admin/programs/ProgramListPage"),
  "/admin/courses": () => import("@/pages/admin/courses/CourseListPage"),
  "/admin/outcomes": () => import("@/pages/admin/outcomes/ILOListPage"),
  // Coordinator
  "/coordinator/dashboard": () =>
    import("@/pages/coordinator/CoordinatorDashboard"),
  "/coordinator/plos": () => import("@/pages/coordinator/plos/PLOListPage"),
  // Teacher
  "/teacher/dashboard": () => import("@/pages/teacher/TeacherDashboard"),
  "/teacher/clos": () => import("@/pages/teacher/clos/CLOListPage"),
  "/teacher/assignments": () =>
    import("@/pages/teacher/assignments/AssignmentListPage"),
  "/teacher/grading": () => import("@/pages/teacher/grading/GradingQueuePage"),
  "/teacher/rubrics": () => import("@/pages/teacher/rubrics/RubricListPage"),
  // Student
  "/student/dashboard": () => import("@/pages/student/StudentDashboard"),
  "/student/courses": () =>
    import("@/pages/student/courses/StudentCoursesPage"),
  "/student/assignments": () =>
    import("@/pages/student/assignments/AssignmentListPage"),
  // Parent
  "/parent/dashboard": () => import("@/pages/parent/ParentDashboard"),
};

/**
 * Warms the route chunk for `path` if it is in the registry. Returns the import
 * promise (so callers may await/catch) or `undefined` for an unmapped path.
 * Never throws synchronously; rejection handling is the caller's concern
 * (`useIntentPrefetch` swallows it).
 */
export const prefetchRoute = (path: string): Promise<unknown> | undefined => {
  const loader = ROUTE_CHUNK_LOADERS[path];
  return loader ? loader() : undefined;
};

/** True when a path has a registered chunk loader (used in tests). */
export const hasRoutePrefetch = (path: string): boolean =>
  path in ROUTE_CHUNK_LOADERS;

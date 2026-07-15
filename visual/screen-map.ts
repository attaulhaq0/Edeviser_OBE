/**
 * Visual-regression screen map — the pixel-parity burn-down list.
 *
 * Single source of truth for BOTH harness specs:
 *  - prototype-reference.spec.ts captures the approved prototype screen as the
 *    reference image (the "design truth").
 *  - parity.spec.ts screenshots the REBUILT app route and diffs it against that
 *    reference; it only runs for entries flagged `rebuilt: true` (+ `appPath`),
 *    so the suite stays green while screens are still being built.
 *
 * Workflow: when a screen is rebuilt in the new design system, set its
 * `appPath`, flip `rebuilt: true`, (re)capture references, then run `test:visual`.
 * A screen is "pixel-perfect" when its diff ratio is <= its threshold at every
 * viewport.
 *
 * NOTE: the prototype defines LIGHT-mode + LTR only, so parity is defined for
 * light/LTR. Dark mode and Arabic/RTL are net-new and gated separately.
 */

export type Role = "student" | "teacher" | "coordinator" | "parent" | "admin";

export interface VisualScreen {
  /** Stable id — used in reference/diff filenames. */
  id: string;
  /** File under `prototype/` that is the visual reference. */
  prototype: string;
  /** App route to diff against once rebuilt (omit until then). */
  appPath?: string;
  /** Role whose auth/layout the app route needs (for storageState wiring). */
  role?: Role;
  /** Flip to true when the app screen is claimed rebuilt → activates parity. */
  rebuilt?: boolean;
  /** Per-screen max allowed diff ratio (0..1). Falls back to DEFAULT. */
  maxDiffRatio?: number;
}

/** Viewports required by the fidelity gate (design.md §4 / R2.6). */
export const VIEWPORTS = [
  { name: "mobile", width: 360, height: 800 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "laptop", width: 1024, height: 768 },
  { name: "desktop", width: 1440, height: 900 },
] as const;

export type ViewportName = (typeof VIEWPORTS)[number]["name"];

/**
 * Default tolerance. Cross-implementation parity (prototype HTML vs React) is
 * never byte-identical (font hinting, emoji→Lucide, dynamic data), so this is a
 * pragmatic starting threshold; tune per screen as real baselines land.
 */
export const DEFAULT_MAX_DIFF_RATIO = 0.12;

/** Per-pixel color sensitivity handed to pixelmatch (0 strict … 1 loose). */
export const PIXELMATCH_THRESHOLD = 0.1;

/**
 * The map. `rebuilt` is false everywhere today (the rebuild hasn't started per
 * screen), so parity.spec.ts currently asserts nothing — it activates row by row.
 * `prototype` files verified to exist in `prototype/`.
 */
export const SCREENS: VisualScreen[] = [
  // ── Public / auth ────────────────────────────────────────────────────────
  { id: "auth-login", prototype: "auth.html", appPath: "/login" },

  // ── Student (flagship journeys the prototype specifies most fully) ────────
  { id: "student-dashboard", prototype: "dashboard.html", appPath: "/student/dashboard", role: "student" },
  { id: "student-path", prototype: "path.html", appPath: "/student/today", role: "student" },
  { id: "student-lesson", prototype: "lesson.html", role: "student" },
  { id: "student-review", prototype: "review.html", role: "student" },
  { id: "student-tutor", prototype: "tutor.html", appPath: "/student/tutor", role: "student" },
  { id: "student-progress", prototype: "progress.html", appPath: "/student/progress", role: "student" },
  { id: "student-journal", prototype: "journal.html", appPath: "/student/journal", role: "student" },
  { id: "student-leaderboard", prototype: "leaderboard.html", appPath: "/student/leaderboard", role: "student" },
  { id: "student-marketplace", prototype: "marketplace.html", appPath: "/student/marketplace", role: "student" },
  { id: "student-portfolio", prototype: "portfolio.html", appPath: "/student/portfolio", role: "student" },
  { id: "student-courses", prototype: "learn.html", appPath: "/student/courses", role: "student" },
  { id: "student-course-detail", prototype: "course.html", role: "student" },
  { id: "student-assignment", prototype: "assignment.html", role: "student" },
  { id: "student-team", prototype: "team.html", appPath: "/student/team", role: "student" },
  { id: "student-calendar", prototype: "calendar.html", appPath: "/student/calendar", role: "student" },
  { id: "student-settings", prototype: "settings.html", appPath: "/student/settings/profile", role: "student" },
  { id: "student-profile", prototype: "profile.html", role: "student" },
  { id: "student-wellness", prototype: "wellness.html", role: "student" },
  { id: "student-focus", prototype: "focus.html", role: "student" },
  { id: "student-quests", prototype: "quests.html", role: "student" },
  { id: "student-transcript", prototype: "transcript.html", appPath: "/student/transcript", role: "student" },
  { id: "student-badges", prototype: "badges.html", role: "student" },
  { id: "student-learning-profile", prototype: "learning-profile.html", role: "student" },

  // ── Teacher ───────────────────────────────────────────────────────────────
  { id: "teacher-dashboard", prototype: "teacher-dashboard.html", appPath: "/teacher/dashboard", role: "teacher" },
  { id: "teacher-grading", prototype: "teacher-grading.html", appPath: "/teacher/grading", role: "teacher" },
  { id: "teacher-gradebook", prototype: "teacher-gradebook.html", appPath: "/teacher/gradebook", role: "teacher" },
  { id: "teacher-students", prototype: "teacher-students.html", role: "teacher" },
  { id: "teacher-curriculum", prototype: "teacher-curriculum.html", role: "teacher" },
  { id: "teacher-attendance", prototype: "teacher-attendance.html", appPath: "/teacher/attendance", role: "teacher" },
  { id: "teacher-rubrics", prototype: "teacher-rubrics.html", appPath: "/teacher/rubrics", role: "teacher" },
  { id: "teacher-questions", prototype: "teacher-questions.html", role: "teacher" },
  { id: "teacher-materials", prototype: "teacher-materials.html", role: "teacher" },
  { id: "teacher-handoffs", prototype: "teacher-handoffs.html", role: "teacher" },
  { id: "teacher-profile", prototype: "teacher-profile.html", role: "teacher" },

  // ── Parent ─────────────────────────────────────────────────────────────────
  { id: "parent-dashboard", prototype: "parent-dashboard.html", appPath: "/parent/dashboard", role: "parent" },
  { id: "parent-progress", prototype: "parent-progress.html", appPath: "/parent/progress", role: "parent" },
  { id: "parent-support", prototype: "parent-support.html", appPath: "/parent/planner", role: "parent" },
  { id: "parent-profile", prototype: "parent-profile.html", role: "parent" },

  // ── Coordinator ──────────────────────────────────────────────────────────
  { id: "coordinator-dashboard", prototype: "coordinator-dashboard.html", appPath: "/coordinator/dashboard", role: "coordinator" },
  { id: "coordinator-outcomes", prototype: "coordinator-outcomes.html", appPath: "/coordinator/plos", role: "coordinator" },
  { id: "coordinator-curriculum", prototype: "coordinator-curriculum.html", appPath: "/coordinator/matrix", role: "coordinator" },
  { id: "coordinator-accreditation", prototype: "coordinator-accreditation.html", appPath: "/coordinator/course-file", role: "coordinator" },
  { id: "coordinator-cqi", prototype: "coordinator-cqi.html", role: "coordinator" },
  { id: "coordinator-competencies", prototype: "coordinator-competencies.html", role: "coordinator" },
  { id: "coordinator-course-file", prototype: "coordinator-course-file.html", role: "coordinator" },
  { id: "coordinator-teams", prototype: "coordinator-teams.html", role: "coordinator" },
  { id: "coordinator-profile", prototype: "coordinator-profile.html", role: "coordinator" },

  // ── Admin ────────────────────────────────────────────────────────────────
  { id: "admin-dashboard", prototype: "admin-dashboard.html", appPath: "/admin/dashboard", role: "admin" },
  { id: "admin-users", prototype: "admin-users.html", appPath: "/admin/users", role: "admin" },
  { id: "admin-analytics", prototype: "admin-analytics.html", appPath: "/admin/reports", role: "admin" },
  { id: "admin-fees", prototype: "admin-fees.html", appPath: "/admin/fees", role: "admin" },
  { id: "admin-governance", prototype: "admin-governance.html", role: "admin" },
  { id: "admin-marketplace", prototype: "admin-marketplace.html", role: "admin" },
  { id: "admin-profile", prototype: "admin-profile.html", role: "admin" },
  { id: "admin-security", prototype: "admin-security.html", appPath: "/admin/security", role: "admin" },
  { id: "admin-structure", prototype: "admin-structure.html", role: "admin" },
  { id: "admin-import", prototype: "admin-import.html", role: "admin" },
  { id: "admin-badges", prototype: "admin-badges.html", role: "admin" },

  // ── Cross-cutting / shared (prototype is role-aware; captured under student
  //    chrome — the role prefix is intentionally "shared" not a specific role) ─
  { id: "shared-announcements", prototype: "announcements.html", role: "student" },
  { id: "shared-notifications", prototype: "notifications.html", appPath: "/student/notifications", role: "student" },
  { id: "shared-discussions", prototype: "discussions.html", role: "student" },
  { id: "shared-surveys", prototype: "surveys.html", role: "student" },
  { id: "shared-fees", prototype: "fees.html", appPath: "/student/fees", role: "student" },
];

/** Prototype uses a device toggle; pick the layout mode for a viewport width. */
export const edvModeFor = (width: number): "mobile" | "laptop" =>
  width >= 640 ? "laptop" : "mobile";

import { lazy, Suspense } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import RoleAppShell from "@/app/RoleAppShell";
import StudentDashboardRail from "@/features/student/dashboard/StudentDashboardRail";
import StudentLearnRail from "@/features/student/rails/StudentLearnRail";
import StudentProgressRail from "@/features/student/rails/StudentProgressRail";
import StudentJournalRail from "@/features/student/rails/StudentJournalRail";
import StudentAssignmentRail from "@/features/student/rails/StudentAssignmentRail";
import StudentFallbackRail from "@/features/student/rails/StudentFallbackRail";
import StudentProfileRail from "@/features/student/rails/StudentProfileRail";
import StudentLearningProfileRail from "@/features/student/rails/StudentLearningProfileRail";
import StudentSettingsRail from "@/features/student/rails/StudentSettingsRail";

const OnboardingWizard = lazy(
  () => import("@/pages/student/onboarding/OnboardingWizard")
);

// Per-page right rails (prototype shared.js `railHTML()` student cases). Each
// student page whose prototype defines a contextual rail maps its route to a
// rail component here; the layout renders the match and reserves its width so
// the feed sits in a true 3-column shell. Other student routes receive the
// lightweight real-data fallback rail. Order doesn't matter (patterns are
// mutually exclusive).
const STUDENT_RAILS: ReadonlyArray<{
  test: RegExp;
  Rail: React.ComponentType;
}> = [
  { test: /^\/student\/dashboard$/, Rail: StudentDashboardRail },
  { test: /^\/student\/courses(\/[^/]+)?$/, Rail: StudentLearnRail },
  { test: /^\/student\/progress$/, Rail: StudentProgressRail },
  { test: /^\/student\/journal$/, Rail: StudentJournalRail },
  { test: /^\/student\/assignments\/[^/]+$/, Rail: StudentAssignmentRail },
  { test: /^\/student\/profile$/, Rail: StudentProfileRail },
  {
    test: /^\/student\/learning-profile$/,
    Rail: StudentLearningProfileRail,
  },
  { test: /^\/student\/settings(?:\/|$)/, Rail: StudentSettingsRail },
];

const StudentLayout = () => {
  const { profile } = useAuth();
  const location = useLocation();
  const showOnboarding =
    profile?.role === "student" && profile?.onboarding_completed === false;

  if (showOnboarding) {
    return (
      <Suspense fallback={<div className="fixed inset-0 z-50 bg-white" />}>
        <OnboardingWizard isDay1 />
      </Suspense>
    );
  }

  // Focused student work intentionally runs without the global header,
  // sidebar, bottom navigation, or contextual rail. The adaptive lesson loop
  // and Focus Mode each provide their own minimal, task-specific chrome.
  if (
    /^\/student\/quizzes\/[^/]+\/adaptive$/.test(location.pathname) ||
    /^\/student\/focus\/[^/]+$/.test(location.pathname)
  ) {
    return (
      <div
        data-immersive
        className="min-h-screen bg-background px-[var(--app-gutter-mobile)] py-6 min-[640px]:px-[var(--app-gutter)]"
      >
        <Outlet />
      </div>
    );
  }

  // Select the contextual right rail for the current student route (if any) and
  // reserve its width (xl:me-80) so the feed sits in a true 3-column shell
  // (sidebar · feed · rail) instead of stretching under the rail.
  const ActiveRail =
    STUDENT_RAILS.find((r) => r.test.test(location.pathname))?.Rail ??
    StudentFallbackRail;

  // The approved Learning Path owns its 400px level-detail column and therefore
  // uses the prototype's data-norail layout. Rendering the fallback rail here
  // would squeeze the journey into a narrow fourth column.
  if (location.pathname === "/student/learning-path") {
    return (
      <RoleAppShell userRole="student">
        <Outlet />
      </RoleAppShell>
    );
  }

  return (
    <RoleAppShell userRole="student" rail={<ActiveRail />}>
      <Outlet />
    </RoleAppShell>
  );
};

export default StudentLayout;

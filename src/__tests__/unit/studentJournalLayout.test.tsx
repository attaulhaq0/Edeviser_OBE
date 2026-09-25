import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";

const state = vi.hoisted(() => ({ onboarded: true }));
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    profile: { role: "student", onboarding_completed: state.onboarded },
  }),
}));
vi.mock("@/app/RoleAppShell", () => ({
  default: ({
    rail,
    children,
  }: {
    rail?: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <div data-testid="role-shell">
      {rail && <aside data-testid="layout-rail">{rail}</aside>}
      {children}
    </div>
  ),
}));
vi.mock("@/features/student/dashboard/StudentDashboardRail", () => ({
  default: () => <div>Dashboard rail</div>,
}));
vi.mock("@/features/student/rails/StudentLearnRail", () => ({
  default: () => <div>Learn rail</div>,
}));
vi.mock("@/features/student/rails/StudentProgressRail", () => ({
  default: () => <div>Progress rail</div>,
}));
vi.mock("@/features/student/rails/StudentAssignmentRail", () => ({
  default: () => <div>Assignment rail</div>,
}));
vi.mock("@/features/student/rails/StudentFallbackRail", () => ({
  default: () => <div>Fallback rail</div>,
}));
vi.mock("@/features/student/rails/StudentProfileRail", () => ({
  default: () => <div>Profile rail</div>,
}));
vi.mock("@/features/student/rails/StudentLearningProfileRail", () => ({
  default: () => <div>Learning profile rail</div>,
}));
vi.mock("@/features/student/rails/StudentSettingsRail", () => ({
  default: () => <div>Settings rail</div>,
}));
vi.mock("@/pages/student/onboarding/OnboardingWizard", () => ({
  default: () => <div>Owned onboarding wizard</div>,
}));

import StudentLayout from "@/pages/student/StudentLayout";
const paths = [
  "journal",
  "journal/new",
  "journal/entry-id",
  "journaling",
  "dashboard",
  "progress",
  "learning-path",
  "calendar",
  "quizzes/quiz-id/adaptive",
  "focus/session-id",
];
const mount = (path: string) => {
  const routes = paths.map((child) => ({
    path: child,
    element: <p data-testid="child">{child}</p>,
  }));
  const router = createMemoryRouter(
    [{ path: "/student/*", element: <StudentLayout />, children: routes }],
    { initialEntries: [`/student/${path}`] }
  );
  return render(<RouterProvider router={router} />);
};
beforeEach(() => {
  state.onboarded = true;
});

describe("S06 student journal route owns reflection body without duplicate rail", () => {
  it.each(["journal", "journal/new", "journal/entry-id"])(
    "keeps shell but no shared journal rail at %s",
    (path) => {
      mount(path);
      expect(screen.getByTestId("role-shell")).toBeInTheDocument();
      expect(screen.getByTestId("child")).toHaveTextContent(path);
      expect(screen.queryByTestId("layout-rail")).not.toBeInTheDocument();
    }
  );
  it.each([
    ["dashboard", "Dashboard rail"],
    ["progress", "Progress rail"],
    ["journaling", "Fallback rail"],
  ])(
    "preserves %s's declared rail instead of swallowing other routes",
    (path, label) => {
      mount(path);
      expect(screen.getByTestId("layout-rail")).toHaveTextContent(label);
    }
  );
  it.each(["learning-path", "calendar"])(
    "preserves existing rail-free %s",
    (path) => {
      mount(path);
      expect(screen.getByTestId("role-shell")).toBeInTheDocument();
      expect(screen.queryByTestId("layout-rail")).toBeNull();
    }
  );
  it.each(["quizzes/quiz-id/adaptive", "focus/session-id"])(
    "keeps immersive %s outside app shell",
    (path) => {
      mount(path);
      expect(screen.queryByTestId("role-shell")).toBeNull();
      expect(screen.getByTestId("child")).toHaveTextContent(path);
    }
  );
  it("keeps actual onboarding ahead of any journal shell or rail", async () => {
    state.onboarded = false;
    mount("journal");
    expect(
      await screen.findByText("Owned onboarding wizard")
    ).toBeInTheDocument();
    expect(screen.queryByTestId("role-shell")).toBeNull();
    expect(screen.queryByTestId("layout-rail")).toBeNull();
  });
});

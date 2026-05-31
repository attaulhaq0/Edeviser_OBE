// @vitest-environment happy-dom
// =============================================================================
// Sidebar (grouped student navigation) — Unit tests
// Feature: student-experience-remediation, Task 22.4
// Validates: Requirements 20.3, 20.5, 23.1, 23.4
// -----------------------------------------------------------------------------
// Task 22.2 made `Sidebar.tsx` render the student navigation as labeled,
// ordered sections (Learn / Growth / Community / Tools) with within-group
// active-state indication. Task 22.3 made the "Surveys" item conditional on
// `useSurveyAssignmentsCount() > 0` and de-emphasized "My Content" (sunk to the
// bottom of its group with subdued styling).
//
// These tests verify the *rendering* behavior of the Sidebar against those
// requirements:
//   - R20.3 — items render under bilingual group section labels (not a flat list)
//   - R20.5 — the active route is indicated within its group
//   - R23.1 — Surveys is hidden when the assigned count is 0 and shown when > 0
//   - R23.4 — a conditionally-hidden item leaves no gap/placeholder, and a group
//             left with no visible items renders no section header
//
// `navItems`, `useAuth`, and `useSurveyAssignmentsCount` are mocked so each
// scenario (grouping, active route, survey count, empty section) is exercised
// deterministically. A separate assertion pins the *real* student nav config to
// the four groups so the rendering tests stay anchored to production data.
// =============================================================================

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, within, cleanup } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter } from "react-router-dom";
import { Circle } from "lucide-react";

import i18n from "@/lib/i18n";
import enCommon from "@/locales/en/common.json";
import arCommon from "@/locales/ar/common.json";
import type { NavItem } from "@/lib/navItems";
import { NAV_GROUPS } from "@/lib/navGroups";

// ─── Mutable mock state (hoisted so the mock factories can close over it) ─────

const mockState = vi.hoisted(() => ({
  navItems: { student: [] } as Record<string, unknown[]>,
  profile: { role: "student" } as { role: string } | null,
  surveyData: 0 as number | undefined,
}));

// The Sidebar reads `navItems[role]` on every render, so mutating
// `mockState.navItems.student` between renders changes what it sees.
vi.mock("@/lib/navItems", () => ({
  navItems: mockState.navItems,
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ profile: mockState.profile }),
}));

vi.mock("@/hooks/useSurveyAssignmentsCount", () => ({
  useSurveyAssignmentsCount: () => ({ data: mockState.surveyData }),
}));

// SidebarContext is left REAL — the Sidebar only needs its `close` callback,
// which the default context value supplies, and rendering exercises the real
// provider below.
import Sidebar from "@/components/shared/Sidebar";
import { SidebarProvider } from "@/components/shared/SidebarContext";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const G = enCommon.nav.groups;
const L = enCommon.nav;

/**
 * A realistic student nav covering all four groups. Mirrors the production
 * grouping shape (Learn includes the de-emphasized "My Content"; Tools holds
 * the conditional "Surveys" alongside other items) so the rendering tests run
 * against production-like data.
 */
const fullStudentNav = (): NavItem[] => [
  {
    to: "/student/dashboard",
    labelKey: "nav.dashboard",
    icon: Circle,
    group: "learn",
  },
  {
    to: "/student/courses",
    labelKey: "nav.courses",
    icon: Circle,
    group: "learn",
  },
  {
    to: "/student/tutor",
    labelKey: "nav.aiTutor",
    icon: Circle,
    group: "learn",
  },
  {
    to: "/student/content",
    labelKey: "nav.myContent",
    icon: Circle,
    group: "learn",
    deEmphasized: true,
  },
  {
    to: "/student/progress",
    labelKey: "nav.progress",
    icon: Circle,
    group: "growth",
  },
  {
    to: "/student/challenges",
    labelKey: "nav.challenges",
    icon: Circle,
    group: "growth",
  },
  {
    to: "/student/habits",
    labelKey: "nav.habits",
    icon: Circle,
    group: "growth",
  },
  {
    to: "/student/leaderboard",
    labelKey: "nav.leaderboard",
    icon: Circle,
    group: "community",
  },
  {
    to: "/student/team",
    labelKey: "nav.myTeam",
    icon: Circle,
    group: "community",
  },
  {
    to: "/student/planner",
    labelKey: "nav.planner",
    icon: Circle,
    group: "tools",
  },
  {
    to: "/student/journal",
    labelKey: "nav.journal",
    icon: Circle,
    group: "tools",
  },
  {
    to: "/student/surveys",
    labelKey: "nav.surveys",
    icon: Circle,
    group: "tools",
  },
];

/**
 * A nav where the Tools group contains ONLY the conditional Surveys item, so
 * hiding Surveys (count 0) empties the group entirely — used to prove an empty
 * section renders no header (R23.4).
 */
const surveyOnlyToolsNav = (): NavItem[] => [
  {
    to: "/student/dashboard",
    labelKey: "nav.dashboard",
    icon: Circle,
    group: "learn",
  },
  {
    to: "/student/courses",
    labelKey: "nav.courses",
    icon: Circle,
    group: "learn",
  },
  {
    to: "/student/surveys",
    labelKey: "nav.surveys",
    icon: Circle,
    group: "tools",
  },
];

const renderSidebar = (initialPath = "/student/marketplace") =>
  render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter initialEntries={[initialPath]}>
        <SidebarProvider>
          <Sidebar />
        </SidebarProvider>
      </MemoryRouter>
    </I18nextProvider>
  );

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeEach(async () => {
  await i18n.changeLanguage("en");
  mockState.navItems.student = fullStudentNav();
  mockState.profile = { role: "student" };
  mockState.surveyData = 0;
});

afterEach(() => {
  cleanup();
});

// ─── R20.3: grouped section labels ────────────────────────────────────────────

describe("Sidebar grouping (R20.3)", () => {
  it("renders student items under their four labeled sections rather than a flat list", () => {
    mockState.surveyData = 1; // show everything so all groups are populated
    renderSidebar();

    // Each section is an ARIA group named by its bilingual section label.
    for (const label of [G.learn, G.growth, G.community, G.tools]) {
      expect(screen.getByRole("group", { name: label })).toBeInTheDocument();
    }

    // The Learn section actually contains its learning items.
    const learn = screen.getByRole("group", { name: G.learn });
    expect(
      within(learn).getByRole("link", { name: /Courses/i })
    ).toBeInTheDocument();
    expect(
      within(learn).getByRole("link", { name: /AI Tutor/i })
    ).toBeInTheDocument();
  });

  it("renders the section labels in Arabic when the language switches (bilingual labels)", async () => {
    await i18n.changeLanguage("ar");
    mockState.surveyData = 1;
    renderSidebar();

    const ar = arCommon.nav.groups;
    for (const label of [ar.learn, ar.growth, ar.community, ar.tools]) {
      expect(screen.getByRole("group", { name: label })).toBeInTheDocument();
    }
  });

  it("sinks the de-emphasized 'My Content' to the bottom of its group with subdued styling (R23.3)", () => {
    renderSidebar();

    const learn = screen.getByRole("group", { name: G.learn });
    const learnLinks = within(learn).getAllByRole("link");
    const lastLink = learnLinks[learnLinks.length - 1];
    if (!lastLink)
      throw new Error("expected at least one item in the Learn group");

    expect(lastLink).toHaveTextContent(L.myContent);
    // Subdued color class distinguishes de-emphasized items from core items.
    expect(lastLink.getAttribute("class")).toContain("text-gray-400");
  });
});

// ─── R20.5: active-state indication within the group ──────────────────────────

describe("Sidebar active state (R20.5)", () => {
  it("indicates the active route within its group and not on other items", () => {
    renderSidebar("/student/courses");

    const learn = screen.getByRole("group", { name: G.learn });
    const coursesLink = within(learn).getByRole("link", { name: /Courses/i });

    // Active styling + an accessible current-page indicator.
    expect(coursesLink.getAttribute("class")).toContain("bg-blue-50");
    expect(coursesLink.getAttribute("class")).toContain("text-blue-600");
    expect(within(coursesLink).getByText("(current page)")).toBeInTheDocument();

    // A sibling item in the same group is not marked active.
    const tutorLink = within(learn).getByRole("link", { name: /AI Tutor/i });
    expect(tutorLink.getAttribute("class")).not.toContain("bg-blue-50");
    expect(
      within(tutorLink).queryByText("(current page)")
    ).not.toBeInTheDocument();
  });

  it("marks exactly one item active for the current route", () => {
    renderSidebar("/student/progress");

    const currentMarkers = screen.getAllByText("(current page)");
    expect(currentMarkers).toHaveLength(1);

    const growth = screen.getByRole("group", { name: G.growth });
    expect(within(growth).getByText("(current page)")).toBeInTheDocument();
  });
});

// ─── R23.1: conditional Surveys visibility ────────────────────────────────────

describe("Sidebar conditional Surveys item (R23.1)", () => {
  it("hides Surveys when the assigned count is 0", () => {
    mockState.surveyData = 0;
    renderSidebar();

    expect(
      screen.queryByRole("link", { name: /Surveys/i })
    ).not.toBeInTheDocument();
  });

  it("hides Surveys while the count is still loading (undefined)", () => {
    mockState.surveyData = undefined;
    renderSidebar();

    expect(
      screen.queryByRole("link", { name: /Surveys/i })
    ).not.toBeInTheDocument();
  });

  it("shows Surveys (inside the Tools group) when the count is greater than 0", () => {
    mockState.surveyData = 3;
    renderSidebar();

    const tools = screen.getByRole("group", { name: G.tools });
    expect(
      within(tools).getByRole("link", { name: /Surveys/i })
    ).toBeInTheDocument();
  });
});

// ─── R23.4: no gap for hidden items; no header for empty sections ─────────────

describe("Sidebar hidden-item rendering (R23.4)", () => {
  it("leaves no gap or placeholder where the hidden Surveys item would have been", () => {
    // Hidden: 11 of 12 items render (Surveys removed), with no empty node left.
    mockState.surveyData = 0;
    const { rerender } = renderSidebar();

    expect(screen.getAllByRole("link")).toHaveLength(11);

    const tools = screen.getByRole("group", { name: G.tools });
    const hiddenToolLabels = within(tools)
      .getAllByRole("link")
      .map((link) => link.textContent?.trim());
    expect(hiddenToolLabels).toEqual([L.planner, L.journal]);

    // Showing the item simply adds it back contiguously — no shifting gap.
    mockState.surveyData = 2;
    rerender(
      <I18nextProvider i18n={i18n}>
        <MemoryRouter initialEntries={["/student/marketplace"]}>
          <SidebarProvider>
            <Sidebar />
          </SidebarProvider>
        </MemoryRouter>
      </I18nextProvider>
    );

    expect(screen.getAllByRole("link")).toHaveLength(12);
    const shownToolLabels = within(screen.getByRole("group", { name: G.tools }))
      .getAllByRole("link")
      .map((link) => link.textContent?.trim());
    expect(shownToolLabels).toEqual([L.planner, L.journal, L.surveys]);
  });

  it("renders no section header for a group left with no visible items", () => {
    // Tools holds only the conditional Surveys item here.
    mockState.navItems.student = surveyOnlyToolsNav();

    mockState.surveyData = 0;
    renderSidebar();

    // Empty Tools group → no header, no group, and no Surveys link.
    expect(
      screen.queryByRole("group", { name: G.tools })
    ).not.toBeInTheDocument();
    expect(screen.queryByText(G.tools)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /Surveys/i })
    ).not.toBeInTheDocument();

    // The populated Learn group still renders its header.
    expect(screen.getByRole("group", { name: G.learn })).toBeInTheDocument();
  });

  it("renders the Tools header once the group has a visible item", () => {
    mockState.navItems.student = surveyOnlyToolsNav();
    mockState.surveyData = 1;
    renderSidebar();

    const tools = screen.getByRole("group", { name: G.tools });
    expect(
      within(tools).getByRole("link", { name: /Surveys/i })
    ).toBeInTheDocument();
  });
});

// ─── Config integrity: anchor the rendering tests to the real student nav ─────

describe("Real student navigation config (R20.3 anchor)", () => {
  it("assigns every student nav item to one of the four defined groups", async () => {
    const actual = await vi.importActual<typeof import("@/lib/navItems")>(
      "@/lib/navItems"
    );
    const student = actual.navItems.student;

    expect(student.length).toBeGreaterThan(0);
    for (const item of student) {
      expect(NAV_GROUPS).toContain(item.group);
    }

    // All four groups are represented in the production student navigation.
    const usedGroups = new Set(student.map((item) => item.group));
    expect(usedGroups).toEqual(new Set(NAV_GROUPS));
  });
});

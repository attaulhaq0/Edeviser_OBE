// @vitest-environment happy-dom
// =============================================================================
// CoordinatorDashboard — "Program health, prepared" feed (prototype rebuild P2.4)
// Smoke + real-data wiring against the rebuilt CoordinatorDashboardScreen (via
// the route page re-export): hero, KPI filter row (programs count + avg
// attainment + below-target count), attainment alerts (real below-target PLO),
// CQI timeline (useCQIPlans), program timeline (useAcademicCalendarEvents).
// =============================================================================

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en", changeLanguage: () => Promise.resolve() },
  }),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ institutionId: "inst-1" }),
}));

vi.mock("@/hooks/useCoordinatorDashboardAggregate", () => ({
  useCoordinatorDashboardAggregate: () => ({
    data: { avgAttainmentPercent: 73 },
    isPending: false,
  }),
}));

vi.mock("@/hooks/usePrograms", () => ({
  usePrograms: () => ({
    data: { data: [{ id: "a" }, { id: "b" }, { id: "c" }] },
  }),
}));

// Real outcome attainment → Below Target KPI + attainment alerts. One PLO
// (PLO B) is below the 70% threshold so the alert path renders.
vi.mock("@/hooks/useCoordinatorOutcomeAttainment", () => ({
  useCoordinatorOutcomeAttainment: () => ({
    data: {
      successThreshold: 70,
      ilos: [],
      plos: [
        {
          id: "p1",
          title: "PLO A",
          description: null,
          attainment: 82,
          status: "onTrack",
          contributingClos: [],
          weakestCourse: null,
          affectedStudents: 0,
          cohortPercent: 0,
        },
        {
          id: "p2",
          title: "PLO B",
          description: null,
          attainment: 60,
          status: "watch",
          contributingClos: [],
          weakestCourse: { code: "CS205", attainment: 55 },
          affectedStudents: 5,
          cohortPercent: 17,
        },
      ],
    },
    isPending: false,
  }),
}));

vi.mock("@/hooks/useCoordinatorAiInsights", () => ({
  // Null by default → AI narrative line hidden (graceful, function not deployed).
  useCoordinatorAiInsights: () => ({ data: null }),
}));

vi.mock("@/hooks/useCoordinatorAccreditation", () => ({
  // Null → dashboard "Accred. Ready" KPI + rail render "—" (graceful).
  useCoordinatorAccreditationReadiness: () => ({ data: null }),
  useAccreditationApprovals: () => ({ data: [] }),
}));

vi.mock("@/hooks/useCQIPlans", () => ({
  useCQIPlans: () => ({
    data: [
      {
        id: "c1",
        action_description: "Improve REST API remediation",
        status: "in_progress",
        due_date: null,
        created_at: "2026-05-31T00:00:00Z",
      },
    ],
    isPending: false,
  }),
}));

vi.mock("@/hooks/useAcademicCalendar", () => ({
  useAcademicCalendarEvents: () => ({
    data: [
      {
        id: "e1",
        title: "Final Examinations",
        event_type: "exam_period",
        start_date: "2025-12-08",
        end_date: "2025-12-12",
      },
      {
        id: "e2",
        title: "New Academic Year Orientation",
        event_type: "registration",
        start_date: "2026-08-24",
        end_date: "2026-08-24",
      },
    ],
    isPending: false,
  }),
}));

import CoordinatorDashboard from "@/pages/coordinator/CoordinatorDashboard";

const renderDash = () =>
  render(
    <MemoryRouter>
      <CoordinatorDashboard />
    </MemoryRouter>
  );

describe("CoordinatorDashboard (prototype rebuild)", () => {
  it("renders the action-hub hero and attainment alerts section", () => {
    renderDash();
    expect(screen.getByText("dashboard.hub.title")).toBeInTheDocument();
    expect(screen.getByText("dashboard.alerts.title")).toBeInTheDocument();
  });

  it("wires the programs count (usePrograms) into the KPI row", () => {
    renderDash();
    expect(screen.getByText("dashboard.kpi.programs")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument(); // 3 mocked programs
  });

  it("wires avg PLO attainment (aggregate hook) into the KPI row", () => {
    renderDash();
    expect(screen.getByText("dashboard.kpi.avgPlo")).toBeInTheDocument();
    expect(screen.getByText("73%")).toBeInTheDocument();
  });

  it("wires the real below-target PLO count and surfaces it as an alert", () => {
    renderDash();
    expect(screen.getByText("dashboard.kpi.belowTarget")).toBeInTheDocument();
    // Exactly one PLO (PLO B at 60%) is below the 70% threshold.
    expect(screen.getByText("1")).toBeInTheDocument();
    // The below-target PLO surfaces as an alert row.
    expect(screen.getByText("PLO B")).toBeInTheDocument();
  });

  it("wires the CQI timeline from useCQIPlans", () => {
    renderDash();
    expect(
      screen.getByText("Improve REST API remediation")
    ).toBeInTheDocument();
  });

  it("wires the program timeline from academic calendar events", () => {
    renderDash();
    expect(screen.getByText("Final Examinations")).toBeInTheDocument();
    expect(
      screen.getByText("New Academic Year Orientation")
    ).toBeInTheDocument();
  });

  it("renders KPI cards as navigable filter links", () => {
    renderDash();
    const links = screen.getAllByRole("link");
    expect(links.length).toBeGreaterThan(0);
  });
});

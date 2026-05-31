// =============================================================================
// Unit Tests — SuggestedSessionItem + WeeklyCalendarGrid suggestion rendering
// Verifies that empty days surface a localized suggested study session instead
// of a bare "No items" label (R19.2), with copy routed through i18next.
// =============================================================================

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";

import i18n from "@/lib/i18n";
import SuggestedSessionItem from "@/components/shared/SuggestedSessionItem";
import WeeklyCalendarGrid from "@/components/shared/WeeklyCalendarGrid";
import { buildPlannerWeek } from "@/lib/weeklyPlannerContent";
import type { SuggestedStudySession } from "@/types/planner";

const wrap = (ui: React.ReactNode) => (
  <I18nextProvider i18n={i18n}>{ui}</I18nextProvider>
);

const makeSuggestion = (
  overrides: Partial<SuggestedStudySession> = {}
): SuggestedStudySession => ({
  id: "suggestion-2025-06-18",
  date: "2025-06-18",
  courseId: "course-1",
  courseName: "Math 101",
  durationMinutes: 25,
  ...overrides,
});

describe("SuggestedSessionItem", () => {
  it("renders the course-scoped heading and duration", () => {
    render(wrap(<SuggestedSessionItem suggestion={makeSuggestion()} />));
    expect(screen.getByText(/Math 101/)).toBeInTheDocument();
    expect(screen.getByText(/25 min focus block/)).toBeInTheDocument();
  });

  it("renders a generic label when no course is attached", () => {
    render(
      wrap(
        <SuggestedSessionItem
          suggestion={makeSuggestion({ courseId: null, courseName: null })}
        />
      )
    );
    expect(screen.getByText("Suggested study session")).toBeInTheDocument();
  });

  it("invokes onPlan when the plan button is clicked", async () => {
    const user = userEvent.setup();
    const onPlan = vi.fn();
    const suggestion = makeSuggestion();
    render(
      wrap(<SuggestedSessionItem suggestion={suggestion} onPlan={onPlan} />)
    );

    await user.click(screen.getByRole("button", { name: /plan a 25 minute/i }));
    expect(onPlan).toHaveBeenCalledWith(suggestion);
  });

  it("renders no action button when onPlan is omitted", () => {
    render(wrap(<SuggestedSessionItem suggestion={makeSuggestion()} />));
    expect(screen.queryByRole("button")).toBeNull();
  });
});

describe("WeeklyCalendarGrid with derived suggestions", () => {
  it("shows suggestions on empty days instead of 'No items'", () => {
    const weekData = buildPlannerWeek({
      weekStartDate: "2025-06-16",
      todayStr: "2025-06-16",
      sessions: [],
      tasks: [],
      deadlines: [],
      courses: [{ id: "course-1", name: "Math 101" }],
    });

    render(wrap(<WeeklyCalendarGrid weekData={weekData} today="2025-06-16" />));

    // Every empty day now has a suggestion → no "No items" placeholders remain
    expect(screen.queryByText("No items")).toBeNull();
    // Suggested cards are present (desktop renders all 7)
    const suggested = screen.getAllByTestId("suggested-session");
    expect(suggested.length).toBeGreaterThanOrEqual(7);
  });
});

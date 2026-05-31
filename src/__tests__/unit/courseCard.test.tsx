// =============================================================================
// CourseCard — Unit tests (Task 16.3)
// Covers the enriched student "My Courses" card variants from Task 16.1:
//  - a card with a due date renders the formatted due date (R9.2)
//  - a card whose next assignment has no due date renders name-only (R9.2a)
//  - a card with no upcoming work renders the neutral indicator (R9.5)
//  - a null course color falls back to a deterministic accent (R9.3)
// =============================================================================

import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { I18nextProvider } from "react-i18next";
import i18n from "@/lib/i18n";
import CourseCard from "@/pages/student/courses/CourseCard";
import { formatLocalDate } from "@/lib/formatDate";
import { resolveCourseColor, COURSE_COLOR_PALETTE } from "@/lib/courseColor";
import type { EnrolledCourseCard } from "@/lib/studentCourseCards";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const makeCourse = (
  overrides: Partial<EnrolledCourseCard> = {}
): EnrolledCourseCard => ({
  id: "course-1",
  name: "Intro to Biology",
  code: "BIO101",
  teacher_name: "Ms. Smith",
  attainment_percent: 78,
  progress_percent: 50,
  next_assignment: null,
  color: null,
  assignments_count: 4,
  ...overrides,
});

const renderCard = (course: EnrolledCourseCard) =>
  render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>
        <CourseCard course={course} />
      </MemoryRouter>
    </I18nextProvider>
  );

/** The accent bar is the only `<div aria-hidden="true">`; icons are SVGs. */
const getAccentColor = (container: HTMLElement): string | undefined =>
  container.querySelector<HTMLElement>('div[aria-hidden="true"]')?.style
    .backgroundColor;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("CourseCard", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("shows the next assignment with its formatted due date (R9.2)", () => {
    const dueAt = "2025-06-03T12:00:00.000Z";
    renderCard(
      makeCourse({
        next_assignment: { title: "Cell Structure Essay", due_at: dueAt },
      })
    );

    expect(screen.getByText("Cell Structure Essay")).toBeInTheDocument();
    // Format through the same locale-aware helper the component uses so the
    // assertion is timezone-independent.
    expect(
      screen.getByText(`Due ${formatLocalDate(dueAt, "MMM d, yyyy")}`)
    ).toBeInTheDocument();
    expect(screen.queryByText("No due date")).not.toBeInTheDocument();
    expect(screen.queryByText("No upcoming work")).not.toBeInTheDocument();
  });

  it("shows the next assignment name-only when it has no due date (R9.2a)", () => {
    renderCard(
      makeCourse({
        next_assignment: { title: "Lab Reflection", due_at: null },
      })
    );

    expect(screen.getByText("Lab Reflection")).toBeInTheDocument();
    expect(screen.getByText("No due date")).toBeInTheDocument();
    // No "Due <date>" line is rendered when there is no due date.
    expect(screen.queryByText(/^Due /)).not.toBeInTheDocument();
  });

  it("shows the neutral indicator when there is no upcoming work (R9.5)", () => {
    renderCard(makeCourse({ next_assignment: null }));

    expect(screen.getByText("No upcoming work")).toBeInTheDocument();
    expect(screen.queryByText("No due date")).not.toBeInTheDocument();
  });

  it("falls back to a deterministic accent color when color is null (R9.3)", () => {
    const { container } = renderCard(
      makeCourse({ id: "course-xyz", color: null })
    );

    const expected = resolveCourseColor(null, "course-xyz");
    // The deterministic fallback is always one of the brand palette colors.
    expect(COURSE_COLOR_PALETTE).toContain(expected);
    expect(getAccentColor(container)).toBe(expected);
  });

  it("renders the same fallback accent for the same id across renders (R9.3)", () => {
    const first = renderCard(makeCourse({ id: "stable-id", color: null }));
    const firstColor = getAccentColor(first.container);
    first.unmount();

    const second = renderCard(makeCourse({ id: "stable-id", color: null }));
    expect(getAccentColor(second.container)).toBe(firstColor);
  });

  it("uses the stored hex color when one is assigned (R9.3)", () => {
    const { container } = renderCard(makeCourse({ color: "#14b8a6" }));
    expect(getAccentColor(container)).toBe("#14b8a6");
  });
});

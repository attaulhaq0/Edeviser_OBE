import { describe, it, expect } from "vitest";
import {
  buildCourseCards,
  type BuildCourseCardsInput,
  type CourseCardEnrollment,
} from "@/lib/studentCourseCards";

const NOW = new Date("2025-06-01T00:00:00.000Z");

const course = (
  id: string,
  overrides: Partial<CourseCardEnrollment["course"]> = {}
): CourseCardEnrollment => ({
  course_id: id,
  course: {
    id,
    name: `Course ${id}`,
    code: `C-${id}`,
    color: null,
    teacher_name: "Ms. Smith",
    ...overrides,
  },
});

const baseInput = (
  overrides: Partial<BuildCourseCardsInput> = {}
): BuildCourseCardsInput => ({
  enrollments: [course("a")],
  attainmentRows: [],
  assignmentRows: [],
  completedAssignmentIds: new Set<string>(),
  now: NOW,
  ...overrides,
});

describe("buildCourseCards", () => {
  it("returns an empty array when there are no enrollments", () => {
    expect(buildCourseCards(baseInput({ enrollments: [] }))).toEqual([]);
  });

  it("maps course identity including color (R9.3, R9.4)", () => {
    const card = buildCourseCards(
      baseInput({ enrollments: [course("a", { color: "#3b82f6" })] })
    )[0]!;
    expect(card.id).toBe("a");
    expect(card.color).toBe("#3b82f6");
    expect(card.teacher_name).toBe("Ms. Smith");
  });

  it("preserves a null color for deterministic fallback downstream (R9.3)", () => {
    const card = buildCourseCards(baseInput())[0]!;
    expect(card.color).toBeNull();
  });

  it("averages and rounds course-scoped attainment", () => {
    const card = buildCourseCards(
      baseInput({
        attainmentRows: [
          { course_id: "a", attainment_percent: 80 },
          { course_id: "a", attainment_percent: 85 },
        ],
      })
    )[0]!;
    // (80 + 85) / 2 = 82.5 → 83
    expect(card.attainment_percent).toBe(83);
  });

  it("returns null attainment when no rows exist", () => {
    const card = buildCourseCards(baseInput())[0]!;
    expect(card.attainment_percent).toBeNull();
  });

  it("computes progress from graded submissions over total assignments (R9.1)", () => {
    const card = buildCourseCards(
      baseInput({
        assignmentRows: [
          { id: "a1", course_id: "a", title: "A1", due_date: null },
          { id: "a2", course_id: "a", title: "A2", due_date: null },
          { id: "a3", course_id: "a", title: "A3", due_date: null },
          { id: "a4", course_id: "a", title: "A4", due_date: null },
        ],
        completedAssignmentIds: new Set(["a1", "a2"]),
      })
    )[0]!;
    expect(card.assignments_count).toBe(4);
    expect(card.progress_percent).toBe(50);
  });

  it("reports zero progress when a course has no assignments (R9.5)", () => {
    const card = buildCourseCards(baseInput())[0]!;
    expect(card.assignments_count).toBe(0);
    expect(card.progress_percent).toBe(0);
    expect(card.next_assignment).toBeNull();
  });

  it("selects the earliest upcoming assignment as next (R9.2)", () => {
    const card = buildCourseCards(
      baseInput({
        assignmentRows: [
          {
            id: "a1",
            course_id: "a",
            title: "Later",
            due_date: "2025-06-10T00:00:00.000Z",
          },
          {
            id: "a2",
            course_id: "a",
            title: "Sooner",
            due_date: "2025-06-03T00:00:00.000Z",
          },
        ],
      })
    )[0]!;
    expect(card.next_assignment).toEqual({
      title: "Sooner",
      due_at: "2025-06-03T00:00:00.000Z",
    });
  });

  it("ignores past-due assignments when choosing next", () => {
    const card = buildCourseCards(
      baseInput({
        assignmentRows: [
          {
            id: "past",
            course_id: "a",
            title: "Past",
            due_date: "2025-05-01T00:00:00.000Z",
          },
          {
            id: "future",
            course_id: "a",
            title: "Future",
            due_date: "2025-06-15T00:00:00.000Z",
          },
        ],
      })
    )[0]!;
    expect(card.next_assignment?.title).toBe("Future");
  });

  it("includes an assignment without a due date as a name-only fallback (R9.2a)", () => {
    const card = buildCourseCards(
      baseInput({
        assignmentRows: [
          { id: "a1", course_id: "a", title: "Undated", due_date: null },
        ],
      })
    )[0]!;
    expect(card.next_assignment).toEqual({ title: "Undated", due_at: null });
  });

  it("prefers a dated upcoming assignment over an undated one", () => {
    const card = buildCourseCards(
      baseInput({
        assignmentRows: [
          { id: "a1", course_id: "a", title: "Undated", due_date: null },
          {
            id: "a2",
            course_id: "a",
            title: "Dated",
            due_date: "2025-06-05T00:00:00.000Z",
          },
        ],
      })
    )[0]!;
    expect(card.next_assignment?.title).toBe("Dated");
  });

  it("returns null next assignment when all dated assignments are past due", () => {
    const card = buildCourseCards(
      baseInput({
        assignmentRows: [
          {
            id: "a1",
            course_id: "a",
            title: "Past",
            due_date: "2025-05-01T00:00:00.000Z",
          },
        ],
      })
    )[0]!;
    expect(card.next_assignment).toBeNull();
  });

  it("aggregates each course independently without cross-contamination", () => {
    const cards = buildCourseCards(
      baseInput({
        enrollments: [course("a"), course("b")],
        attainmentRows: [{ course_id: "a", attainment_percent: 90 }],
        assignmentRows: [
          { id: "a1", course_id: "a", title: "A1", due_date: null },
          { id: "b1", course_id: "b", title: "B1", due_date: null },
          { id: "b2", course_id: "b", title: "B2", due_date: null },
        ],
        completedAssignmentIds: new Set(["b1"]),
      })
    );
    const cardA = cards.find((c) => c.id === "a")!;
    const cardB = cards.find((c) => c.id === "b")!;
    expect(cardA.attainment_percent).toBe(90);
    expect(cardA.assignments_count).toBe(1);
    expect(cardA.progress_percent).toBe(0);
    expect(cardB.attainment_percent).toBeNull();
    expect(cardB.assignments_count).toBe(2);
    expect(cardB.progress_percent).toBe(50);
  });
});

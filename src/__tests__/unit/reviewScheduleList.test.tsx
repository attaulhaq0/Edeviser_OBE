// =============================================================================
// ReviewScheduleList — Unit tests
// Validates: Task 18.3 — List of pending reviews with Start/Skip actions
// =============================================================================

import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReviewScheduleList } from "@/components/shared/ReviewScheduleList";
import type { ReviewSchedule } from "@/types/planner";

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeReview(overrides: Partial<ReviewSchedule> = {}): ReviewSchedule {
  return {
    id: "rev-1",
    studentId: "stu-1",
    cloId: "clo-abc",
    courseId: "course-xyz",
    sourceSessionId: "sess-1",
    reviewDate: "2025-07-01",
    intervalDays: 1,
    status: "pending",
    reviewSessionId: null,
    createdAt: "2025-06-30T10:00:00Z",
    updatedAt: "2025-06-30T10:00:00Z",
    ...overrides,
  };
}

const noop = () => {};

// ── Empty state ─────────────────────────────────────────────────────────────

describe("ReviewScheduleList — Empty state", () => {
  it("renders empty state when no reviews are provided", () => {
    render(
      <ReviewScheduleList
        reviews={[]}
        onStartReview={noop}
        onSkipReview={noop}
      />
    );
    expect(screen.getByText("No reviews scheduled")).toBeInTheDocument();
    expect(
      screen.getByText(/Complete study sessions linked to CLOs/)
    ).toBeInTheDocument();
  });

  it("does not render the list container when empty", () => {
    render(
      <ReviewScheduleList
        reviews={[]}
        onStartReview={noop}
        onSkipReview={noop}
      />
    );
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });
});

// ── Pending reviews ─────────────────────────────────────────────────────────

describe("ReviewScheduleList — Pending reviews", () => {
  it("renders a list item for each review", () => {
    const reviews = [
      makeReview({ id: "r1", intervalDays: 1 }),
      makeReview({ id: "r2", intervalDays: 3 }),
      makeReview({ id: "r3", intervalDays: 7 }),
    ];
    render(
      <ReviewScheduleList
        reviews={reviews}
        onStartReview={noop}
        onSkipReview={noop}
      />
    );
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(3);
  });

  it("shows ReviewSessionBadge with correct interval label", () => {
    render(
      <ReviewScheduleList
        reviews={[makeReview({ intervalDays: 3 })]}
        onStartReview={noop}
        onSkipReview={noop}
      />
    );
    expect(screen.getByText("Day 3 Review")).toBeInTheDocument();
  });

  it("shows CLO ID and course ID", () => {
    render(
      <ReviewScheduleList
        reviews={[makeReview({ cloId: "clo-123", courseId: "course-456" })]}
        onStartReview={noop}
        onSkipReview={noop}
      />
    );
    expect(screen.getByText(/clo-123/)).toBeInTheDocument();
    expect(screen.getByText(/course-456/)).toBeInTheDocument();
  });

  it("shows review date", () => {
    render(
      <ReviewScheduleList
        reviews={[makeReview({ reviewDate: "2025-07-15" })]}
        onStartReview={noop}
        onSkipReview={noop}
      />
    );
    expect(screen.getByText(/2025-07-15/)).toBeInTheDocument();
  });

  it("shows Start and Skip buttons for pending reviews", () => {
    render(
      <ReviewScheduleList
        reviews={[makeReview()]}
        onStartReview={noop}
        onSkipReview={noop}
      />
    );
    expect(screen.getByRole("button", { name: /start/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /skip/i })).toBeInTheDocument();
  });

  it("calls onStartReview with the review when Start is clicked", async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    const review = makeReview({ id: "r-start" });
    render(
      <ReviewScheduleList
        reviews={[review]}
        onStartReview={onStart}
        onSkipReview={noop}
      />
    );
    await user.click(screen.getByRole("button", { name: /start/i }));
    expect(onStart).toHaveBeenCalledOnce();
    expect(onStart).toHaveBeenCalledWith(review);
  });

  it("calls onSkipReview with the review ID when Skip is clicked", async () => {
    const user = userEvent.setup();
    const onSkip = vi.fn();
    const review = makeReview({ id: "r-skip" });
    render(
      <ReviewScheduleList
        reviews={[review]}
        onStartReview={noop}
        onSkipReview={onSkip}
      />
    );
    await user.click(screen.getByRole("button", { name: /skip/i }));
    expect(onSkip).toHaveBeenCalledOnce();
    expect(onSkip).toHaveBeenCalledWith("r-skip");
  });

  it("disables Skip button when isSkipping is true", () => {
    render(
      <ReviewScheduleList
        reviews={[makeReview()]}
        onStartReview={noop}
        onSkipReview={noop}
        isSkipping
      />
    );
    expect(screen.getByRole("button", { name: /skip/i })).toBeDisabled();
  });
});

// ── Completed reviews ───────────────────────────────────────────────────────

describe("ReviewScheduleList — Completed reviews", () => {
  it("shows Completed label instead of action buttons", () => {
    render(
      <ReviewScheduleList
        reviews={[makeReview({ status: "completed" })]}
        onStartReview={noop}
        onSkipReview={noop}
      />
    );
    expect(screen.getByText("Completed")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /start/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /skip/i })
    ).not.toBeInTheDocument();
  });

  it("applies muted opacity to completed items", () => {
    render(
      <ReviewScheduleList
        reviews={[makeReview({ status: "completed" })]}
        onStartReview={noop}
        onSkipReview={noop}
      />
    );
    const item = screen.getByRole("listitem");
    expect(item.className).toMatch(/opacity-60/);
  });
});

// ── Skipped reviews ─────────────────────────────────────────────────────────

describe("ReviewScheduleList — Skipped reviews", () => {
  it("shows Skipped label instead of action buttons", () => {
    render(
      <ReviewScheduleList
        reviews={[makeReview({ status: "skipped" })]}
        onStartReview={noop}
        onSkipReview={noop}
      />
    );
    expect(screen.getByText("Skipped")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /start/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /skip/i })
    ).not.toBeInTheDocument();
  });

  it("applies muted opacity to skipped items", () => {
    render(
      <ReviewScheduleList
        reviews={[makeReview({ status: "skipped" })]}
        onStartReview={noop}
        onSkipReview={noop}
      />
    );
    const item = screen.getByRole("listitem");
    expect(item.className).toMatch(/opacity-60/);
  });

  it("applies line-through to CLO text for skipped reviews", () => {
    render(
      <ReviewScheduleList
        reviews={[makeReview({ status: "skipped", cloId: "clo-skip" })]}
        onStartReview={noop}
        onSkipReview={noop}
      />
    );
    const cloText = screen.getByText(/clo-skip/);
    expect(cloText.className).toMatch(/line-through/);
  });
});

// ── Mixed statuses ──────────────────────────────────────────────────────────

describe("ReviewScheduleList — Mixed statuses", () => {
  it("renders correct actions for each status in a mixed list", () => {
    const reviews = [
      makeReview({ id: "r-pending", status: "pending", intervalDays: 1 }),
      makeReview({ id: "r-completed", status: "completed", intervalDays: 3 }),
      makeReview({ id: "r-skipped", status: "skipped", intervalDays: 7 }),
    ];
    render(
      <ReviewScheduleList
        reviews={reviews}
        onStartReview={noop}
        onSkipReview={noop}
      />
    );
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(3);

    // Pending item has Start/Skip buttons
    expect(
      within(items[0]!).getByRole("button", { name: /start/i })
    ).toBeInTheDocument();
    expect(
      within(items[0]!).getByRole("button", { name: /skip/i })
    ).toBeInTheDocument();

    // Completed item has Completed label
    expect(within(items[1]!).getByText("Completed")).toBeInTheDocument();

    // Skipped item has Skipped label
    expect(within(items[2]!).getByText("Skipped")).toBeInTheDocument();
  });
});

// ── Accessibility ───────────────────────────────────────────────────────────

describe("ReviewScheduleList — Accessibility", () => {
  it("has a list role with aria-label", () => {
    render(
      <ReviewScheduleList
        reviews={[makeReview()]}
        onStartReview={noop}
        onSkipReview={noop}
      />
    );
    const list = screen.getByRole("list", { name: /review schedule/i });
    expect(list).toBeInTheDocument();
  });

  it("each review item has listitem role", () => {
    render(
      <ReviewScheduleList
        reviews={[makeReview(), makeReview({ id: "r2" })]}
        onStartReview={noop}
        onSkipReview={noop}
      />
    );
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });
});

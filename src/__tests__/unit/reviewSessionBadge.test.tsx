// =============================================================================
// ReviewSessionBadge — Unit tests
// Validates: Task 18.2 — Badge with interval label, distinct styling, status
// =============================================================================

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReviewSessionBadge } from "@/components/shared/ReviewSessionBadge";

// ── Interval labels ─────────────────────────────────────────────────────────

describe("ReviewSessionBadge — Interval labels", () => {
  it('renders "Day 1 Review" for intervalDays=1', () => {
    render(<ReviewSessionBadge intervalDays={1} status="pending" />);
    expect(screen.getByText("Day 1 Review")).toBeInTheDocument();
  });

  it('renders "Day 3 Review" for intervalDays=3', () => {
    render(<ReviewSessionBadge intervalDays={3} status="pending" />);
    expect(screen.getByText("Day 3 Review")).toBeInTheDocument();
  });

  it('renders "Day 7 Review" for intervalDays=7', () => {
    render(<ReviewSessionBadge intervalDays={7} status="pending" />);
    expect(screen.getByText("Day 7 Review")).toBeInTheDocument();
  });
});

// ── Distinct color styling per interval ─────────────────────────────────────

describe("ReviewSessionBadge — Color styling per interval", () => {
  it("applies purple theme for Day 1", () => {
    const { container } = render(
      <ReviewSessionBadge intervalDays={1} status="pending" />
    );
    const badge = container.querySelector('[data-slot="badge"]');
    expect(badge?.className).toMatch(/bg-purple-100/);
    expect(badge?.className).toMatch(/text-purple-700/);
    expect(badge?.className).toMatch(/border-purple-200/);
  });

  it("applies blue theme for Day 3", () => {
    const { container } = render(
      <ReviewSessionBadge intervalDays={3} status="pending" />
    );
    const badge = container.querySelector('[data-slot="badge"]');
    expect(badge?.className).toMatch(/bg-blue-100/);
    expect(badge?.className).toMatch(/text-blue-700/);
    expect(badge?.className).toMatch(/border-blue-200/);
  });

  it("applies green theme for Day 7", () => {
    const { container } = render(
      <ReviewSessionBadge intervalDays={7} status="pending" />
    );
    const badge = container.querySelector('[data-slot="badge"]');
    expect(badge?.className).toMatch(/bg-green-100/);
    expect(badge?.className).toMatch(/text-green-700/);
    expect(badge?.className).toMatch(/border-green-200/);
  });
});

// ── Status indicators ───────────────────────────────────────────────────────

describe("ReviewSessionBadge — Status indicators", () => {
  it("shows no icon for pending status", () => {
    const { container } = render(
      <ReviewSessionBadge intervalDays={1} status="pending" />
    );
    const svgs = container.querySelectorAll("svg");
    expect(svgs.length).toBe(0);
  });

  it("shows CheckCircle2 icon for completed status", () => {
    const { container } = render(
      <ReviewSessionBadge intervalDays={3} status="completed" />
    );
    const svgs = container.querySelectorAll("svg");
    expect(svgs.length).toBe(1);
    // The badge should still show the label text
    expect(screen.getByText("Day 3 Review")).toBeInTheDocument();
  });

  it("shows SkipForward icon for skipped status", () => {
    const { container } = render(
      <ReviewSessionBadge intervalDays={7} status="skipped" />
    );
    const svgs = container.querySelectorAll("svg");
    expect(svgs.length).toBe(1);
    expect(screen.getByText("Day 7 Review")).toBeInTheDocument();
  });

  it("applies line-through and opacity for skipped status", () => {
    const { container } = render(
      <ReviewSessionBadge intervalDays={1} status="skipped" />
    );
    const badge = container.querySelector('[data-slot="badge"]');
    expect(badge?.className).toMatch(/line-through/);
    expect(badge?.className).toMatch(/opacity-60/);
  });

  it("does not apply line-through for completed status", () => {
    const { container } = render(
      <ReviewSessionBadge intervalDays={1} status="completed" />
    );
    const badge = container.querySelector('[data-slot="badge"]');
    expect(badge?.className).not.toMatch(/line-through/);
  });

  it("does not apply line-through for pending status", () => {
    const { container } = render(
      <ReviewSessionBadge intervalDays={3} status="pending" />
    );
    const badge = container.querySelector('[data-slot="badge"]');
    expect(badge?.className).not.toMatch(/line-through/);
  });
});

// ── Custom className ────────────────────────────────────────────────────────

describe("ReviewSessionBadge — Custom className", () => {
  it("merges custom className onto the badge", () => {
    const { container } = render(
      <ReviewSessionBadge intervalDays={1} status="pending" className="mt-2" />
    );
    const badge = container.querySelector('[data-slot="badge"]');
    expect(badge?.className).toMatch(/mt-2/);
  });
});

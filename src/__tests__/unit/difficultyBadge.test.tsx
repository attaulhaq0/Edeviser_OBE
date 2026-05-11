// =============================================================================
// DifficultyBadge — Unit tests
// Validates: Requirement 4 (Question Bank Management), Task 7.2
// =============================================================================

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import DifficultyBadge from "@/components/shared/DifficultyBadge";

// ─── Color coding for difficulty ranges ──────────────────────────────────────

describe("DifficultyBadge — Color coding", () => {
  it("renders green classes for difficulty 1.0–1.9", () => {
    const { container } = render(<DifficultyBadge difficulty={1.0} />);
    const badge = container.querySelector('[class*="bg-green"]');
    expect(badge).not.toBeNull();
    expect(badge?.className).toContain("text-green");
  });

  it("renders green classes for difficulty 1.5", () => {
    const { container } = render(<DifficultyBadge difficulty={1.5} />);
    const badge = container.querySelector('[class*="bg-green"]');
    expect(badge).not.toBeNull();
  });

  it("renders blue classes for difficulty 2.0–2.9", () => {
    const { container } = render(<DifficultyBadge difficulty={2.0} />);
    const badge = container.querySelector('[class*="bg-blue"]');
    expect(badge).not.toBeNull();
    expect(badge?.className).toContain("text-blue");
  });

  it("renders blue classes for difficulty 2.5", () => {
    const { container } = render(<DifficultyBadge difficulty={2.5} />);
    const badge = container.querySelector('[class*="bg-blue"]');
    expect(badge).not.toBeNull();
  });

  it("renders yellow classes for difficulty 3.0–3.4", () => {
    const { container } = render(<DifficultyBadge difficulty={3.0} />);
    const badge = container.querySelector('[class*="bg-yellow"]');
    expect(badge).not.toBeNull();
    expect(badge?.className).toContain("text-yellow");
  });

  it("renders orange classes for difficulty 3.5–4.4", () => {
    const { container } = render(<DifficultyBadge difficulty={3.5} />);
    const badge = container.querySelector('[class*="bg-orange"]');
    expect(badge).not.toBeNull();
    expect(badge?.className).toContain("text-orange");
  });

  it("renders orange classes for difficulty 4.0", () => {
    const { container } = render(<DifficultyBadge difficulty={4.0} />);
    const badge = container.querySelector('[class*="bg-orange"]');
    expect(badge).not.toBeNull();
  });

  it("renders red classes for difficulty 4.5–5.0", () => {
    const { container } = render(<DifficultyBadge difficulty={4.5} />);
    const badge = container.querySelector('[class*="bg-red"]');
    expect(badge).not.toBeNull();
    expect(badge?.className).toContain("text-red");
  });

  it("renders red classes for difficulty 5.0", () => {
    const { container } = render(<DifficultyBadge difficulty={5.0} />);
    const badge = container.querySelector('[class*="bg-red"]');
    expect(badge).not.toBeNull();
  });
});

// ─── Formatting ──────────────────────────────────────────────────────────────

describe("DifficultyBadge — Formatting", () => {
  it("formats difficulty to 1 decimal place", () => {
    render(<DifficultyBadge difficulty={3.0} />);
    expect(screen.getByText("Difficulty: 3.0")).toBeInTheDocument();
  });

  it("formats difficulty with trailing zero", () => {
    render(<DifficultyBadge difficulty={2.0} />);
    expect(screen.getByText("Difficulty: 2.0")).toBeInTheDocument();
  });

  it("rounds to 1 decimal place", () => {
    render(<DifficultyBadge difficulty={1.456} />);
    expect(screen.getByText("Difficulty: 1.5")).toBeInTheDocument();
  });
});

// ─── Custom className ────────────────────────────────────────────────────────

describe("DifficultyBadge — className prop", () => {
  it("applies custom className", () => {
    const { container } = render(
      <DifficultyBadge difficulty={2.0} className="my-custom-class" />
    );
    const badge = container.firstElementChild;
    expect(badge?.className).toContain("my-custom-class");
  });
});

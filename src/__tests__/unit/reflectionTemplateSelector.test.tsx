// =============================================================================
// Unit Tests — ReflectionTemplateSelector, SimpleReflectionTemplate,
// GibbsReflectionTemplate, QualityFeedbackBanner, ReflectionDigestCard
// =============================================================================

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ReflectionTemplateSelector from "@/components/shared/ReflectionTemplateSelector";
import SimpleReflectionTemplate from "@/components/shared/SimpleReflectionTemplate";
import GibbsReflectionTemplate from "@/components/shared/GibbsReflectionTemplate";
import QualityFeedbackBanner from "@/components/shared/QualityFeedbackBanner";
import ReflectionDigestCard from "@/components/shared/ReflectionDigestCard";
import ReflectionStreakIndicator from "@/components/shared/ReflectionStreakIndicator";
import type {
  SimpleReflectionValues,
  GibbsReflectionValues,
  ReflectionDigest,
} from "@/types/planner";

// ─── ReflectionTemplateSelector ──────────────────────────────────────────────

describe("ReflectionTemplateSelector", () => {
  it("renders with the current value", () => {
    render(<ReflectionTemplateSelector value="free_form" onChange={vi.fn()} />);
    expect(
      screen.getByTestId("reflection-template-selector")
    ).toBeInTheDocument();
  });

  it("renders disabled state", () => {
    render(
      <ReflectionTemplateSelector value="simple" onChange={vi.fn()} disabled />
    );
    const trigger = screen.getByTestId("reflection-template-selector");
    expect(trigger).toBeDisabled();
  });
});

// ─── SimpleReflectionTemplate ────────────────────────────────────────────────

describe("SimpleReflectionTemplate", () => {
  const defaultValues: SimpleReflectionValues = {
    whatWentWell: "",
    whatWasChallenging: "",
    whatWillChange: "",
  };

  it("renders 3 text areas", () => {
    render(
      <SimpleReflectionTemplate values={defaultValues} onChange={vi.fn()} />
    );
    expect(screen.getByTestId("simple-whatWentWell")).toBeInTheDocument();
    expect(screen.getByTestId("simple-whatWasChallenging")).toBeInTheDocument();
    expect(screen.getByTestId("simple-whatWillChange")).toBeInTheDocument();
  });

  it("calls onChange with field key and value", () => {
    const onChange = vi.fn();
    render(
      <SimpleReflectionTemplate values={defaultValues} onChange={onChange} />
    );
    fireEvent.change(screen.getByTestId("simple-whatWentWell"), {
      target: { value: "Great session" },
    });
    expect(onChange).toHaveBeenCalledWith("whatWentWell", "Great session");
  });

  it("renders labels for each field", () => {
    render(
      <SimpleReflectionTemplate values={defaultValues} onChange={vi.fn()} />
    );
    expect(screen.getByText("What went well?")).toBeInTheDocument();
    expect(screen.getByText("What was challenging?")).toBeInTheDocument();
    expect(screen.getByText("What will I do differently?")).toBeInTheDocument();
  });

  it("disables all fields when disabled prop is true", () => {
    render(
      <SimpleReflectionTemplate
        values={defaultValues}
        onChange={vi.fn()}
        disabled
      />
    );
    expect(screen.getByTestId("simple-whatWentWell")).toBeDisabled();
    expect(screen.getByTestId("simple-whatWasChallenging")).toBeDisabled();
    expect(screen.getByTestId("simple-whatWillChange")).toBeDisabled();
  });
});

// ─── GibbsReflectionTemplate ─────────────────────────────────────────────────

describe("GibbsReflectionTemplate", () => {
  const defaultValues: GibbsReflectionValues = {
    description: "",
    feelings: "",
    evaluation: "",
    analysis: "",
    conclusion: "",
    actionPlan: "",
  };

  it("renders 6 text areas", () => {
    render(
      <GibbsReflectionTemplate values={defaultValues} onChange={vi.fn()} />
    );
    expect(screen.getByTestId("gibbs-description")).toBeInTheDocument();
    expect(screen.getByTestId("gibbs-feelings")).toBeInTheDocument();
    expect(screen.getByTestId("gibbs-evaluation")).toBeInTheDocument();
    expect(screen.getByTestId("gibbs-analysis")).toBeInTheDocument();
    expect(screen.getByTestId("gibbs-conclusion")).toBeInTheDocument();
    expect(screen.getByTestId("gibbs-actionPlan")).toBeInTheDocument();
  });

  it("calls onChange with field key and value", () => {
    const onChange = vi.fn();
    render(
      <GibbsReflectionTemplate values={defaultValues} onChange={onChange} />
    );
    fireEvent.change(screen.getByTestId("gibbs-description"), {
      target: { value: "I studied math" },
    });
    expect(onChange).toHaveBeenCalledWith("description", "I studied math");
  });

  it("renders numbered labels", () => {
    render(
      <GibbsReflectionTemplate values={defaultValues} onChange={vi.fn()} />
    );
    expect(screen.getByText("1. Description")).toBeInTheDocument();
    expect(screen.getByText("6. Action Plan")).toBeInTheDocument();
  });
});

// ─── QualityFeedbackBanner ───────────────────────────────────────────────────

describe("QualityFeedbackBanner", () => {
  it("renders thoughtful category", () => {
    render(<QualityFeedbackBanner category="thoughtful" />);
    expect(screen.getByText("Thoughtful reflection")).toBeInTheDocument();
  });

  it("renders good_effort category", () => {
    render(<QualityFeedbackBanner category="good_effort" />);
    expect(screen.getByText("Good effort")).toBeInTheDocument();
  });

  it("renders needs_detail category", () => {
    render(<QualityFeedbackBanner category="needs_detail" />);
    expect(screen.getByText("Try adding more detail")).toBeInTheDocument();
  });

  it("renders suggestions when provided", () => {
    render(
      <QualityFeedbackBanner
        category="needs_detail"
        suggestions={["Add more examples", "Be more specific"]}
      />
    );
    expect(screen.getByText("Add more examples")).toBeInTheDocument();
    expect(screen.getByText("Be more specific")).toBeInTheDocument();
  });

  it("has accessible role and label", () => {
    render(<QualityFeedbackBanner category="thoughtful" />);
    const banner = screen.getByTestId("quality-feedback-banner");
    expect(banner).toHaveAttribute("role", "status");
  });
});

// ─── ReflectionStreakIndicator ────────────────────────────────────────────────

describe("ReflectionStreakIndicator", () => {
  it("renders streak count", () => {
    render(<ReflectionStreakIndicator streakWeeks={5} />);
    expect(screen.getByText("5 weeks")).toBeInTheDocument();
  });

  it("uses singular for 1 week", () => {
    render(<ReflectionStreakIndicator streakWeeks={1} />);
    expect(screen.getByText("1 week")).toBeInTheDocument();
  });

  it("returns null for 0 weeks", () => {
    const { container } = render(<ReflectionStreakIndicator streakWeeks={0} />);
    expect(container.firstChild).toBeNull();
  });

  it("has accessible label", () => {
    render(<ReflectionStreakIndicator streakWeeks={3} />);
    expect(
      screen.getByLabelText("3 week reflection streak")
    ).toBeInTheDocument();
  });
});

// ─── ReflectionDigestCard ────────────────────────────────────────────────────

describe("ReflectionDigestCard", () => {
  const mockDigest: ReflectionDigest = {
    id: "digest-1",
    studentId: "student-1",
    month: "2026-03",
    themes: [
      { topic: "Time Management", count: 5 },
      { topic: "Focus", count: 3 },
    ],
    growthPatterns: [
      {
        area: "Self-awareness",
        description: "Improved recognition of study habits",
      },
    ],
    emotionalTrends: [{ label: "Confident" }, { label: "Motivated" }],
    suggestedFocus: [
      { area: "Critical Thinking", reason: "Not explored this month" },
    ],
    sharedWith: [],
    createdAt: "2026-04-01T00:00:00Z",
  };

  it("renders themes", () => {
    render(<ReflectionDigestCard digest={mockDigest} />);
    expect(screen.getByText("Time Management (5)")).toBeInTheDocument();
    expect(screen.getByText("Focus (3)")).toBeInTheDocument();
  });

  it("renders growth patterns", () => {
    render(<ReflectionDigestCard digest={mockDigest} />);
    expect(screen.getByText(/Self-awareness/)).toBeInTheDocument();
  });

  it("renders emotional trends", () => {
    render(<ReflectionDigestCard digest={mockDigest} />);
    expect(screen.getByText("Confident")).toBeInTheDocument();
    expect(screen.getByText("Motivated")).toBeInTheDocument();
  });

  it("renders suggested focus", () => {
    render(<ReflectionDigestCard digest={mockDigest} />);
    expect(screen.getByText(/Critical Thinking/)).toBeInTheDocument();
  });

  it("shows share button", () => {
    render(<ReflectionDigestCard digest={mockDigest} />);
    expect(screen.getByTestId("share-digest-button")).toBeInTheDocument();
  });

  it("shows share options when share button clicked", () => {
    render(<ReflectionDigestCard digest={mockDigest} onShare={vi.fn()} />);
    fireEvent.click(screen.getByTestId("share-digest-button"));
    expect(screen.getByTestId("share-parent-button")).toBeInTheDocument();
    expect(screen.getByTestId("share-advisor-button")).toBeInTheDocument();
    expect(screen.getByTestId("share-teacher-button")).toBeInTheDocument();
  });

  it("calls onShare when share role button clicked", () => {
    const onShare = vi.fn();
    render(<ReflectionDigestCard digest={mockDigest} onShare={onShare} />);
    fireEvent.click(screen.getByTestId("share-digest-button"));
    fireEvent.click(screen.getByTestId("share-parent-button"));
    expect(onShare).toHaveBeenCalledWith("digest-1", "parent");
  });

  it("shows shared state for already-shared roles", () => {
    const sharedDigest: ReflectionDigest = {
      ...mockDigest,
      sharedWith: [{ role: "parent", sharedAt: "2026-04-01T00:00:00Z" }],
    };
    render(
      <ReflectionDigestCard digest={sharedDigest} onRevokeShare={vi.fn()} />
    );
    fireEvent.click(screen.getByTestId("share-digest-button"));
    expect(screen.getByTestId("share-parent-button")).toHaveTextContent(
      "parent (shared)"
    );
  });
});

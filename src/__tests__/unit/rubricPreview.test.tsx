import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RubricPreview from "@/components/shared/RubricPreview";
import RubricPreviewDialog from "@/components/shared/RubricPreviewDialog";
import type { RubricWithCriteria } from "@/hooks/useRubrics";

// ---------------------------------------------------------------------------
// RubricPreviewDialog wiring (mocks must precede its import)
//
// The dialog loads its rubric through `useRubric`; mock the hook module so the
// dialog renders the fixture without any Supabase/network call. Only the
// runtime `useRubric` export is mocked — the existing RubricPreview tests above
// rely solely on the (type-only) `RubricWithCriteria` import, which is erased.
// ---------------------------------------------------------------------------

const mockUseRubric = vi.fn<
  () => {
    data: RubricWithCriteria | null | undefined;
    isLoading: boolean;
    isError: boolean;
  }
>();

vi.mock("@/hooks/useRubrics", () => ({
  useRubric: () => mockUseRubric(),
}));

// happy-dom does not implement ResizeObserver, which Radix Dialog relies on.
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("ResizeObserver", MockResizeObserver);

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const makeRubric = (
  overrides?: Partial<RubricWithCriteria>
): RubricWithCriteria => ({
  id: "rubric-1",
  title: "Essay Rubric",
  clo_id: "clo-1",
  description: null,
  created_by: null,
  is_template: false,
  created_at: "2024-01-01T00:00:00Z",
  criteria: [
    {
      id: "c1",
      rubric_id: "rubric-1",
      criterion_name: "Clarity",
      sort_order: 0,
      levels: [
        { label: "Developing", description: "Needs improvement", points: 1 },
        { label: "Proficient", description: "Meets expectations", points: 3 },
        { label: "Exemplary", description: "Exceeds expectations", points: 5 },
      ],
      max_points: 5,
    },
    {
      id: "c2",
      rubric_id: "rubric-1",
      criterion_name: "Grammar",
      sort_order: 1,
      levels: [
        { label: "Developing", description: "Many errors", points: 1 },
        { label: "Proficient", description: "Few errors", points: 3 },
        { label: "Exemplary", description: "No errors", points: 5 },
      ],
      max_points: 5,
    },
  ],
  ...overrides,
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("RubricPreview", () => {
  it("renders the rubric title", () => {
    render(<RubricPreview rubric={makeRubric()} />);
    expect(screen.getByText("Essay Rubric")).toBeInTheDocument();
  });

  it("renders criterion names", () => {
    render(<RubricPreview rubric={makeRubric()} />);
    expect(screen.getByText("Clarity")).toBeInTheDocument();
    expect(screen.getByText("Grammar")).toBeInTheDocument();
  });

  it("renders level labels in the header", () => {
    render(<RubricPreview rubric={makeRubric()} />);
    expect(screen.getByText("Developing")).toBeInTheDocument();
    expect(screen.getByText("Proficient")).toBeInTheDocument();
    expect(screen.getByText("Exemplary")).toBeInTheDocument();
  });

  it("renders level descriptions", () => {
    render(<RubricPreview rubric={makeRubric()} />);
    expect(screen.getByText("Needs improvement")).toBeInTheDocument();
    expect(screen.getByText("Meets expectations")).toBeInTheDocument();
    expect(screen.getByText("No errors")).toBeInTheDocument();
  });

  it("renders points badges for each cell", () => {
    render(<RubricPreview rubric={makeRubric()} />);
    // 6 cells total: 2 criteria × 3 levels. 1pt cells = 2, 3pt cells = 2, 5pt cells = 2
    const onePtBadges = screen.getAllByText("1 pt");
    expect(onePtBadges).toHaveLength(2);
    const fivePtBadges = screen.getAllByText("5 pts");
    expect(fivePtBadges).toHaveLength(2);
  });

  it("renders total max score in footer", () => {
    render(<RubricPreview rubric={makeRubric()} />);
    // Total = 5 + 5 = 10
    expect(screen.getByText("10")).toBeInTheDocument();
  });

  it("shows empty state when criteria array is empty", () => {
    render(<RubricPreview rubric={makeRubric({ criteria: [] })} />);
    expect(
      screen.getByText("No criteria defined for this rubric.")
    ).toBeInTheDocument();
  });

  it("shows empty state when levels array is empty", () => {
    const rubric = makeRubric({
      criteria: [
        {
          id: "c1",
          rubric_id: "rubric-1",
          criterion_name: "Test",
          sort_order: 0,
          levels: [],
          max_points: 0,
        },
      ],
    });
    render(<RubricPreview rubric={rubric} />);
    expect(
      screen.getByText("No performance levels defined.")
    ).toBeInTheDocument();
  });

  it("highlights selected cells when selectedCells is provided", () => {
    const { container } = render(
      <RubricPreview
        rubric={makeRubric()}
        selectedCells={{ c1: 2 }} // Exemplary for Clarity
      />
    );

    // The selected cell should have the blue highlight classes
    const selectedCell = container.querySelector(
      ".bg-blue-100.border-blue-500"
    );
    expect(selectedCell).toBeInTheDocument();
  });

  it("makes cells clickable when onCellClick is provided", async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(<RubricPreview rubric={makeRubric()} onCellClick={handleClick} />);

    // Click on the "Needs improvement" cell (criterion c1, level 0)
    await user.click(screen.getByText("Needs improvement"));
    expect(handleClick).toHaveBeenCalledWith("c1", 0);
  });

  it("does not make cells clickable when onCellClick is not provided", () => {
    const { container } = render(<RubricPreview rubric={makeRubric()} />);
    const clickableCells = container.querySelectorAll('[role="button"]');
    expect(clickableCells).toHaveLength(0);
  });

  it("supports keyboard activation on interactive cells", async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(<RubricPreview rubric={makeRubric()} onCellClick={handleClick} />);

    const cell = screen.getByText("Meets expectations").closest("td")!;
    cell.focus();
    await user.keyboard("{Enter}");
    expect(handleClick).toHaveBeenCalledWith("c1", 1);
  });

  it("sorts criteria by sort_order", () => {
    const rubric = makeRubric({
      criteria: [
        {
          id: "c2",
          rubric_id: "rubric-1",
          criterion_name: "Second",
          sort_order: 1,
          levels: [{ label: "L1", description: "Desc", points: 1 }],
          max_points: 1,
        },
        {
          id: "c1",
          rubric_id: "rubric-1",
          criterion_name: "First",
          sort_order: 0,
          levels: [{ label: "L1", description: "Desc", points: 1 }],
          max_points: 1,
        },
      ],
    });

    render(<RubricPreview rubric={rubric} />);
    const criterionCells = screen.getAllByText(/First|Second/);
    expect(criterionCells[0]).toHaveTextContent("First");
    expect(criterionCells[1]).toHaveTextContent("Second");
  });

  it("shows dash for empty descriptions", () => {
    const rubric = makeRubric({
      criteria: [
        {
          id: "c1",
          rubric_id: "rubric-1",
          criterion_name: "Test",
          sort_order: 0,
          levels: [{ label: "L1", description: "", points: 2 }],
          max_points: 2,
        },
      ],
    });

    render(<RubricPreview rubric={rubric} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// RubricPreviewDialog — read-only rubric preview dialog (Req 14.2, 14.3)
//
// Feature: qa-partner-review-remediation — Req 14 (P10)
// Validates: Requirements 14.2, 14.3
//
// The rubric list "Preview" action opens a read-only dialog (Req 14.2) that
// renders the rubric's criteria and performance levels with NO edit controls
// (Req 14.3). These tests render the dialog open with a mocked `useRubric` and
// assert the rubric content shows and that no Save/Edit/Delete affordances are
// present.
// ---------------------------------------------------------------------------

describe("RubricPreviewDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the rubric criteria and levels read-only when open (Req 14.2, 14.3)", () => {
    mockUseRubric.mockReturnValue({
      data: makeRubric(),
      isLoading: false,
      isError: false,
    });

    render(
      <RubricPreviewDialog
        rubricId="rubric-1"
        open={true}
        onOpenChange={vi.fn()}
      />
    );

    const dialog = screen.getByRole("dialog");
    const inDialog = within(dialog);

    // Read-only heading + the rubric content (criteria + levels) are shown.
    expect(inDialog.getByText("Rubric Preview")).toBeInTheDocument();
    expect(inDialog.getByText("Essay Rubric")).toBeInTheDocument();
    expect(inDialog.getByText("Clarity")).toBeInTheDocument();
    expect(inDialog.getByText("Grammar")).toBeInTheDocument();
    expect(inDialog.getByText("Proficient")).toBeInTheDocument();
  });

  it("exposes NO edit controls (no Save/Edit/Delete buttons) (Req 14.3)", () => {
    mockUseRubric.mockReturnValue({
      data: makeRubric(),
      isLoading: false,
      isError: false,
    });

    render(
      <RubricPreviewDialog
        rubricId="rubric-1"
        open={true}
        onOpenChange={vi.fn()}
      />
    );

    const dialog = screen.getByRole("dialog");
    const inDialog = within(dialog);

    // No mutating affordances of any kind are rendered.
    expect(
      inDialog.queryByRole("button", { name: /save/i })
    ).not.toBeInTheDocument();
    expect(
      inDialog.queryByRole("button", { name: /edit/i })
    ).not.toBeInTheDocument();
    expect(
      inDialog.queryByRole("button", { name: /delete/i })
    ).not.toBeInTheDocument();
    expect(
      inDialog.queryByRole("button", { name: /copy/i })
    ).not.toBeInTheDocument();
    // No form inputs/textboxes either — the preview is strictly read-only.
    expect(inDialog.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("does not render dialog content when closed", () => {
    mockUseRubric.mockReturnValue({
      data: makeRubric(),
      isLoading: false,
      isError: false,
    });

    render(
      <RubricPreviewDialog
        rubricId="rubric-1"
        open={false}
        onOpenChange={vi.fn()}
      />
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByText("Essay Rubric")).not.toBeInTheDocument();
  });

  it("shows a shimmer while the rubric loads", () => {
    mockUseRubric.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
    });

    render(
      <RubricPreviewDialog
        rubricId="rubric-1"
        open={true}
        onOpenChange={vi.fn()}
      />
    );

    expect(screen.getByTestId("rubric-preview-loading")).toBeInTheDocument();
  });

  it("shows a not-found empty state when the rubric is missing", () => {
    mockUseRubric.mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
    });

    render(
      <RubricPreviewDialog
        rubricId="missing"
        open={true}
        onOpenChange={vi.fn()}
      />
    );

    expect(screen.getByText("Rubric not found")).toBeInTheDocument();
  });
});

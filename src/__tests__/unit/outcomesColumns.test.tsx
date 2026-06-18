// =============================================================================
// Admin Outcomes columns — Status cell unit tests
// Feature: production-bug-fixes, Requirement 1
// -----------------------------------------------------------------------------
// `learning_outcomes` has no `is_active` column, so `row.getValue("is_active")`
// is always undefined for an ILO. The Status cell must therefore treat a missing
// value as Active (the same default the reorder view hard-codes) and only render
// "Inactive" when an explicit `is_active: false` is present. These tests lock in
// that defaulting so the badge never falsely shows "Inactive".
// =============================================================================

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

import { createColumns } from "@/pages/admin/outcomes/columns";
import type { LearningOutcome } from "@/types/app";

// `is_active` is intentionally absent from `LearningOutcome`; allow it as an
// optional override so we can exercise the explicit-false branch without
// mutating the production type.
type OutcomeRow = LearningOutcome & { is_active?: boolean };

const baseOutcome: LearningOutcome = {
  id: "ilo-1",
  type: "ILO",
  title: "Demonstrate critical thinking",
  description: null,
  institution_id: "inst-1",
  program_id: null,
  course_id: null,
  blooms_level: null,
  sort_order: 0,
  created_by: null,
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-01T00:00:00.000Z",
};

const noop = (): void => {};

// Render only the Status column cell for a single outcome row, driving the real
// TanStack Table accessor pipeline (accessorKey "is_active" -> row.getValue).
const renderStatusCell = (outcome: OutcomeRow) => {
  const Harness = () => {
    const table = useReactTable<LearningOutcome>({
      data: [outcome],
      columns: createColumns(noop, noop, false),
      getCoreRowModel: getCoreRowModel(),
    });

    const row = table.getRowModel().rows[0];
    const statusCell = row
      ?.getAllCells()
      .find((cell) => cell.column.id === "is_active");

    const cellRenderer = statusCell?.column.columnDef.cell;

    return (
      <>
        {statusCell && cellRenderer
          ? flexRender(cellRenderer, statusCell.getContext())
          : null}
      </>
    );
  };

  return render(<Harness />);
};

describe("admin outcomes Status column", () => {
  it("renders 'Active' when the row has no is_active field (R1)", () => {
    renderStatusCell(baseOutcome);

    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.queryByText("Inactive")).not.toBeInTheDocument();
  });

  it("renders 'Inactive' only when is_active is explicitly false (R1)", () => {
    renderStatusCell({ ...baseOutcome, is_active: false });

    expect(screen.getByText("Inactive")).toBeInTheDocument();
    expect(screen.queryByText("Active")).not.toBeInTheDocument();
  });
});

// =============================================================================
// HabitTracker — canonical-table wiring unit test
// Verifies the dashboard Daily Habits widget reads from the canonical
// long-format `habit_logs` table (the single source of truth every write path
// targets) and NOT the legacy wide-format `habit_tracking` table, which is no
// longer written by any flow. This guards against the split-brain regression
// where the dashboard showed stale seed data.
// =============================================================================

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { format } from "date-fns";
import HabitTracker from "@/components/shared/HabitTracker";

// ---------------------------------------------------------------------------
// supabase mock — a chainable query builder that records which table was read
// and resolves to a seeded set of habit_logs rows.
// ---------------------------------------------------------------------------

const queriedTables: string[] = [];
let mockRows: Array<{
  date: string;
  habit_type: string;
  completed_at: string | null;
  created_at: string | null;
}> = [];

vi.mock("@/lib/supabase", () => {
  const builder = () => {
    const chain: Record<string, unknown> = {};
    const methods = ["select", "eq", "gte", "lte", "order"];
    for (const m of methods) {
      chain[m] = vi.fn(() => chain);
    }
    // The query is awaited at the end of the chain (after .order()).
    chain.then = (resolve: (v: unknown) => unknown) =>
      resolve({ data: mockRows, error: null });
    return chain;
  };

  return {
    supabase: {
      from: vi.fn((table: string) => {
        queriedTables.push(table);
        return builder();
      }),
    },
  };
});

const renderWithClient = (ui: React.ReactElement) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>
  );
};

describe("HabitTracker", () => {
  beforeEach(() => {
    queriedTables.length = 0;
    mockRows = [];
  });

  it("reads from the canonical habit_logs table, not legacy habit_tracking", async () => {
    const today = format(new Date(), "yyyy-MM-dd");
    mockRows = [
      {
        date: today,
        habit_type: "login",
        completed_at: `${today}T08:00:00Z`,
        created_at: `${today}T08:00:00Z`,
      },
    ];

    renderWithClient(<HabitTracker studentId="student-1" />);

    // Wait for the query to resolve and the grid to render.
    expect(await screen.findByText("Daily Habits")).toBeInTheDocument();

    expect(queriedTables).toContain("habit_logs");
    expect(queriedTables).not.toContain("habit_tracking");
  });

  it("marks a completed habit/day cell as done", async () => {
    const today = format(new Date(), "yyyy-MM-dd");
    mockRows = [
      {
        date: today,
        habit_type: "login",
        completed_at: `${today}T08:00:00Z`,
        created_at: `${today}T08:00:00Z`,
      },
    ];

    renderWithClient(<HabitTracker studentId="student-1" days={7} />);

    await screen.findByText("Daily Habits");

    // The login cell for today carries a "Done" title; missed cells say "Missed".
    const doneCell = screen.getByTitle(`Login — ${today}: Done`);
    expect(doneCell).toBeInTheDocument();
  });
});

// ParentFeesPage — functional render tests (net-new screen).
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { LinkedChild } from "@/hooks/useParentDashboard";
import type { FeePayment } from "@/hooks/useFees";
import ParentFeesPage from "@/features/parent/fees/ParentFeesPage";

const hoisted = vi.hoisted(() => ({
  children: {
    data: undefined as LinkedChild[] | undefined,
    isLoading: false,
    isError: false,
  },
  fees: {
    data: undefined as FeePayment[] | undefined,
    isLoading: false,
    isError: false,
  },
  receipt: {
    mutate: vi.fn(),
    isPending: false,
    variables: undefined as string | undefined,
  },
}));

vi.mock("@/hooks/useParentDashboard", () => ({
  useLinkedChildren: () => hoisted.children,
}));

vi.mock("@/hooks/useFees", () => ({
  useStudentFees: () => hoisted.fees,
  useGenerateFeeReceipt: () => hoisted.receipt,
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "parent-1" }, profile: null }),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (_key: string, def?: string) => def ?? _key }),
}));

const child = (id: string, name: string): LinkedChild => ({
  student_id: id,
  student_name: name,
  current_level: 3,
  xp_total: 1200,
  current_streak: 5,
  enrolled_courses: 4,
  avg_attainment: 78,
});

const children: LinkedChild[] = [child("c1", "Aisha"), child("c2", "Omar")];

const fees: FeePayment[] = [
  {
    id: "p1",
    fee_structure_id: "fs1",
    student_id: "c1",
    amount_paid: 3000,
    payment_method: "card",
    receipt_number: "RC-1",
    status: "paid",
    payment_date: "2026-01-05",
    created_at: "2026-01-05T00:00:00Z",
  },
];

beforeEach(() => {
  hoisted.children.data = undefined;
  hoisted.children.isLoading = false;
  hoisted.children.isError = false;
  hoisted.fees.data = undefined;
  hoisted.fees.isLoading = false;
  hoisted.fees.isError = false;
  hoisted.receipt.mutate = vi.fn();
});

describe("ParentFeesPage", () => {
  it("renders the title while children load", () => {
    hoisted.children.isLoading = true;
    render(<ParentFeesPage />);
    expect(screen.getByText("Children's fees")).toBeInTheDocument();
  });

  it("shows an empty state when there are no linked children", () => {
    hoisted.children.data = [];
    render(<ParentFeesPage />);
    expect(screen.getByText("No linked children yet.")).toBeInTheDocument();
  });

  it("renders a child selector and the selected child's fees", () => {
    hoisted.children.data = children;
    hoisted.fees.data = fees;
    render(<ParentFeesPage />);
    expect(screen.getByText("Aisha")).toBeInTheDocument();
    expect(screen.getByText("Omar")).toBeInTheDocument();
    // Shared fee list renders for the (default first) child.
    expect(screen.getByText("Payment history")).toBeInTheDocument();
    // First child is active by default.
    expect(screen.getByTestId("parent-child-c1")).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });

  it("switches the active child on click", () => {
    hoisted.children.data = children;
    hoisted.fees.data = fees;
    render(<ParentFeesPage />);
    fireEvent.click(screen.getByTestId("parent-child-c2"));
    expect(screen.getByTestId("parent-child-c2")).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.getByTestId("parent-child-c1")).toHaveAttribute(
      "aria-pressed",
      "false"
    );
  });
});

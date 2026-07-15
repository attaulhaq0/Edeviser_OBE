// StudentFeesPage — functional render tests (net-new screen).
// Feature: prototype-frontend-rebuild.
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { FeePayment } from "@/hooks/useFees";
import StudentFeesPage from "@/features/student/fees/StudentFeesPage";

const hoisted = vi.hoisted(() => ({
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

vi.mock("@/hooks/useFees", () => ({
  useStudentFees: () => hoisted.fees,
  useGenerateFeeReceipt: () => hoisted.receipt,
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "stu-1" }, profile: null }),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (_key: string, def?: string) => def ?? _key }),
}));

const payments: FeePayment[] = [
  {
    id: "pay-1",
    fee_structure_id: "fs-1",
    student_id: "stu-1",
    amount_paid: 5000,
    payment_method: "card",
    receipt_number: "RC-100",
    status: "paid",
    payment_date: "2026-01-10",
    created_at: "2026-01-10T00:00:00Z",
  },
  {
    id: "pay-2",
    fee_structure_id: "fs-2",
    student_id: "stu-1",
    amount_paid: 0,
    payment_method: null,
    receipt_number: null,
    status: "overdue",
    payment_date: "2026-02-01",
    created_at: "2026-02-01T00:00:00Z",
  },
];

beforeEach(() => {
  hoisted.fees.data = undefined;
  hoisted.fees.isLoading = false;
  hoisted.fees.isError = false;
  hoisted.receipt.mutate = vi.fn();
  hoisted.receipt.isPending = false;
  hoisted.receipt.variables = undefined;
});

describe("StudentFeesPage", () => {
  it("renders the title while loading", () => {
    hoisted.fees.isLoading = true;
    render(<StudentFeesPage />);
    expect(screen.getByText("Fees")).toBeInTheDocument();
  });

  it("shows an error state", () => {
    hoisted.fees.isError = true;
    render(<StudentFeesPage />);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Could not load your fee records. Please try again."
    );
  });

  it("shows an empty state when there are no payments", () => {
    hoisted.fees.data = [];
    render(<StudentFeesPage />);
    expect(screen.getByText("No fee records yet.")).toBeInTheDocument();
  });

  it("renders payment rows with status and a receipt action for paid records", () => {
    hoisted.fees.data = payments;
    render(<StudentFeesPage />);
    // "5,000" and "Paid" appear in both a KPI card and the payment row.
    expect(screen.getAllByText("5,000").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Paid").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Overdue")).toBeInTheDocument();
    // Paid record with a receipt number → downloadable; overdue → not.
    expect(screen.getByTestId("fee-receipt-pay-1")).toBeInTheDocument();
    expect(screen.queryByTestId("fee-receipt-pay-2")).toBeNull();
  });

  it("requests a receipt for the paid payment on click", () => {
    hoisted.fees.data = payments;
    render(<StudentFeesPage />);
    fireEvent.click(screen.getByTestId("fee-receipt-pay-1"));
    expect(hoisted.receipt.mutate).toHaveBeenCalledWith(
      "pay-1",
      expect.anything()
    );
  });
});

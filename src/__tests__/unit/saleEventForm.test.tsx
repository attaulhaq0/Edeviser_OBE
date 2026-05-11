// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import SaleEventForm from "@/pages/admin/marketplace/SaleEventForm";

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockMutate = vi.fn();

vi.mock("@/hooks/useSaleEvents", () => ({
  useCreateSaleEvent: () => ({ mutate: mockMutate, isPending: false }),
}));

vi.mock("@/hooks/useMarketplaceAdmin", () => ({
  useAdminMarketplaceItems: () => ({
    data: [
      {
        id: "1",
        name: "Ocean Blue Theme",
        xp_price: 500,
        category: "cosmetic",
        is_active: true,
      },
      {
        id: "2",
        name: "XP Boost",
        xp_price: 300,
        category: "power_up",
        is_active: true,
      },
      {
        id: "3",
        name: "Inactive Item",
        xp_price: 100,
        category: "cosmetic",
        is_active: false,
      },
    ],
  }),
}));

// ─── Helpers ────────────────────────────────────────────────────────────────

function renderWithProviders() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <SaleEventForm onClose={vi.fn()} />
    </QueryClientProvider>
  );
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("SaleEventForm", () => {
  it("renders form title", () => {
    renderWithProviders();
    expect(
      screen.getByRole("heading", { name: "Create Sale Event" })
    ).toBeTruthy();
  });

  it("renders event name input", () => {
    renderWithProviders();
    expect(screen.getByPlaceholderText("e.g. Weekend Flash Sale")).toBeTruthy();
  });

  it("renders discount percentage input", () => {
    renderWithProviders();
    expect(screen.getByText(/Discount Percentage/)).toBeTruthy();
  });

  it("renders start and end date inputs", () => {
    renderWithProviders();
    expect(screen.getByText("Start Date")).toBeTruthy();
    expect(screen.getByText("End Date")).toBeTruthy();
  });

  it("renders only active items in the item selection list", () => {
    renderWithProviders();
    expect(screen.getByText("Ocean Blue Theme")).toBeTruthy();
    expect(screen.getByText("XP Boost")).toBeTruthy();
    // Inactive item should not appear
    expect(screen.queryByText("Inactive Item")).toBeNull();
  });

  it("renders Create Sale Event submit button", () => {
    renderWithProviders();
    expect(
      screen.getByRole("button", { name: /Create Sale Event/i })
    ).toBeTruthy();
  });

  it("renders Cancel button", () => {
    renderWithProviders();
    expect(screen.getByRole("button", { name: /Cancel/i })).toBeTruthy();
  });

  it("renders Back button", () => {
    renderWithProviders();
    expect(screen.getByText("Back")).toBeTruthy();
  });

  it("shows selected items count", () => {
    renderWithProviders();
    expect(screen.getByText(/0 selected/)).toBeTruthy();
  });
});

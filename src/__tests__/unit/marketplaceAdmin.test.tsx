// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import MarketplaceManagementPage from "@/pages/admin/marketplace/MarketplaceManagementPage";

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockItems = [
  {
    id: "1",
    name: "Ocean Blue Theme",
    description: "A calming theme",
    category: "cosmetic",
    sub_category: "profile_theme",
    xp_price: 500,
    level_requirement: 0,
    stock_type: "unlimited",
    stock_quantity: null,
    is_active: true,
    total_purchases: 42,
  },
  {
    id: "2",
    name: "Extra Quiz Attempt",
    description: "One extra attempt",
    category: "educational_perk",
    sub_category: "extra_quiz_attempt",
    xp_price: 300,
    level_requirement: 5,
    stock_type: "one_per_student",
    stock_quantity: null,
    is_active: false,
    total_purchases: 10,
  },
];

vi.mock("@/hooks/useMarketplaceAdmin", () => ({
  useAdminMarketplaceItems: () => ({ data: mockItems, isLoading: false }),
  useToggleMarketplaceItem: () => ({ mutate: vi.fn() }),
}));

// ─── Helpers ────────────────────────────────────────────────────────────────

function renderWithProviders() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <MarketplaceManagementPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("MarketplaceManagementPage", () => {
  it("renders page title", () => {
    renderWithProviders();
    expect(screen.getByText("Marketplace Items")).toBeTruthy();
  });

  it("renders Add Item button", () => {
    renderWithProviders();
    expect(screen.getByText("Add Item")).toBeTruthy();
  });

  it("renders item names in the table", () => {
    renderWithProviders();
    expect(screen.getByText("Ocean Blue Theme")).toBeTruthy();
    expect(screen.getByText("Extra Quiz Attempt")).toBeTruthy();
  });

  it("renders category badges", () => {
    renderWithProviders();
    expect(screen.getByText("Cosmetic")).toBeTruthy();
    expect(screen.getByText("Educational Perk")).toBeTruthy();
  });

  it("renders active/inactive status badges", () => {
    renderWithProviders();
    expect(screen.getByText("Active")).toBeTruthy();
    expect(screen.getByText("Inactive")).toBeTruthy();
  });

  it("renders Sale Events and Analytics navigation buttons", () => {
    renderWithProviders();
    expect(screen.getByText("Sale Events")).toBeTruthy();
    expect(screen.getByText("Analytics")).toBeTruthy();
  });

  it("renders search input", () => {
    renderWithProviders();
    expect(screen.getByPlaceholderText("Search items...")).toBeTruthy();
  });
});

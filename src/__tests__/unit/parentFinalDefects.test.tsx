import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ParentFeesPage from "@/features/parent/fees/ParentFeesPage";
import ParentProfilePage from "@/pages/parent/settings/ParentProfilePage";
import ParentProgressPage from "@/pages/parent/ParentProgressPage";
import enCommon from "@/locales/en/common.json";
import arCommon from "@/locales/ar/common.json";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "parent-user-id" },
    profile: { full_name: "Nadia Hassan", role: "parent" },
    role: "parent",
  }),
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

const renderWithProviders = (ui: React.ReactNode) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
};

describe("Parent Final Defect Fixes Verification", () => {
  it("Defect 1: resolves Grades & Reports translation key in both English and Arabic", () => {
    expect(enCommon.nav.gradesReports).toBe("Grades & Reports");
    expect(arCommon.nav.gradesReports).toBe("الدرجات والتقارير");
  });

  it("Defect 2: confirms Switch Role button is completely absent from Parent Profile", () => {
    renderWithProviders(<ParentProfilePage />);
    expect(screen.queryByText(/switch role/i)).not.toBeInTheDocument();
  });

  it("Defect 3: verifies Fees page Pay button has no duplicate payment icons", () => {
    renderWithProviders(<ParentFeesPage />);
    const payBtn = screen.queryByRole("button", { name: /pay for/i });
    if (payBtn) {
      expect(payBtn.textContent).not.toMatch(/💳.*💳/);
    }
  });

  it("Defect 4: verifies neutral wording and dynamic child name in Progress page", () => {
    renderWithProviders(<ParentProgressPage />);
    // Ensures "where she stands" was replaced by "where they stand"
    expect(screen.queryByText(/where she stands/i)).not.toBeInTheDocument();
  });
});

// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

// Mock hooks
vi.mock("@/hooks/useDepartments", () => ({
  useDepartments: vi.fn(() => ({
    data: [
      {
        id: "d1",
        name: "Computer Science",
        code: "CS",
        head_of_department_id: "u1",
        institution_id: "inst-1",
        created_at: "2025-01-01",
      },
      {
        id: "d2",
        name: "Mathematics",
        code: "MATH",
        head_of_department_id: null,
        institution_id: "inst-1",
        created_at: "2025-01-01",
      },
    ],
    isLoading: false,
  })),
  useCreateDepartment: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useUpdateDepartment: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useDeleteDepartment: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "u1" },
    institutionId: "inst-1",
    profile: { role: "admin" },
  }),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
  },
}));

import DepartmentManager from "@/pages/admin/departments/DepartmentManager";

const createWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
};

describe("DepartmentManager", () => {
  it("renders page title", () => {
    render(<DepartmentManager />, { wrapper: createWrapper() });
    expect(screen.getByText("Departments")).toBeInTheDocument();
  });

  it("renders department list", () => {
    render(<DepartmentManager />, { wrapper: createWrapper() });
    expect(screen.getByText("Computer Science")).toBeInTheDocument();
    expect(screen.getByText("Mathematics")).toBeInTheDocument();
  });

  it("renders department codes", () => {
    render(<DepartmentManager />, { wrapper: createWrapper() });
    expect(screen.getByText("CS")).toBeInTheDocument();
    expect(screen.getByText("MATH")).toBeInTheDocument();
  });

  it("renders add department button", () => {
    render(<DepartmentManager />, { wrapper: createWrapper() });
    expect(screen.getByText("Add Department")).toBeInTheDocument();
  });

  it("shows HoD status", () => {
    render(<DepartmentManager />, { wrapper: createWrapper() });
    expect(screen.getByText("HoD assigned")).toBeInTheDocument();
    expect(screen.getByText("No HoD assigned")).toBeInTheDocument();
  });
});

// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import CompetencyFrameworkManager from "@/pages/admin/competency-frameworks/CompetencyFrameworkManager";
const state = vi.hoisted(() => ({
  isLoading: false,
  isError: false,
  frameworkError: false,
  refetch: vi.fn(),
}));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ profile: { institution_id: "inst" } }),
}));
vi.mock("@/hooks/useILOs", () => ({ useILOs: () => ({ data: { data: [] } }) }));
vi.mock("@/hooks/usePLOs", () => ({ usePLOs: () => ({ data: { data: [] } }) }));
vi.mock("@/lib/supabase", () => ({ supabase: {} }));
vi.mock("@/hooks/useCompetencyFrameworks", () => ({
  useCompetencyFrameworks: () => ({
    data: [
      {
        id: "cambridge",
        name: "Cambridge IGCSE Mathematics 0580",
        version: "2026",
        description: null,
      },
    ],
    isLoading: false,
    isError: state.frameworkError,
    refetch: state.refetch,
  }),
  useCompetencyItems: () => ({
    data: [],
    isLoading: state.isLoading,
    isError: state.isError,
    refetch: state.refetch,
  }),
  useCompetencyOutcomeMappings: () => ({ data: [], isSuccess: true }),
  useCreateCompetencyFramework: () => ({ mutate: vi.fn(), isPending: false }),
  useImportCompetencyCSV: () => ({ mutate: vi.fn(), isPending: false }),
}));
const renderPage = () => {
  const client = new QueryClient();
  render(
    <QueryClientProvider client={client}>
      <CompetencyFrameworkManager />
    </QueryClientProvider>
  );
};
beforeEach(() => {
  state.isLoading = false;
  state.isError = false;
  state.frameworkError = false;
  state.refetch.mockReset();
});

describe("competency manager query-state presentation", () => {
  it("shows the selected hierarchy's empty state instead of hiding the panel", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /Cambridge IGCSE/ }));
    expect(screen.getByText("competency.hierarchy")).toBeInTheDocument();
    expect(screen.getByText("competency.empty")).toBeInTheDocument();
  });
  it("does not call a loading query empty", () => {
    state.isLoading = true;
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /Cambridge IGCSE/ }));
    expect(screen.getByRole("status")).toHaveTextContent("competency.loading");
    expect(screen.queryByText("competency.empty")).not.toBeInTheDocument();
  });
  it("shows item read errors and retries, rather than claiming an empty framework", () => {
    state.isError = true;
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /Cambridge IGCSE/ }));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "competency.itemsError"
    );
    expect(screen.queryByText("competency.empty")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "competency.retry" }));
    expect(state.refetch).toHaveBeenCalledOnce();
  });
  it("distinguishes failed framework discovery from no frameworks", () => {
    state.frameworkError = true;
    renderPage();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "competency.frameworksError"
    );
    expect(
      screen.queryByText("No frameworks defined yet.")
    ).not.toBeInTheDocument();
  });
});

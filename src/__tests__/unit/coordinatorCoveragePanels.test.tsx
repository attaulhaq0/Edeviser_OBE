import { act, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import i18n from "@/lib/i18n";
import CoordinatorCoveragePanels from "@/features/coordinator/dashboard/CoordinatorCoveragePanels";
import type { AccreditationPackItem } from "@/hooks/useCoordinatorAccreditation";

const pack: AccreditationPackItem[] = [
  { key: "cloMapping", state: "done" },
  { key: "samples", state: "prog" },
  { key: "analysis", state: "pending" },
];
const coverage = { totalClos: 4, mappedClos: 2, coveragePercent: 50 };
const view = (
  mapping: typeof coverage | null = coverage,
  readiness: number | null = 50,
  items: AccreditationPackItem[] = pack
) =>
  render(
    <MemoryRouter>
      <CoordinatorCoveragePanels
        coverage={mapping}
        readiness={readiness}
        evidencePack={items}
      />
    </MemoryRouter>
  );
afterEach(async () => {
  await act(async () => {
    await i18n.changeLanguage("en");
  });
});

describe("coordinator coverage is not an academic attainment score", () => {
  it("keeps two separate measured values and an exact CLO mapping denominator", () => {
    view();
    const mapping = screen.getByRole("progressbar", {
      name: "Course-outcome mapping coverage",
    });
    const documented = screen.getByRole("progressbar", {
      name: "Documented course evidence coverage",
    });
    expect(mapping).toHaveAttribute("aria-valuenow", "50");
    expect(documented).toHaveAttribute("aria-valuenow", "50");
    expect(mapping.querySelector("span")).toHaveClass("bg-primary");
    expect(mapping.querySelector("span")).toHaveStyle({ width: "50%" });
    expect(documented.querySelector("span")).toHaveStyle({ width: "50%" });
    expect(
      screen.getByText("2 of 4 course outcomes have an outcome mapping.")
    ).toBeInTheDocument();
    expect(screen.getAllByText("50%")).toHaveLength(2);
    expect(
      screen.getByText(/Institution-wide share of courses/)
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Open matrix/ })).toHaveAttribute(
      "href",
      "/coordinator/matrix"
    );
  });

  it("does not announce fabricated zero for no CLOs, no courses or unavailable RPC", () => {
    view({ totalClos: 0, mappedClos: 0, coveragePercent: 0 }, null, []);
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(
      screen.getByText("No measured CLO mapping coverage is available yet.")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Course evidence coverage is unavailable.")
    ).toHaveAttribute("role", "status");
    expect(screen.queryByText("0%")).not.toBeInTheDocument();
    expect(screen.getAllByText("—")).toHaveLength(2);
  });

  it("distinguishes measured zero and complete mapping without a success threshold", () => {
    const { unmount } = view(
      { totalClos: 4, mappedClos: 0, coveragePercent: 0 },
      0
    );
    expect(screen.getAllByRole("progressbar")).toHaveLength(2);
    expect(screen.getAllByText("0%")).toHaveLength(2);
    unmount();
    view({ totalClos: 4, mappedClos: 4, coveragePercent: 100 }, 100);
    expect(
      screen.getByText("Course-outcome mappings complete")
    ).toBeInTheDocument();
    expect(screen.getAllByText("100%")).toHaveLength(2);
    expect(
      screen.queryByText(/accreditation approved|mastery achieved/i)
    ).not.toBeInTheDocument();
  });

  it("localizes real pack item states and percent for Arabic", async () => {
    await act(async () => {
      await i18n.changeLanguage("ar");
    });
    view();
    expect(
      screen.getByRole("progressbar", {
        name: "تغطية ربط مخرجات تعلّم المقررات",
      })
    ).toHaveAttribute("aria-valuenow", "50");
    expect(screen.getByText("تغطية توثيق أدلة المقررات")).toBeInTheDocument();
    expect(screen.getByText(/نسبة مقررات المؤسسة/)).toBeInTheDocument();
    expect(screen.getByText(/تم ربط ٢ من أصل ٤/)).toBeInTheDocument();
    expect(screen.getAllByText(/٥٠٪/).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("قيد التنفيذ")).toBeInTheDocument();
  });

  it("fails safe for unknown RPC pack identifiers/statuses rather than rendering raw codes", () => {
    view(null, null, [
      {
        key: "unexpected_state",
        state: "constructor",
      } as unknown as AccreditationPackItem,
    ]);
    expect(screen.getByText("Evidence item")).toBeInTheDocument();
    expect(screen.getByText("Status unavailable")).toBeInTheDocument();
    expect(screen.queryByText("unexpected_state")).not.toBeInTheDocument();
  });
});

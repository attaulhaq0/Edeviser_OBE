import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import i18n from "@/lib/i18n";
import {
  PloAttainmentHeatmap,
  type PloAttainmentRow,
} from "@/features/admin/analytics";

const rows: PloAttainmentRow[] = [
  {
    ploId: "p1",
    ploCodeTitle: "PLO 1 — Inquiry",
    meanAttainment: 85,
    statusBand: "excellent",
    derivation: "program",
    contributingCount: 4,
  },
  {
    ploId: "p2",
    ploCodeTitle: "PLO 2 — Evidence",
    meanAttainment: 84.99,
    statusBand: "satisfactory",
    derivation: "clo_rollup",
    contributingCount: 3,
  },
  {
    ploId: "p3",
    ploCodeTitle: "PLO 3 — Design",
    meanAttainment: 69.99,
    statusBand: "developing",
  },
  {
    ploId: "p4",
    ploCodeTitle: "PLO 4 — Reflection",
    meanAttainment: 0,
    statusBand: "notYet",
  },
  {
    ploId: "p5",
    ploCodeTitle: "PLO 5 — Unmeasured",
    meanAttainment: -1,
    statusBand: "unmeasured",
  },
];
const view = (
  props: Partial<React.ComponentProps<typeof PloAttainmentHeatmap>> = {}
) =>
  render(
    <PloAttainmentHeatmap
      rows={rows}
      programs={[{ id: "a", name: "Program A" }]}
      selectedProgram="all"
      onProgramChange={vi.fn()}
      filterState="ready"
      {...props}
    />
  );
afterEach(async () => {
  await act(async () => {
    await i18n.changeLanguage("en");
  });
});

describe("admin PLO visualization, separate from native grade scales", () => {
  it("keeps all five categories and numeric boundary meanings in cards and legend", () => {
    view();
    const expected: Array<[string, string]> = [
      ["excellent", "85%"],
      ["satisfactory", "84.99%"],
      ["developing", "69.99%"],
      ["notYet", "0%"],
      ["unmeasured", "—"],
    ];
    for (const [band, value] of expected) {
      const cell = document.querySelector(`[data-plo-band="${band}"]`);
      const item = document.querySelector(`[data-plo-legend="${band}"]`);
      expect(cell).not.toBeNull();
      expect(item).not.toBeNull();
      expect(cell).toHaveTextContent(value);
      expect(item?.querySelector("span[aria-hidden='true']")).toHaveClass(
        "bg-[var(--plo-" + (band === "notYet" ? "not-yet" : band) + "-ink)]"
      );
    }
    expect(screen.getByText("PLO 2 — Evidence")).toBeInTheDocument();
    expect(screen.getByText("PLO 5 — Unmeasured")).toBeInTheDocument();
    const legend = screen.getByRole("list", {
      name: "PLO attainment visualization bands",
    });
    expect(within(legend).getAllByRole("listitem")).toHaveLength(5);
    expect(legend).toHaveTextContent("70% to under 85%");
    expect(
      screen.getByText(/institution's native grade scale/)
    ).toBeInTheDocument();
  });

  it("does not substitute unfiltered rows while a selected-program query is loading", () => {
    view({ selectedProgram: "a", filterState: "loading" });
    expect(
      screen.getByRole("status", { name: "Loading outcomes for this program…" })
    ).toHaveAttribute("aria-busy", "true");
    expect(document.querySelector("[data-plo-band]")).toBeNull();
    expect(
      screen.getByRole("combobox", { name: "Filter PLOs by program" })
    ).toBeInTheDocument();
  });

  it("does not hide a selected-program query error behind global fallback data", () => {
    const retry = vi.fn();
    view({ selectedProgram: "a", filterState: "error", onRetry: retry });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Could not load outcomes for this program."
    );
    expect(document.querySelector("[data-plo-band]")).toBeNull();
    fireEvent.click(
      screen.getByRole("button", { name: "Retry filtered outcomes" })
    );
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it("distinguishes a true empty program from unmeasured outcome rows", () => {
    view({ rows: [] });
    expect(
      screen.getByText("No measured program outcomes are available here.")
    ).toBeInTheDocument();
    expect(screen.queryByText("0%")).toBeNull();
  });

  it("keeps unsupported or nonfinite DTO bands neutral", () => {
    view({
      rows: [
        {
          ...rows[0]!,
          statusBand: "unsupported" as PloAttainmentRow["statusBand"],
        },
        { ...rows[1]!, meanAttainment: Number.NaN, statusBand: "excellent" },
      ],
    });
    expect(
      document.querySelectorAll('[data-plo-band="unmeasured"]')
    ).toHaveLength(2);
    expect(screen.queryByText("NaN%")).toBeNull();
  });

  it("localizes visible bands and half-open ranges in Arabic without changing source score", async () => {
    await act(async () => {
      await i18n.changeLanguage("ar");
    });
    view();
    expect(
      screen.getByRole("heading", { name: "خريطة تحصيل مخرجات البرنامج" })
    ).toBeInTheDocument();
    const legend = screen.getByRole("list", {
      name: "فئات عرض تحصيل مخرجات البرنامج",
    });
    expect(legend).toHaveTextContent("من ٧٠٪");
    expect(legend).toHaveTextContent("أقل من ٨٥٪");
    expect(screen.getByText(/٨٤٫٩٩٪/)).toBeInTheDocument();
    expect(within(legend).getByText("غير مقاس")).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: "تصفية مخرجات البرنامج" })
    ).toHaveAttribute("dir", "rtl");
  });
});

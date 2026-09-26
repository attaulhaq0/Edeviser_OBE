// Real frame, disclosure table and Recharts. Only the preference seam and
// browser measurement API are controlled; this is not browser paint evidence.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createInstance, type i18n } from "i18next";
import { I18nextProvider } from "react-i18next";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import en from "@/locales/en/common.json";
import ar from "@/locales/ar/common.json";
import type { WeeklyStudyData } from "@/types/planner";
import type { StudyTimeChartProps } from "@/components/shared/StudyTimeChart";
const preference = vi.hoisted(() => ({ reduced: true }));
vi.mock("@/hooks/useAccessibilityPreferences", () => ({
  useAccessibilityPreferenceControls: () => ({ effective: { reduced_animations: preference.reduced } }),
}));
import StudyTimeChart from "@/components/shared/StudyTimeChart";

let language: i18n;
const rows: WeeklyStudyData[] = [
  { weekStartDate: "2025-06-02", totalMinutes: 121 },
  { weekStartDate: "2025-06-09", totalMinutes: 153 },
];
const frame = (props: Partial<StudyTimeChartProps> = {}) => <I18nextProvider i18n={language}>
  <StudyTimeChart data={rows} averageMinutesPerWeek={99} {...props} />
</I18nextProvider>;
const hours = (value: number, locale: "en" | "ar") => {
  const template = (locale === "ar" ? ar : en).studyTimeChart.hours;
  return template.replace("{{value}}", new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value));
};

beforeEach(async () => {
  preference.reduced = true;
  language = createInstance();
  await language.init({ lng: "en", fallbackLng: "en", defaultNS: "common", resources: { en: { common: en }, ar: { common: ar } }, interpolation: { escapeValue: false } });
  const nativeRect = HTMLElement.prototype.getBoundingClientRect;
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    return this.classList.contains("recharts-wrapper") ? new DOMRect(0, 0, 640, 288) : nativeRect.call(this);
  });
  class MeasuredResizeObserver implements ResizeObserver {
    constructor(private readonly callback: ResizeObserverCallback) {}
    observe(target: Element) {
      this.callback([{ target, contentRect: new DOMRect(0, 0, 640, 288), borderBoxSize: [], contentBoxSize: [], devicePixelContentBoxSize: [] }], this);
    }
    unobserve() {}
    disconnect() {}
  }
  vi.stubGlobal("ResizeObserver", MeasuredResizeObserver);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("governed StudyTimeChart", () => {
  it.each(["en", "ar"] as const)("renders %s figure and actual data disclosure with unchanged rounding", async (locale) => {
    await language.changeLanguage(locale);
    const labels = (locale === "ar" ? ar : en).studyTimeChart;
    const original = rows.map((row) => ({ ...row }));
    render(frame());
    expect(screen.getByRole("figure", { name: labels.title })).toHaveAccessibleDescription(
      labels.summary.replace("{{recordCount}}", new Intl.NumberFormat(locale).format(2))
        .replace("{{average}}", labels.average.replace("{{hours}}", hours(Math.round((99 / 60) * 10) / 10, locale)))
    );
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    const show = screen.getByRole("button", { name: labels.showData });
    expect(show).toHaveAttribute("aria-expanded", "false");
    expect(show).toHaveClass("min-h-11");
    const id = show.getAttribute("aria-controls");
    expect(id).toBeTruthy();
    fireEvent.click(show);
    const table = screen.getByRole("table", { name: labels.dataTitle });
    expect(screen.getByRole("region", { name: labels.dataTitle })).toHaveAttribute("id", id);
    const actualRows = within(table).getAllByRole("row").slice(1);
    expect(actualRows).toHaveLength(rows.length);
    rows.forEach((row, index) => {
      const actual = actualRows[index]; if (!actual) throw new Error("Missing row");
      expect(within(actual).getByRole("cell")).toHaveTextContent(hours(Math.round((row.totalMinutes / 60) * 10) / 10, locale));
      expect(actual.querySelector("time")).toHaveAttribute("datetime", row.weekStartDate);
    });
    expect(rows).toEqual(original);
    fireEvent.click(screen.getByRole("button", { name: labels.hideData }));
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: labels.showData })).toHaveAttribute("aria-controls", id);
  });

  it("keeps empty, finite zero and unavailable observations distinct", () => {
    const view = render(frame({ data: [], averageMinutesPerWeek: 0 }));
    expect(screen.getByText(en.studyTimeChart.empty)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: en.studyTimeChart.showData })).not.toBeInTheDocument();
    view.rerender(frame({ data: [
      { weekStartDate: "2025-06-02", totalMinutes: 0 },
      { weekStartDate: "2025-06-09", totalMinutes: NaN },
      { weekStartDate: "2025-06-16", totalMinutes: Infinity },
    ], averageMinutesPerWeek: 0 }));
    expect(screen.queryByText(en.studyTimeChart.empty)).not.toBeInTheDocument();
    expect(screen.getByRole("figure")).toHaveAccessibleDescription(expect.stringContaining("Average (0 h/week)"));
    expect(screen.getByRole("figure")).toHaveAccessibleDescription(expect.stringContaining("Unavailable records: 2."));
    fireEvent.click(screen.getByRole("button", { name: en.studyTimeChart.showData }));
    const table = screen.getByRole("table");
    expect(within(table).getAllByRole("cell").map((cell) => cell.textContent)).toEqual(["0 h", "Unavailable", "Unavailable"]);
    view.rerender(frame({ data: rows, averageMinutesPerWeek: NaN }));
    expect(screen.getByRole("figure")).toHaveAccessibleDescription(expect.stringContaining(en.studyTimeChart.averageUnavailable));
    expect(screen.getByRole("figure").textContent).not.toContain("NaN");
  });

  it("validates calendar dates without timezone shifting or silently repairing invalid dates", () => {
    const data = [
      { weekStartDate: "2024-02-29", totalMinutes: 60 },
      { weekStartDate: "2025-02-30", totalMinutes: 60 },
      { weekStartDate: "not-a-date", totalMinutes: 60 },
      { weekStartDate: "", totalMinutes: 60 },
    ];
    render(frame({ data }));
    fireEvent.click(screen.getByRole("button", { name: en.studyTimeChart.showData }));
    const table = screen.getByRole("table");
    const expected = new Intl.DateTimeFormat("en", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" }).format(new Date("2024-02-29T00:00:00Z"));
    expect(within(table).getByRole("rowheader", { name: expected })).toBeInTheDocument();
    expect(table.querySelectorAll("time")).toHaveLength(1);
    expect(within(table).getByText("Unrecognized date: 2025-02-30")).toBeInTheDocument();
    expect(within(table).getByText("Unrecognized date: not-a-date")).toBeInTheDocument();
    expect(within(table).getByText("Date unavailable")).toBeInTheDocument();
  });

  it("retains supplied row order and does not infer a fixed eight-week period", () => {
    const data = [{ weekStartDate: "2025-07-01", totalMinutes: 60 }, { weekStartDate: "2024-01-01", totalMinutes: 120 }];
    render(frame({ data }));
    fireEvent.click(screen.getByRole("button", { name: en.studyTimeChart.showData }));
    expect([...screen.getByRole("table").querySelectorAll("time")].map((time) => time.dateTime)).toEqual(data.map((row) => row.weekStartDate));
    expect(screen.getByRole("figure")).toHaveAccessibleDescription(expect.stringContaining("Weekly records: 2."));
    expect(screen.getByRole("figure").textContent).not.toMatch(/last 8|eight weeks/);
  });

  it("supports local filter selection when undefined without filtering supplied records", () => {
    const callback = vi.fn();
    render(frame({ courseOptions: [{ id: "math", name: "Math" }], onCourseFilterChange: callback }));
    fireEvent.click(screen.getByRole("button", { name: "Math" }));
    expect(screen.getByRole("button", { name: "Math" })).toHaveAttribute("aria-pressed", "true");
    expect(callback).toHaveBeenLastCalledWith("math");
    fireEvent.click(screen.getByRole("button", { name: en.studyTimeChart.showData }));
    expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(rows.length + 1);
    fireEvent.click(screen.getByRole("button", { name: en.studyTimeChart.allCourses }));
    expect(callback).toHaveBeenLastCalledWith(null);
    expect(screen.getByRole("button", { name: en.studyTimeChart.allCourses })).toHaveAttribute("aria-pressed", "true");
  });

  it("preserves long unbroken mixed-script course names on wrapping, reachable controls", () => {
    const name = "المقررMathematics学習".repeat(14);
    const callback = vi.fn();
    render(frame({ courseOptions: [{ id: "long", name }], onCourseFilterChange: callback }));
    const button = screen.getByRole("button", { name });
    expect(button).toHaveClass("min-h-11", "max-w-full", "whitespace-normal", "[overflow-wrap:anywhere]");
    fireEvent.click(button);
    expect(callback).toHaveBeenCalledExactlyOnceWith("long");
    expect(button).toHaveAttribute("aria-pressed", "true");
  });

  it("honors controlled null and later external selections without optimistic prop drift", () => {
    const callback = vi.fn();
    const props = { courseOptions: [{ id: "math", name: "Math" }, { id: "science", name: "Science" }], onCourseFilterChange: callback };
    const view = render(frame({ ...props, courseFilter: null }));
    fireEvent.click(screen.getByRole("button", { name: "Math" }));
    expect(callback).toHaveBeenLastCalledWith("math");
    expect(screen.getByRole("button", { name: en.studyTimeChart.allCourses })).toHaveAttribute("aria-pressed", "true");
    view.rerender(frame({ ...props, courseFilter: "math" }));
    expect(screen.getByRole("button", { name: "Math" })).toHaveAttribute("aria-pressed", "true");
    view.rerender(frame({ ...props, courseFilter: "science" }));
    expect(screen.getByRole("button", { name: "Science" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Math" })).toHaveAttribute("aria-pressed", "false");
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("updates language while preserving the disclosure id and open state", async () => {
    render(frame());
    const trigger = screen.getByRole("button", { name: en.studyTimeChart.showData });
    const id = trigger.getAttribute("aria-controls"); fireEvent.click(trigger);
    await act(async () => { await language.changeLanguage("ar"); });
    await waitFor(() => expect(screen.getByRole("button", { name: ar.studyTimeChart.hideData })).toHaveAttribute("aria-controls", id));
    expect(screen.getByRole("figure", { name: ar.studyTimeChart.title })).toBeInTheDocument();
    expect(within(screen.getByRole("table")).getAllByRole("cell")[0]).toHaveTextContent(hours(2, "ar"));
  });

  it("renders the real keyboard-focusable Recharts SVG and semantic solid series", async () => {
    render(frame());
    const plot = await screen.findByRole("application", { name: en.studyTimeChart.title });
    expect(plot.tagName.toLowerCase()).toBe("svg");
    expect(plot).toHaveAttribute("tabindex", "0");
    expect(plot.querySelector('[fill="var(--chart-1)"]')).not.toBeNull();
    expect(plot.querySelector("linearGradient")).toBeNull();
  });

  it("preserves the actual chart and open data alternative when stored reduction changes", async () => {
    const view = render(frame());
    fireEvent.click(screen.getByRole("button", { name: en.studyTimeChart.showData }));
    const id = screen.getByRole("button", { name: en.studyTimeChart.hideData }).getAttribute("aria-controls");
    preference.reduced = false;
    view.rerender(frame());
    expect(await screen.findByRole("application", { name: en.studyTimeChart.title })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: en.studyTimeChart.hideData })).toHaveAttribute("aria-controls", id);
    expect(within(screen.getByRole("table")).getAllByRole("cell").map((cell) => cell.textContent)).toEqual(["2 h", "2.6 h"]);
  });

  it("keeps the explicit stored-reduction adapter and focus recipe in source, without claiming paint/animation verification", () => {
    const source = readFileSync(resolve("src/components/shared/StudyTimeChart.tsx"), "utf8");
    expect(source.match(/isAnimationActive=\{effective\.reduced_animations \? false : "auto"\}/g)).toHaveLength(2);
    expect(source).not.toContain("as never");
    expect(source).not.toContain("value ?? 0");
    expect(source).toContain('<BarChart responsive className="h-full w-full"');
    expect(source).not.toContain("ResponsiveContainer");
    expect(source).not.toContain("initialDimension");
    const frameSource = readFileSync(resolve("src/design-system/patterns/VisualizationFrame.tsx"), "utf8");
    expect(frameSource).toContain("[&_svg[tabindex]:focus-visible]:outline-[3px]");
    expect(frameSource).toContain("[&_svg[tabindex]:focus-visible]:outline-ring");
  });
});

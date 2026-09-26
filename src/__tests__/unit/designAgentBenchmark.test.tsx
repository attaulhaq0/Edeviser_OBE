// Real design-system components; isolated caller DTOs/copy, no business mocks.
// Happy DOM/axe assertions are not visual, font, contrast or screen-reader approval.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createInstance, type i18n } from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { checkA11y } from "@/__tests__/helpers/a11y";
import { CourseResultsPanel } from "@/__tests__/fixtures/design-agent-benchmark/CourseResultsPanel";
import { courseResultsLabels } from "@/__tests__/fixtures/design-agent-benchmark/labels";
import type {
  CourseResultRecord,
  CourseResultsLanguage,
  CourseResultsPanelProps,
  CourseResultsState,
} from "@/__tests__/fixtures/design-agent-benchmark/types";

let translations: i18n;
beforeEach(async () => {
  translations = createInstance();
  await translations.use(initReactI18next).init({
    lng: "en",
    fallbackLng: false,
    defaultNS: "common",
    resources: {
      en: { common: courseResultsLabels.en },
      ar: { common: courseResultsLabels.ar },
    },
    interpolation: { escapeValue: false },
  });
  vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Benchmark must not fetch"));
});

afterEach(() => {
  cleanup();
  expect(globalThis.fetch).not.toHaveBeenCalled();
  vi.restoreAllMocks();
});

const panel = (language: CourseResultsLanguage, state: CourseResultsState, headingLevel?: CourseResultsPanelProps["headingLevel"]) => (
  <I18nextProvider i18n={translations}>
    <CourseResultsPanel language={language} labels={courseResultsLabels[language]} state={state} headingLevel={headingLevel} />
  </I18nextProvider>
);

// Synthetic caller inputs exercise transport/display, not grade classifications.
const records: readonly CourseResultRecord[] = Object.freeze([
  Object.freeze({
    id: "zero",
    name: "Mathematics / الرياضيات — extended course name for an interdisciplinary learning programme",
    result: Object.freeze({ value: 0, scaleLabel: "Native points / النقاط الأصلية" }),
  }),
  Object.freeze({ id: "missing", name: "العلوم / Science", result: null }),
  Object.freeze({
    id: "native-band",
    name: "Language / اللغة — " + "LongMixedScriptاسممقرر".repeat(12),
    result: Object.freeze({ value: "B", scaleLabel: "Caller-supplied band / المستوى المقدم" }),
  }),
]);

for (const language of ["en", "ar"] as const) {
  describe(`course results benchmark (${language})`, () => {
    const labels = courseResultsLabels[language];

    it("has a named, locally directed section and a busy loading announcement, not fake rows", () => {
      render(panel(language, { status: "loading" }));
      const section = screen.getByRole("region", { name: labels.title });
      expect(section).toHaveAttribute("lang", language);
      expect(section).toHaveAttribute("dir", language === "ar" ? "rtl" : "ltr");
      expect(screen.getByRole("heading", { level: 2, name: labels.title })).toBeInTheDocument();
      expect(screen.getByRole("status", { name: labels.loading })).toHaveAttribute("aria-busy", "true");
      expect(screen.queryByRole("list")).not.toBeInTheDocument();
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });

    it("distinguishes unavailable data from a successful empty list without inventing zero", () => {
      const { rerender } = render(panel(language, { status: "unavailable" }));
      expect(screen.getByRole("status")).toHaveTextContent(labels.unavailable);
      expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
      expect(screen.queryByText(labels.empty)).not.toBeInTheDocument();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(screen.queryByText("0", { exact: true })).not.toBeInTheDocument();
      rerender(panel(language, { status: "loaded", courses: [] }));
      expect(screen.getByText(labels.empty)).toBeInTheDocument();
      expect(screen.queryByText(labels.unavailable)).not.toBeInTheDocument();
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
      expect(screen.queryByRole("list")).not.toBeInTheDocument();
      expect(screen.queryByText("0", { exact: true })).not.toBeInTheDocument();
    });

    it("keeps the real retry Button outside the error announcement and supports keyboard retry", async () => {
      const user = userEvent.setup();
      const onRetry = vi.fn();
      const { rerender } = render(panel(language, { status: "error", onRetry }));
      const alert = screen.getByRole("alert");
      expect(alert).toHaveTextContent(labels.error);
      const retry = screen.getByRole("button", { name: labels.retry });
      expect(retry).toHaveAttribute("data-slot", "button");
      expect(retry).toHaveAttribute("type", "button");
      expect(retry.closest('[role="alert"], [role="status"], [aria-busy="true"]')).toBeNull();
      expect(onRetry).not.toHaveBeenCalled();
      await user.tab();
      expect(retry).toHaveFocus();
      await user.keyboard("{Enter}");
      expect(onRetry).toHaveBeenCalledTimes(1);
      // Retry only notifies the caller; no hidden state machine or fabricated data.
      expect(screen.getByRole("alert")).toBeInTheDocument();
      rerender(panel(language, { status: "loading" }));
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      rerender(panel(language, { status: "loaded", courses: records }));
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
      expect(screen.getAllByRole("listitem")).toHaveLength(3);
    });

    it("preserves zero, missing and native text results, full names and caller order", () => {
      render(panel(language, { status: "loaded", courses: records }));
      const list = screen.getByRole("list", { name: labels.courseList });
      const rows = within(list).getAllByRole("listitem");
      expect(rows).toHaveLength(records.length);
      records.forEach((course, index) => {
        const row = rows[index];
        expect(row).toBeDefined();
        if (!row) throw new Error("Missing rendered course");
        const name = within(row).getByText(course.name);
        expect(name.tagName).toBe("BDI");
        expect(name).toHaveAttribute("dir", "auto");
        expect(name.parentElement).toHaveClass("min-w-0", "[overflow-wrap:anywhere]");
        expect(name.parentElement).not.toHaveClass("truncate", "line-clamp-1");
        expect(within(row).getByText(labels.result)).toBeInTheDocument();
        if (course.result === null) {
          expect(within(row).getByText(labels.missingResult)).toBeInTheDocument();
          expect(within(row).queryByText("0", { exact: true })).not.toBeInTheDocument();
        } else {
          const value = within(row).getByText(String(course.result.value), { exact: true });
          expect(value).toHaveAttribute("dir", "auto");
          expect(within(row).getByText(course.result.scaleLabel)).toBeInTheDocument();
          expect(within(row).queryByText(labels.missingResult)).not.toBeInTheDocument();
        }
      });
      expect(within(list).getAllByText("0", { exact: true })).toHaveLength(1);
      expect(list).not.toHaveTextContent("0%");
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });

    it.each(["loading", "unavailable", "empty", "error", "loaded"] as const)(
      "%s has no detected axe violations in the isolated DOM (not visual approval)",
      async (status) => {
        const state: CourseResultsState = status === "empty"
          ? { status: "loaded", courses: [] }
          : status === "loaded"
            ? { status, courses: records }
            : status === "error"
              ? { status, onRetry: vi.fn() }
              : { status };
        const { container } = render(panel(language, state));
        await checkA11y(container);
      },
    );
  });
}

it("accepts live caller language/data changes and a nested heading without mutating document direction", async () => {
  const rootDirection = document.documentElement.getAttribute("dir");
  const rootLanguage = document.documentElement.getAttribute("lang");
  const { rerender } = render(panel("en", { status: "loaded", courses: records }, "h3"));
  expect(screen.getByRole("heading", { level: 3, name: courseResultsLabels.en.title })).toBeInTheDocument();
  await act(async () => { await translations.changeLanguage("ar"); });
  rerender(panel("ar", { status: "loaded", courses: [] }, "h3"));
  expect(screen.getByRole("heading", { level: 3, name: courseResultsLabels.ar.title })).toBeInTheDocument();
  expect(screen.getByRole("region")).toHaveAttribute("dir", "rtl");
  expect(screen.queryByRole("list")).not.toBeInTheDocument();
  expect(screen.queryByText(courseResultsLabels.en.title)).not.toBeInTheDocument();
  expect(document.documentElement.getAttribute("dir")).toBe(rootDirection);
  expect(document.documentElement.getAttribute("lang")).toBe(rootLanguage);
});

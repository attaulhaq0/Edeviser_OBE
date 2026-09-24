import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { createInstance } from "i18next";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter, useLocation } from "react-router-dom";
import type { StudentAcademicSummary } from "@/hooks/useStudentProgress";
import StudentProgressNew from "@/pages/student/progress/StudentProgressNew";
import enStudent from "@/locales/en/student.json";
import arStudent from "@/locales/ar/student.json";
import enCommon from "@/locales/en/common.json";
import arCommon from "@/locales/ar/common.json";

const fixture = vi.hoisted(() => ({
  userId: "student-1" as string | undefined,
  query: {
    data: undefined as StudentAcademicSummary | undefined,
    isPending: false, isError: false, isFetching: false,
    fetchStatus: "idle" as "idle" | "fetching" | "paused",
    refetch: vi.fn(),
  },
}));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: fixture.userId ? { id: fixture.userId } : null }) }));
vi.mock("@/hooks/useStudentProgress", () => ({ useStudentAcademicSummary: () => fixture.query }));

function summary(): StudentAcademicSummary {
  return {
    activeCourseCount: 1, recordedCourseCount: 1, averageMastery: 0,
    excellentCount: 0, satisfactoryCount: 0, developingCount: 0, notYetCount: 1,
    perCourse: [{ course_id: "course-01", course_name: "Biology", course_code: "BIO",
      attainment_percent: 0, attainmentRecorded: true, clo_count: 0, evidence_count: 0 }],
  };
}
function RouteLocation() {
  return <output data-testid="location">{useLocation().pathname}</output>;
}
async function mount(language: "en" | "ar") {
  const i18n = createInstance();
  await i18n.init({ lng: language, fallbackLng: false, defaultNS: "common", interpolation: { escapeValue: false },
    resources: { en: { student: enStudent, common: enCommon }, ar: { student: arStudent, common: arCommon } } });
  render(<I18nextProvider i18n={i18n}><MemoryRouter initialEntries={["/student/progress"]}>
    <StudentProgressNew /><RouteLocation />
  </MemoryRouter></I18nextProvider>);
  return i18n.getFixedT(language, "student");
}
function metric(label: string) {
  const value = screen.getByText(label, { selector: "dt" }).nextElementSibling;
  if (!value) throw new Error(`Missing definition for ${label}`);
  return value;
}
beforeEach(() => {
  fixture.userId = "student-1";
  fixture.query.data = undefined;
  fixture.query.isPending = false;
  fixture.query.isError = false;
  fixture.query.isFetching = false;
  fixture.query.fetchStatus = "idle";
  fixture.query.refetch.mockReset();
});

for (const language of ["en", "ar"] as const) {
  describe(`actual routed student progress / ${language}`, () => {
    const format = (value: number) => new Intl.NumberFormat(language).format(value);
    const pct = (value: number) => new Intl.NumberFormat(language, { style: "percent", maximumFractionDigits: 1 }).format(value / 100);

    it.each(["fetching", "paused"] as const)("names %s progress without inventing results", async (fetchStatus) => {
      fixture.query.isPending = true;
      fixture.query.fetchStatus = fetchStatus;
      const t = await mount(language);
      expect(screen.getByRole("status", { name: t(fetchStatus === "paused" ? "progress.waitingConnection" : "progress.loading") })).toHaveAttribute("aria-busy", "true");
      expect(screen.queryByText(t("progress.enrolledCourses"))).not.toBeInTheDocument();
    });

    it("does not expose cached results without an actor", async () => {
      fixture.userId = undefined;
      fixture.query.data = summary();
      const t = await mount(language);
      expect(screen.getByRole("alert")).toHaveTextContent(t("progress.signInRequired"));
      expect(screen.queryByText("Biology")).not.toBeInTheDocument();
      expect(screen.queryByRole("link", { name: t("progress.openTutor") })).not.toBeInTheDocument();
    });

    it("announces failed reads and invokes a real retry instead of showing stale success", async () => {
      fixture.query.isError = true;
      fixture.query.data = summary();
      const t = await mount(language);
      expect(screen.getByRole("alert")).toHaveTextContent(t("progress.loadError"));
      expect(screen.queryByText("Biology")).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: t("progress.retry") }));
      expect(fixture.query.refetch).toHaveBeenCalledOnce();
    });

    it("prevents duplicate retry while fetching", async () => {
      fixture.query.isError = true;
      fixture.query.isFetching = true;
      const t = await mount(language);
      expect(screen.getByRole("button", { name: t("progress.retry") })).toBeDisabled();
    });

    it("keeps undefined data separate from a successful empty enrollment list", async () => {
      const t = await mount(language);
      expect(screen.getByRole("alert")).toHaveTextContent(t("progress.unavailable"));
      expect(screen.queryByText(t("progress.noCourses"))).not.toBeInTheDocument();
    });

    it("provides real course navigation for successful empty data", async () => {
      fixture.query.data = { ...summary(), activeCourseCount: 0, recordedCourseCount: 0, perCourse: [] };
      const t = await mount(language);
      expect(screen.getByText(t("progress.noCourses"))).toBeInTheDocument();
      fireEvent.click(screen.getByRole("link", { name: t("progress.browseCourses") }));
      expect(screen.getByTestId("location")).toHaveTextContent("/student/courses");
    });

    it("preserves genuine zero attainment, outcome counts and sample counts", async () => {
      fixture.query.data = summary();
      const t = await mount(language);
      expect(metric(t("progress.overallAttainment"))).toHaveTextContent(pct(0));
      expect(screen.getByText(t("progress.outcomeCount", { value: format(0) }))).toBeInTheDocument();
      expect(screen.getByText(t("progress.sampleCount", { value: format(0) }))).toBeInTheDocument();
      expect(screen.getByText(t("progress.bands.Not_Yet"))).toBeInTheDocument();
      expect(screen.queryByText(t("progress.notMeasured"))).not.toBeInTheDocument();
      expect(screen.queryByText(/Spend 20|AI Insight/)).not.toBeInTheDocument();
    });

    it("withholds numeric fallbacks for unrecorded courses without changing the source math", async () => {
      const data = summary();
      data.recordedCourseCount = 0;
      data.perCourse = data.perCourse.map((course) => ({ ...course, attainmentRecorded: false }));
      fixture.query.data = data;
      const t = await mount(language);
      expect(metric(t("progress.overallAttainment"))).toHaveTextContent(t("progress.notMeasured"));
      expect(screen.getByText(t("progress.partial", { recorded: format(0), total: format(1) }))).toHaveAttribute("role", "status");
      expect(screen.queryByText(pct(0))).not.toBeInTheDocument();
      expect(screen.queryByText(t("progress.bands.Not_Yet"))).not.toBeInTheDocument();
      expect(data.averageMastery).toBe(0);
      expect(data.perCourse[0]?.attainment_percent).toBe(0);
    });

    it("keeps partial course results while withholding aggregate band totals", async () => {
      const data = summary();
      data.activeCourseCount = 2;
      data.excellentCount = 1;
      data.averageMastery = 44;
      data.perCourse = [
        { ...data.perCourse[0]!, attainment_percent: 88 },
        { course_id: "course-02", course_name: "Chemistry", course_code: "BIO", attainment_percent: 0,
          attainmentRecorded: false, clo_count: 0, evidence_count: 0 },
      ];
      fixture.query.data = data;
      const t = await mount(language);
      expect(metric(t("progress.excellentCourses"))).toHaveTextContent(t("progress.notMeasured"));
      expect(screen.getByText(pct(88))).toBeInTheDocument();
      expect(screen.queryByText(pct(44))).not.toBeInTheDocument();
      expect(screen.getByRole("link", { name: t("progress.openCourse", { course: "Biology", code: "BIO" }) })).toHaveAttribute("href", "/student/courses/course-01");
      expect(screen.getByRole("link", { name: t("progress.openCourse", { course: "Chemistry", code: "BIO" }) })).toHaveAttribute("href", "/student/courses/course-02");
    });

    it.each([NaN, Infinity, -1, 101])("never displays invalid attainment %s as a measured result", async (value) => {
      const data = summary();
      data.averageMastery = value;
      data.perCourse = data.perCourse.map((course) => ({ ...course, attainment_percent: value }));
      fixture.query.data = data;
      const t = await mount(language);
      expect(metric(t("progress.overallAttainment"))).toHaveTextContent(t("progress.notMeasured"));
      expect(screen.queryByText(/NaN|Infinity/)).not.toBeInTheDocument();
      expect(screen.queryByText(t("progress.bands.Not_Yet"))).not.toBeInTheDocument();
    });

    it("presents an actual lowest outcome and preserves its real course and tutor links", async () => {
      fixture.query.data = { ...summary(), weakestClo: { cloId: "outcome-1", courseId: "course-01", title: "التَّعَلُّم — Cells and evidence", mastery: 0 } };
      const t = await mount(language);
      expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent("التَّعَلُّم — Cells and evidence");
      expect(screen.getByRole("link", { name: t("progress.openTutor") })).toHaveAttribute("href", "/student/tutor");
      fireEvent.click(screen.getByRole("link", { name: t("progress.reviewCourse") }));
      expect(screen.getByTestId("location")).toHaveTextContent("/student/courses/course-01");
    });

    it("keeps untitled results identifiable and their course link operable", async () => {
      const data = summary();
      data.perCourse = data.perCourse.map((course) => ({ ...course, course_name: "  ", course_code: "" }));
      data.weakestClo = { cloId: "outcome-1", courseId: "course-01", title: " ", mastery: 0 };
      fixture.query.data = data;
      const t = await mount(language);
      expect(screen.getByRole("heading", { level: 3 })).toHaveTextContent(t("progress.unnamedOutcome"));
      const course = screen.getByRole("link", { name: t("progress.unnamedCourse") });
      expect(course).toHaveClass("min-w-11", "min-h-11");
      fireEvent.click(course);
      expect(screen.getByTestId("location")).toHaveTextContent("/student/courses/course-01");
    });

    it("does not label a missing or mismatched outcome as no learning gaps", async () => {
      fixture.query.data = { ...summary(), weakestClo: { cloId: "outcome-1", courseId: "another-course", title: "Should not appear", mastery: 90 } };
      const t = await mount(language);
      expect(screen.getByText(t("progress.noOutcomeEvidence"))).toBeInTheDocument();
      expect(screen.queryByText("Should not appear")).not.toBeInTheDocument();
      const courses = screen.getByRole("list");
      expect(within(courses).getAllByRole("listitem")).toHaveLength(1);
    });
  });
}

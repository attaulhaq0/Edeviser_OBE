// @vitest-environment happy-dom
// Actual page + rail contracts; query boundaries are mocked, not rendered UI or formulas.
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createInstance } from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { MemoryRouter } from "react-router-dom";
import ParentAttendancePage from "@/pages/parent/ParentAttendancePage";
import { ParentAttendanceRail } from "@/features/parent";
import {
  buildParentAttendanceOverview,
  type ParentAttendanceOverview,
  type RawAttendanceRecordItem,
} from "@/hooks/useAttendance";
import type { LinkedChild } from "@/hooks/useParentDashboard";
import en from "@/locales/en/common.json";
import ar from "@/locales/ar/common.json";

const mocks = vi.hoisted(() => ({
  children: {
    data: undefined as LinkedChild[] | undefined,
    isPending: false,
    isError: false,
    isFetching: false,
    refetch: vi.fn(),
  },
  overview: {
    data: undefined as ParentAttendanceOverview | undefined,
    isPending: false,
    isError: false,
    isFetching: false,
    refetch: vi.fn(),
  },
  attendance: vi.fn(),
  linkedChildren: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "parent-1" } }) }));
vi.mock("@/hooks/useParentDashboard", () => ({ useLinkedChildren: mocks.linkedChildren }));
vi.mock("@/hooks/useAttendance", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/hooks/useAttendance")>(),
  useParentAttendanceOverview: mocks.attendance,
}));

const i18n = createInstance();
const course = { courseId: "history-9", code: "HIS9", name: "History of Science" };
const child = (id: string, name: string): LinkedChild => ({
  student_id: id, student_name: name, current_level: 1, xp_total: 0,
  current_streak: 0, enrolled_courses: 1, avg_attainment: 0,
});
const firstChild = child("student-1", "Lina Hassan");
const secondChild = child("student-2", "Sami Noor");
type AttendanceStatus = ParentAttendanceOverview["recentExceptions"][number]["status"];
const overviewFor = (
  statuses: AttendanceStatus[] = ["present", "late", "absent", "excused"],
  student = firstChild,
  courses = [course]
) => {
  const records: RawAttendanceRecordItem[] = statuses.map((status, index) => {
    const date = new Date(Date.UTC(2027, 0, index + 1)).toISOString().slice(0, 10);
    return {
      id: `record-${index}`, session_id: `session-${index}`, status,
      created_at: `${date}T08:00:00Z`,
      class_sessions: {
        id: `session-${index}`, session_date: date, session_type: "studio",
        topic: "Documentary sources",
        course_sections: {
          id: "section-history", course_id: course.courseId,
          courses: { id: course.courseId, code: course.code, name: course.name },
        },
      },
    };
  });
  return buildParentAttendanceOverview(
    { id: student.student_id, name: student.student_name }, courses, records
  );
};

beforeAll(async () => {
  await i18n.use(initReactI18next).init({
    lng: "en", fallbackLng: "en", ns: ["common"], defaultNS: "common",
    resources: { en: { common: en }, ar: { common: ar } },
    interpolation: { escapeValue: false },
  });
  // Only missing platform APIs, not Select or page/rail markup, are supplied.
  if (!Element.prototype.hasPointerCapture) Element.prototype.hasPointerCapture = () => false;
  if (!Element.prototype.releasePointerCapture) Element.prototype.releasePointerCapture = () => {};
  if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {};
});

beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(mocks.children, { data: [firstChild], isPending: false, isError: false, isFetching: false });
  Object.assign(mocks.overview, { data: overviewFor(), isPending: false, isError: false, isFetching: false });
  mocks.children.refetch.mockResolvedValue({});
  mocks.overview.refetch.mockResolvedValue({});
  mocks.linkedChildren.mockImplementation(() => mocks.children);
  mocks.attendance.mockImplementation(() => mocks.overview);
});

const pageTree = () => (
  <I18nextProvider i18n={i18n}>
    <MemoryRouter>
      <div lang={i18n.language} dir={i18n.dir()}><ParentAttendancePage /></div>
    </MemoryRouter>
  </I18nextProvider>
);
const noInventedUi = () => {
  expect(document.body.textContent).not.toMatch(/Aarav|Mathematics 6|MATH6|ENG7|SOC7|SCI8|Gulf Academy|4000 1234|Spring 2026|Strong attendance|Apr 7|May 18|W6/);
};

for (const language of ["en", "ar"] as const) {
  describe(`Parent attendance — real ${language} resources`, () => {
    const common = language === "en" ? en : ar;
    const copy = common.parentAttendance;
    const percent = (value: number) => new Intl.NumberFormat(language, { style: "percent", maximumFractionDigits: 0 }).format(value / 100);
    const number = (value: number) => new Intl.NumberFormat(language).format(value);
    beforeEach(async () => { await i18n.changeLanguage(language); });

    it.each([true, false])("keeps initial child pending (fetching=%s) named and metric-free", (isFetching) => {
      Object.assign(mocks.children, { data: undefined, isPending: true, isFetching });
      render(pageTree());
      expect(screen.getByRole("heading", { level: 1, name: copy.title })).toBeInTheDocument();
      expect(screen.getByRole("status", { name: common.status.loading })).toHaveAttribute("aria-busy", "true");
      expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
      expect(screen.queryByTestId("attendance-rate")).not.toBeInTheDocument();
      expect(mocks.attendance).toHaveBeenLastCalledWith(undefined, { courseId: undefined });
      noInventedUi();
    });

    it.each(["error", "unavailable"] as const)("does not call linked-child %s an empty list and retries the child query", (state) => {
      Object.assign(mocks.children, { data: state === "error" ? [firstChild] : undefined, isError: state === "error" });
      render(pageTree());
      expect(screen.getByRole("alert")).toHaveTextContent(state === "error" ? copy.childrenError : copy.childrenUnavailable);
      expect(screen.queryByText(common.empty.noLinkedStudents.title)).not.toBeInTheDocument();
      expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
      expect(screen.queryByTestId("attendance-rate")).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: common.buttons.retry }));
      expect(mocks.children.refetch).toHaveBeenCalledOnce();
      expect(mocks.overview.refetch).not.toHaveBeenCalled();
      noInventedUi();
    });

    it("shows successful no-linked-students separately from an error", () => {
      mocks.children.data = [];
      render(pageTree());
      expect(screen.getByText(`${common.empty.noLinkedStudents.title}. ${common.empty.noLinkedStudents.description}`)).toBeInTheDocument();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
      expect(screen.queryByTestId("attendance-rate")).not.toBeInTheDocument();
      noInventedUi();
    });

    it.each([true, false])("gates the rail and body for pending attendance (fetching=%s)", (isFetching) => {
      Object.assign(mocks.overview, { data: undefined, isPending: true, isFetching });
      render(pageTree());
      expect(screen.getByRole("status", { name: common.status.loading })).toBeInTheDocument();
      expect(screen.getByRole("combobox", { name: copy.courseFilter })).toBeDisabled();
      expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
      expect(screen.queryByTestId("attendance-rate")).not.toBeInTheDocument();
      noInventedUi();
    });

    it.each(["error", "unavailable", "wrong-child"] as const)("gates both surfaces for attendance %s and retries the attendance query", (state) => {
      Object.assign(mocks.overview, {
        data: state === "unavailable" ? undefined : overviewFor(undefined, state === "wrong-child" ? secondChild : firstChild),
        isError: state === "error",
      });
      render(pageTree());
      expect(screen.getByRole("alert")).toHaveTextContent(state === "error" ? copy.error : copy.unavailable);
      expect(screen.queryByTestId("attendance-rate")).not.toBeInTheDocument();
      expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: common.buttons.retry }));
      expect(mocks.overview.refetch).toHaveBeenCalledOnce();
      expect(mocks.children.refetch).not.toHaveBeenCalled();
      noInventedUi();
    });

    it("renders actual data during a non-error background refresh", () => {
      mocks.overview.isFetching = true;
      render(pageTree());
      expect(screen.getByTestId("attendance-rate")).toHaveTextContent(percent(50));
      expect(screen.getByRole("complementary", { name: copy.rail.label })).toBeInTheDocument();
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });

    it("preserves canonical empty100 internally but shows zero counts and no measured rate, period or demos", () => {
      const empty = overviewFor([], firstChild, []);
      expect(empty.totals.attendanceRate).toBe(100);
      mocks.overview.data = empty;
      render(pageTree());
      expect(screen.getByText(copy.noRecords)).toBeInTheDocument();
      expect(screen.getByTestId("attendance-rate")).toHaveTextContent(copy.notMeasured);
      expect(screen.queryByText(percent(100))).not.toBeInTheDocument();
      expect(screen.queryAllByTestId("attendance-trend-fill")).toHaveLength(0);
      expect(screen.getByText(copy.noTrend)).toBeInTheDocument();
      expect(screen.getByText(copy.noCourses)).toBeInTheDocument();
      const rail = screen.getByRole("complementary", { name: copy.rail.label });
      expect(within(rail).queryByText(copy.recordedPeriod)).not.toBeInTheDocument();
      expect(within(rail).getByText(copy.totalSessions).nextElementSibling).toHaveTextContent(number(0));
      expect(within(rail).getByRole("link", { name: copy.rail.getSupport })).toHaveAttribute("href", "/parent/support");
      noInventedUi();
    });

    it("renders an enrolled zero-record course identically in desktop and mobile without a100% rate", () => {
      mocks.overview.data = overviewFor([]);
      render(pageTree());
      const region = screen.getByRole("region", { name: copy.byCourseTitle });
      expect(within(region).getAllByText(course.name)).toHaveLength(2);
      expect(within(region).getAllByText(copy.notMeasured, { exact: false })).toHaveLength(2);
      expect(within(region).queryByText(percent(100))).not.toBeInTheDocument();
      expect(within(region).getByText(`${number(0)} / ${number(0)}`)).toBeInTheDocument();
      noInventedUi();
    });

    it("renders actual zero percent rather than missing-data or perfect-attendance copy", () => {
      mocks.overview.data = overviewFor(["absent", "absent", "absent"]);
      render(pageTree());
      expect(screen.getByTestId("attendance-rate")).toHaveTextContent(percent(0));
      expect(screen.queryByText(copy.noRecords)).not.toBeInTheDocument();
      expect(screen.queryByText(copy.notMeasured)).not.toBeInTheDocument();
      expect(screen.getByTestId("attendance-trend-fill")).toHaveStyle({ height: "0%" });
      const rail = screen.getByRole("complementary", { name: copy.rail.label });
      expect(within(rail).getByText(copy.status.absent).nextElementSibling).toHaveTextContent(number(3));
      expect(within(rail).getByRole("heading", { name: copy.rail.absencesByCourse })).toBeInTheDocument();
      noInventedUi();
    });

    it("uses actual mixed counts in both course layouts and supplied attention without praise", () => {
      render(pageTree());
      expect(screen.getByTestId("attendance-rate")).toHaveTextContent(percent(50));
      const courses = screen.getByRole("region", { name: copy.byCourseTitle });
      expect(within(courses).getAllByText(course.name)).toHaveLength(2);
      expect(within(courses).getAllByText(percent(50), { exact: false })).toHaveLength(2);
      expect(within(courses).getByText(`${number(2)} / ${number(4)}`)).toBeInTheDocument();
      const rail = screen.getByRole("complementary", { name: copy.rail.label });
      expect(within(rail).getByText(copy.totalSessions).nextElementSibling).toHaveTextContent(number(4));
      expect(within(rail).getByText(copy.attended).nextElementSibling).toHaveTextContent(number(2));
      expect(within(rail).getByText(i18n.t("parentAttendance.rail.attentionMessage", { course: course.name, missed: number(1) }))).toBeInTheDocument();
      noInventedUi();
    });

    it("labels excused explicitly, keeps backend session text, and filters actual records", () => {
      render(pageTree());
      const recent = screen.getByRole("region", { name: copy.recentTitle });
      expect(within(recent).getAllByRole("listitem")).toHaveLength(2);
      fireEvent.click(within(recent).getByRole("button", { name: copy.filters.all }));
      expect(within(recent).getAllByRole("listitem")).toHaveLength(4);
      const excused = within(recent).getByText(copy.status.excused, { selector: '[data-slot="badge"]' });
      expect(excused).toHaveClass("bg-muted", "text-foreground");
      expect(excused.closest("li")).not.toHaveTextContent(copy.status.present);
      expect(within(recent).getAllByText("studio · Documentary sources")).toHaveLength(4);
      fireEvent.click(within(recent).getByRole("button", { name: copy.status.late }));
      expect(within(recent).getAllByRole("listitem")).toHaveLength(1);
      expect(within(recent).getByText(copy.status.late, { selector: '[data-slot="badge"]' })).toHaveClass("bg-(--warning-subtle)", "text-(--warning-foreground)");
      fireEvent.click(within(recent).getByRole("button", { name: copy.status.absent }));
      expect(within(recent).getAllByRole("listitem")).toHaveLength(1);
      expect(within(recent).getByText(copy.status.absent, { selector: '[data-slot="badge"]' })).toHaveClass("bg-(--error-subtle)", "text-(--error-foreground)");
    });

    it("does not turn an excused-only trend's zero denominator into measured100%", () => {
      const overview = overviewFor(["excused"]);
      expect(overview.trend[0]?.attendanceRate).toBe(100);
      mocks.overview.data = overview;
      render(pageTree());
      expect(screen.getByTestId("attendance-rate")).toHaveTextContent(percent(0));
      const trend = screen.getByRole("region", { name: copy.trendTitle });
      expect(within(trend).getByText(copy.notMeasured)).toBeInTheDocument();
      expect(within(trend).queryByText(percent(100))).not.toBeInTheDocument();
      expect(screen.queryByTestId("attendance-trend-fill")).not.toBeInTheDocument();
      expect(screen.queryByRole("heading", { name: copy.rail.absencesByCourse })).not.toBeInTheDocument();
    });

    it("uses empty section messages, never arrays of demonstration courses or weeks", () => {
      mocks.overview.data = { ...overviewFor(), courses: [], trend: [], recentExceptions: [], attention: undefined };
      render(pageTree());
      expect(screen.getByText(copy.noCourses)).toBeInTheDocument();
      expect(screen.getByText(copy.noTrend)).toBeInTheDocument();
      expect(screen.getByText(copy.noMatchingRecords)).toBeInTheDocument();
      expect(screen.queryAllByTestId("attendance-trend-fill")).toHaveLength(0);
      expect(screen.queryByRole("heading", { name: copy.rail.absencesByCourse })).not.toBeInTheDocument();
      noInventedUi();
    });

    it("formats real date-only values in the active locale without timezone day shifts", () => {
      mocks.overview.data = overviewFor(["present"]);
      render(pageTree());
      const expectedDate = new Intl.DateTimeFormat(language, { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" }).format(new Date("2027-01-01"));
      const rail = screen.getByRole("complementary", { name: copy.rail.label });
      expect(within(rail).getAllByText(expectedDate)).toHaveLength(2);
      expect(screen.getByTestId("attendance-rate")).toHaveTextContent(percent(100));
      expect(screen.queryByText(/parentAttendance\./)).not.toBeInTheDocument();
      expect(screen.getAllByRole("combobox")).toHaveLength(1);
      expect(screen.getByText(copy.availableRecords)).toBeInTheDocument();
      noInventedUi();
    });

    it("passes actual course selections to the query and resets them when switching children", async () => {
      const user = userEvent.setup();
      mocks.children.data = [firstChild, secondChild];
      mocks.attendance.mockImplementation((id: string) => ({ ...mocks.overview, data: overviewFor(undefined, id === secondChild.student_id ? secondChild : firstChild) }));
      render(pageTree());
      expect(mocks.linkedChildren).toHaveBeenCalledWith("parent-1");
      expect(mocks.attendance).toHaveBeenLastCalledWith(firstChild.student_id, { courseId: undefined });
      await user.click(screen.getByRole("combobox", { name: copy.courseFilter }));
      await user.click(within(await screen.findByRole("listbox")).getByRole("option", { name: `${course.code} · ${course.name}` }));
      expect(mocks.attendance).toHaveBeenLastCalledWith(firstChild.student_id, { courseId: course.courseId });
      await user.click(screen.getByRole("button", { name: secondChild.student_name }));
      expect(mocks.attendance).toHaveBeenLastCalledWith(secondChild.student_id, { courseId: undefined });
      expect(screen.getByRole("combobox", { name: copy.courseFilter })).toHaveTextContent(copy.allCourses);
      expect(screen.getByRole("button", { name: secondChild.student_name })).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByRole("button", { name: secondChild.student_name })).toHaveClass("border-primary", "bg-accent", "text-accent-foreground");
      expect(screen.getByRole("button", { name: firstChild.student_name })).toHaveAttribute("aria-pressed", "false");
    });

    it("resolves a removed selection from the remaining linked children instead of querying the stale child", () => {
      mocks.children.data = [firstChild, secondChild];
      mocks.attendance.mockImplementation((id: string) => ({ ...mocks.overview, data: overviewFor(undefined, id === secondChild.student_id ? secondChild : firstChild) }));
      const { rerender } = render(pageTree());
      fireEvent.click(screen.getByRole("button", { name: secondChild.student_name }));
      mocks.children.data = [firstChild];
      rerender(pageTree());
      expect(mocks.attendance).toHaveBeenLastCalledWith(firstChild.student_id, { courseId: undefined });
      expect(screen.getByTestId("attendance-rate")).toHaveTextContent(percent(50));
    });
  });
}

it("keeps the real97% canonical fixture valid instead of banning legitimate values", async () => {
  await i18n.changeLanguage("en");
  mocks.overview.data = overviewFor([
    ...Array<AttendanceStatus>(115).fill("present"), "late", ...Array<AttendanceStatus>(4).fill("absent"),
  ]);
  render(pageTree());
  expect(screen.getByTestId("attendance-rate")).toHaveTextContent("97%");
  const rail = screen.getByRole("complementary", { name: en.parentAttendance.rail.label });
  expect(within(rail).getByText(en.parentAttendance.totalSessions).nextElementSibling).toHaveTextContent("120");
  expect(within(rail).getByText(en.parentAttendance.attended).nextElementSibling).toHaveTextContent("116");
});

it("an independently mounted rail never invents an overview", () => {
  render(<I18nextProvider i18n={i18n}><MemoryRouter><ParentAttendanceRail /></MemoryRouter></I18nextProvider>);
  expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
});

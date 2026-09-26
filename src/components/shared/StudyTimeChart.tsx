// Weekly study records as supplied by the caller; no fixed period or domain inference.
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from "recharts";
import { Button, Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/design-system/primitives";
import { VisualizationFrame } from "@/design-system/patterns";
import { useAccessibilityPreferenceControls } from "@/hooks/useAccessibilityPreferences";
import type { WeeklyStudyData } from "@/types/planner";
import { TrendingUp } from "lucide-react";

interface StudyTimeChartProps {
  data: WeeklyStudyData[];
  averageMinutesPerWeek: number;
  /** Undefined uses local selection; null is an explicitly controlled All Courses. */
  courseFilter?: string | null;
  courseOptions?: Array<{ id: string; name: string }>;
  onCourseFilterChange?: (courseId: string | null) => void;
  className?: string;
}

/** Validate date-only input without parsing it in the viewer's local time zone. */
function calendarDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]), month = Number(match[2]), day = Number(match[3]);
  if (year < 1) return null;
  const result = new Date(0);
  result.setUTCFullYear(year, month - 1, day);
  result.setUTCHours(0, 0, 0, 0);
  return result.getUTCFullYear() === year && result.getUTCMonth() === month - 1 && result.getUTCDate() === day ? result : null;
}

const StudyTimeChart = ({ data, averageMinutesPerWeek, courseFilter, courseOptions = [], onCourseFilterChange, className }: StudyTimeChartProps) => {
  const { t, i18n } = useTranslation("common");
  const { effective } = useAccessibilityPreferenceControls();
  const [localFilter, setLocalFilter] = useState<string | null>(null);
  const selected = courseFilter === undefined ? localFilter : courseFilter;
  const locale = i18n.resolvedLanguage ?? i18n.language;
  const isRtl = i18n.dir() === "rtl";
  const numbers = useMemo(() => new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }), [locale]);
  const dates = useMemo(() => new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", day: "numeric", calendar: "gregory", timeZone: "UTC" }), [locale]);
  const chartData = useMemo(() => data.map((record) => {
    const date = calendarDate(record.weekStartDate);
    return {
      weekStartDate: record.weekStartDate,
      weekLabel: date ? dates.format(date) : record.weekStartDate
        ? t("studyTimeChart.invalidDate", { value: record.weekStartDate }) : t("studyTimeChart.dateUnavailable"),
      validDate: date !== null,
      // Preserve the existing conversion/rounding exactly for finite observations.
      hours: Number.isFinite(record.totalMinutes) ? Math.round((record.totalMinutes / 60) * 10) / 10 : null,
    };
  }), [data, dates, t]);
  const averageHours = Number.isFinite(averageMinutesPerWeek) ? Math.round((averageMinutesPerWeek / 60) * 10) / 10 : null;
  const hours = (value: unknown) => typeof value === "number" && Number.isFinite(value)
    ? t("studyTimeChart.hours", { value: numbers.format(value) }) : t("studyTimeChart.unavailable");
  const average = averageHours === null ? t("studyTimeChart.averageUnavailable") : t("studyTimeChart.average", { hours: hours(averageHours) });
  const unavailableCount = chartData.filter((record) => record.hours === null).length;
  const summary = chartData.length ? [
    t("studyTimeChart.summary", { recordCount: numbers.format(chartData.length), average }),
    unavailableCount ? t("studyTimeChart.missingRecords", { recordCount: numbers.format(unavailableCount) }) : "",
  ].filter(Boolean).join(" ") : t("studyTimeChart.emptySummary");
  const changeFilter = (id: string | null) => {
    if (courseFilter === undefined) setLocalFilter(id);
    onCourseFilterChange?.(id);
  };
  const controls = courseOptions.length > 0 ? <div role="group" aria-label={t("studyTimeChart.courseFilter")}
    className="flex min-w-0 flex-wrap gap-2" data-testid="course-filter-toggles">
    <Button type="button" variant={selected === null ? "default" : "outline"}
      className="h-auto min-h-11 max-w-full whitespace-normal [overflow-wrap:anywhere]" aria-pressed={selected === null} onClick={() => changeFilter(null)}>
      {t("studyTimeChart.allCourses")}
    </Button>
    {courseOptions.map((course) => <Button key={course.id} type="button" variant={selected === course.id ? "default" : "outline"}
      className="h-auto min-h-11 max-w-full whitespace-normal [overflow-wrap:anywhere]" aria-pressed={selected === course.id} onClick={() => changeFilter(course.id)}>
      {course.name}
    </Button>)}
  </div> : undefined;
  const dataTable = <Table>
    <TableCaption>{t("studyTimeChart.dataTitle")}</TableCaption>
    <TableHeader><TableRow>
      <TableHead scope="col" className="text-start">{t("studyTimeChart.weekStarting")}</TableHead>
      <TableHead scope="col" className="text-end">{t("studyTimeChart.studyHours")}</TableHead>
    </TableRow></TableHeader>
    <TableBody>{chartData.map((record, index) => <TableRow key={`${record.weekStartDate}-${index}`}>
      <TableHead scope="row" className="whitespace-normal text-start font-normal [overflow-wrap:anywhere]">
        {record.validDate ? <time dateTime={record.weekStartDate}>{record.weekLabel}</time> : record.weekLabel}
      </TableHead>
      <TableCell className="text-end tabular-nums">{hours(record.hours)}</TableCell>
    </TableRow>)}</TableBody>
  </Table>;

  return <VisualizationFrame title={t("studyTimeChart.title")} summary={summary} icon={TrendingUp}
    className={className} controls={controls} dir={i18n.dir()} data-testid="study-time-chart"
    dataDisclosure={chartData.length ? {
      label: t("studyTimeChart.dataTitle"), showLabel: t("studyTimeChart.showData"), hideLabel: t("studyTimeChart.hideData"), content: dataTable,
    } : undefined}>
    {!chartData.length ? <p className="py-8 text-center text-sm text-muted-foreground">{t("studyTimeChart.empty")}</p> : <>
      <div className="h-72 min-w-0">
        {/* Native responsive measurement; no guessed initial SVG dimensions. */}
        <BarChart responsive className="h-full w-full" data={chartData} margin={{ top: 12, right: 12, bottom: 8, left: 12 }} accessibilityLayer aria-label={t("studyTimeChart.title")}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="weekLabel" reversed={isRtl} tick={{ fontSize: "0.875rem", fill: "var(--muted-foreground)" }}
            tickLine={false} axisLine={false} minTickGap={24} height={48} />
          <YAxis orientation={isRtl ? "right" : "left"} width="auto" tick={{ fontSize: "0.875rem", fill: "var(--muted-foreground)" }}
            tickLine={false} axisLine={false} tickFormatter={hours} />
          <Tooltip formatter={(value) => [hours(value), t("studyTimeChart.weeklyHours")]}
            isAnimationActive={effective.reduced_animations ? false : "auto"}
            cursor={{ fill: "var(--muted)", fillOpacity: 0.5 }}
            contentStyle={{ backgroundColor: "var(--popover)", color: "var(--popover-foreground)", border: "1px solid var(--border)", borderRadius: "var(--radius)", fontSize: "0.875rem" }}
            labelStyle={{ color: "var(--popover-foreground)" }} itemStyle={{ color: "var(--popover-foreground)" }} />
          {averageHours !== null && averageHours > 0 && <ReferenceLine y={averageHours} stroke="var(--muted-foreground)" strokeDasharray="6 4" />}
          <Bar dataKey="hours" name={t("studyTimeChart.weeklyHours")} fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={40}
            isAnimationActive={effective.reduced_animations ? false : "auto"} />
        </BarChart>
      </div>
      <div className="mt-3 flex min-w-0 flex-wrap items-center gap-4 text-sm text-muted-foreground" aria-hidden="true">
        <span className="inline-flex items-center gap-2"><span className="size-3 shrink-0 rounded-sm bg-chart-1" />{t("studyTimeChart.weeklyHours")}</span>
        {averageHours !== null && averageHours > 0 && <span className="inline-flex items-center gap-2"><span className="w-5 border-t-2 border-dashed border-muted-foreground" />{average}</span>}
      </div>
    </>}
  </VisualizationFrame>;
};

export default StudyTimeChart;
export type { StudyTimeChartProps };

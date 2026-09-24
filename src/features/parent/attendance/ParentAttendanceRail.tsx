import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { CalendarDays, CircleHelp, ClipboardList } from "lucide-react";
import { Button, RailCard, SectionHeader } from "@/design-system";
import type { ParentAttendanceOverview } from "@/hooks/useAttendance";

interface ParentAttendanceRailProps {
  overview?: ParentAttendanceOverview;
}

export const ParentAttendanceRail = ({ overview }: ParentAttendanceRailProps) => {
  const { t, i18n } = useTranslation("common");
  // The page owns query states; an independently mounted rail must never invent data.
  if (!overview) return null;

  const { totals, period, attention } = overview;
  const locale = i18n.resolvedLanguage ?? i18n.language;
  const numbers = new Intl.NumberFormat(locale);
  const dates = new Intl.DateTimeFormat(locale, {
    year: "numeric", month: "short", day: "numeric", timeZone: "UTC",
  });
  const formatDate = (value: string) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? t("parentAttendance.notMeasured") : dates.format(date);
  };

  return (
    <aside aria-label={t("parentAttendance.rail.label")} className="min-w-0 space-y-4">
      <RailCard>
        <SectionHeader icon={CalendarDays} title={t("parentAttendance.rail.summaryTitle")} />
        <dl className="mt-4 space-y-3 text-sm">
          {[
            [t("parentAttendance.totalSessions"), numbers.format(totals.totalSessions)],
            [t("parentAttendance.attended"), numbers.format(totals.attended)],
            [t("parentAttendance.status.absent"), numbers.format(totals.absent)],
            [t("parentAttendance.status.late"), numbers.format(totals.late)],
            [t("parentAttendance.status.excused"), numbers.format(totals.excused)],
            [t("parentAttendance.listedCourses"), numbers.format(overview.courses.length)],
          ].map(([label, value]) => (
            <div key={label} className="flex min-w-0 justify-between gap-3">
              <dt className="break-words text-muted-foreground">{label}</dt>
              <dd className="shrink-0 font-semibold tabular-nums text-foreground">{value}</dd>
            </div>
          ))}
        </dl>
        {/* Empty builder dates are defaults, not an observed reporting period. */}
        {totals.totalSessions > 0 && (
          <div className="mt-4 space-y-1 border-t border-border pt-3 text-xs text-muted-foreground">
            <p>{t("parentAttendance.recordedPeriod")}</p>
            <p>
              <time dateTime={period.dateFrom}>{formatDate(period.dateFrom)}</time>
              {" – "}
              <time dateTime={period.dateTo}>{formatDate(period.dateTo)}</time>
            </p>
          </div>
        )}
      </RailCard>

      {attention && (
        <RailCard>
          <SectionHeader icon={ClipboardList} title={t("parentAttendance.rail.absencesByCourse")} />
          <p className="mt-3 break-words text-sm text-foreground">
            {t("parentAttendance.rail.attentionMessage", {
              course: attention.courseName,
              missed: numbers.format(attention.absenceCount),
            })}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">{t("parentAttendance.rail.filterHint")}</p>
        </RailCard>
      )}

      <RailCard>
        <SectionHeader icon={CircleHelp} title={t("parentAttendance.rail.needHelp")} />
        <p className="mt-3 text-sm text-muted-foreground">{t("parentAttendance.rail.helpBody")}</p>
        <Button asChild variant="outline" className="mt-4 h-auto min-h-11 max-w-full whitespace-normal text-start">
          <Link to="/parent/support">{t("parentAttendance.rail.getSupport")}</Link>
        </Button>
      </RailCard>
    </aside>
  );
};

export default ParentAttendanceRail;

import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { BookOpen, Target } from "lucide-react";
import { Badge, Button, PageHeader, PCard, SectionCard, StatePanel } from "@/design-system";
import { useAuth } from "@/hooks/useAuth";
import { useStudentAcademicSummary } from "@/hooks/useStudentProgress";
import { classifyAttainment } from "@/lib/attainmentClassifier";

const validPercent = (value: number | null | undefined): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100;

/** Recorded results only; missing measurements never become a failing score. */
export default function StudentProgressScreen() {
  const { t, i18n } = useTranslation("student");
  const { user } = useAuth();
  const summary = useStudentAcademicSummary(user?.id);
  const numbers = new Intl.NumberFormat(i18n.resolvedLanguage ?? i18n.language);
  const percentages = new Intl.NumberFormat(i18n.resolvedLanguage ?? i18n.language, {
    style: "percent", maximumFractionDigits: 1,
  });
  const percent = (value: number) => percentages.format(value / 100);
  const unavailable = t("progress.notMeasured");
  const count = (value: number | undefined) => typeof value === "number" &&
    Number.isSafeInteger(value) && value >= 0 ? numbers.format(value) : unavailable;
  const coursePath = (id: string) => `/student/courses/${encodeURIComponent(id)}`;
  const retry = (
    <Button variant="outline" disabled={summary.isFetching} onClick={() => void summary.refetch()}>
      {t("progress.retry")}
    </Button>
  );

  let content;
  if (!user?.id) {
    content = <StatePanel variant="permission" message={t("progress.signInRequired")} />;
  } else if (summary.isError) {
    content = <StatePanel variant="error" message={t("progress.loadError")} action={retry} />;
  } else if (summary.isPending) {
    content = <StatePanel variant="loading" message={t(summary.fetchStatus === "paused" ? "progress.waitingConnection" : "progress.loading")} />;
  } else if (!summary.data) {
    content = <StatePanel variant="error" message={t("progress.unavailable")} action={retry} />;
  } else if (summary.data.activeCourseCount === 0 && summary.data.perCourse.length === 0) {
    content = <StatePanel variant="empty" message={t("progress.noCourses")} action={
      <Button asChild variant="outline"><Link to="/student/courses">{t("progress.browseCourses")}</Link></Button>
    } />;
  } else {
    const data = summary.data;
    // Keep canonical averages/band counts unchanged. Withhold their presentation
    // if they include an unrecorded course's numeric fallback or invalid result.
    const fullyRecorded = data.activeCourseCount > 0 &&
      data.recordedCourseCount === data.activeCourseCount &&
      data.perCourse.length === data.activeCourseCount &&
      data.perCourse.every((course) => course.attainmentRecorded === true && validPercent(course.attainment_percent));
    const metrics = [
      { key: "enrolledCourses", value: count(data.activeCourseCount) },
      { key: "recordedCourses", value: count(data.recordedCourseCount) },
      { key: "overallAttainment", value: fullyRecorded && validPercent(data.averageMastery) ? percent(data.averageMastery) : unavailable },
      { key: "excellentCourses", value: fullyRecorded ? count(data.excellentCount) : unavailable },
    ];
    const focus = data.weakestClo;
    const focusIsRecorded = focus && validPercent(focus.mastery) &&
      data.perCourse.some((course) => course.course_id === focus.courseId);

    content = <>
      <dl className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => <PCard key={metric.key} className="min-w-0 space-y-2 p-4">
          <dt className="break-words text-sm text-muted-foreground">{t(`progress.${metric.key}`)}</dt>
          <dd className="break-words text-xl font-semibold tabular-nums text-foreground">{metric.value}</dd>
        </PCard>)}
      </dl>
      {!fullyRecorded && <StatePanel variant="partial" message={t("progress.partial", {
        recorded: count(data.recordedCourseCount), total: count(data.activeCourseCount),
      })} />}
      <SectionCard icon={Target} title={t("progress.focusTitle")}>
        {focusIsRecorded ? <div className="flex min-w-0 flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 basis-64 grow space-y-2">
            <h3 className="break-words text-base font-semibold text-foreground"><bdi>{focus.title.trim() || t("progress.unnamedOutcome")}</bdi></h3>
            <p className="text-lg font-semibold tabular-nums text-(--progress-attention)">{percent(focus.mastery)}</p>
            <p className="break-words text-sm text-muted-foreground">{t("progress.focusDescription")}</p>
          </div>
          <Button asChild variant="outline" className="h-auto min-h-11 max-w-full whitespace-normal">
            <Link to={coursePath(focus.courseId)}>{t("progress.reviewCourse")}</Link>
          </Button>
        </div> : <p className="text-sm text-muted-foreground">{t("progress.noOutcomeEvidence")}</p>}
      </SectionCard>
      <SectionCard icon={BookOpen} title={t("progress.byCourse")}>
        <ul className="min-w-0 divide-y divide-border">
          {data.perCourse.map((course) => {
            const recorded = course.attainmentRecorded === true && validPercent(course.attainment_percent);
            const title = course.course_name.trim() || t("progress.unnamedCourse");
            const code = course.course_code.trim();
            return <li key={course.course_id} className="min-w-0 space-y-3 py-4 first:pt-0 last:pb-0">
              <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
                <div className="min-w-0 basis-64 grow space-y-1">
                  {code && <Badge variant="outline" className="max-w-full whitespace-normal"><bdi className="min-w-0 [overflow-wrap:anywhere]">{code}</bdi></Badge>}
                  <div>
                    <Button asChild variant="link" className="h-auto min-h-11 min-w-11 max-w-full justify-start whitespace-normal p-0 text-start text-base">
                      <Link to={coursePath(course.course_id)} aria-label={code ? t("progress.openCourse", { course: title, code }) : title}>
                        <bdi className="min-w-0 [overflow-wrap:anywhere]">{title}</bdi>
                      </Link>
                    </Button>
                  </div>
                </div>
                <div className="min-w-0 space-y-1">
                  <p className="break-words text-lg font-semibold tabular-nums text-foreground">{recorded ? percent(course.attainment_percent) : unavailable}</p>
                  {recorded && <p className="text-sm text-muted-foreground">{t(`progress.bands.${classifyAttainment(course.attainment_percent)}`)}</p>}
                </div>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm tabular-nums text-muted-foreground">
                <p>{t("progress.outcomeCount", { value: count(course.clo_count) })}</p>
                <p>{t("progress.sampleCount", { value: count(course.evidence_count) })}</p>
              </div>
            </li>;
          })}
        </ul>
      </SectionCard>
    </>;
  }

  return <div className="min-w-0 space-y-6">
    <header className="space-y-2">
      <PageHeader title={t("progress.title")} action={user?.id ?
        <Button asChild variant="outline"><Link to="/student/tutor">{t("progress.openTutor")}</Link></Button> : undefined} />
      <p className="max-w-prose text-sm text-muted-foreground">{t("progress.subtitle")}</p>
    </header>
    {content}
  </div>;
}

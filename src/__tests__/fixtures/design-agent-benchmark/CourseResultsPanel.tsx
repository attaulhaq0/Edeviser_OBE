import { PCard, SectionHeader, StatePanel } from "@/design-system/patterns";
import { Button } from "@/design-system/primitives";
import type { CourseResultsPanelProps } from "@/__tests__/fixtures/design-agent-benchmark/types";

// Isolated design benchmark: caller-owned data, copy and retry; no runtime route,
// query, academic calculation, implicit percentage, or theme/locale root mutation.
// Uses the existing app stylesheet and i18next provider, like the catalog patterns.
export const CourseResultsPanel = ({
  language,
  labels,
  state,
  headingLevel = "h2",
}: CourseResultsPanelProps) => {
  const content = (() => {
    switch (state.status) {
      case "loading":
        return <StatePanel variant="loading" message={labels.loading} />;
      case "unavailable":
        // The catalog has no unavailable variant. Partial is a neutral, polite
        // announcement; do not misrepresent missing data as empty or forbidden.
        return <StatePanel variant="partial" message={labels.unavailable} />;
      case "error":
        return (
          <StatePanel
            variant="error"
            message={labels.error}
            action={<Button type="button" variant="outline" onClick={state.onRetry}>{labels.retry}</Button>}
          />
        );
      case "loaded":
        if (state.courses.length === 0) {
          return <StatePanel variant="empty" message={labels.empty} />;
        }
        return (
          <PCard>
            <ul aria-label={labels.courseList} className="divide-y divide-border">
              {state.courses.map((course) => (
                <li key={course.id} className="flex min-w-0 flex-wrap items-start gap-4 p-4">
                  <p className="min-w-0 basis-56 grow font-medium [overflow-wrap:anywhere]">
                    <bdi dir="auto">{course.name}</bdi>
                  </p>
                  <dl className="min-w-0 basis-40 grow [overflow-wrap:anywhere]">
                    <dt className="text-sm text-muted-foreground">{labels.result}</dt>
                    <dd className="text-sm">
                      {course.result === null ? (
                        <span className="text-muted-foreground">{labels.missingResult}</span>
                      ) : (
                        <>
                          <bdi dir="auto" className="font-semibold tabular-nums">{course.result.value}</bdi>
                          <span className="block text-muted-foreground"><bdi dir="auto">{course.result.scaleLabel}</bdi></span>
                        </>
                      )}
                    </dd>
                  </dl>
                </li>
              ))}
            </ul>
          </PCard>
        );
    }
  })();

  return (
    <section
      aria-label={labels.title}
      lang={language}
      dir={language === "ar" ? "rtl" : "ltr"}
      className="min-w-0 space-y-4 text-start"
    >
      <SectionHeader as={headingLevel} title={labels.title} description={labels.description} />
      {content}
    </section>
  );
};

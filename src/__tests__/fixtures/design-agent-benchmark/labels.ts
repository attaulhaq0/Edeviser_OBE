import type {
  CourseResultsLabels,
  CourseResultsLanguage,
} from "@/__tests__/fixtures/design-agent-benchmark/types";

// Test-owned copy only: no production locale or translation singleton mutation.
export const courseResultsLabels = {
  en: {
    title: "Course results",
    description: "Recorded results in their supplied scales. Missing results are shown separately.",
    courseList: "Courses and recorded results",
    result: "Recorded result",
    missingResult: "Result unavailable",
    loading: "Loading course results…",
    unavailable: "Course results are unavailable. No course list has been supplied.",
    empty: "No courses in this list.",
    error: "Course results could not be shown. Try again.",
    retry: "Try again",
  },
  ar: {
    title: "نتائج المقررات",
    description: "النتائج المسجلة وفق مقاييسها المقدمة. تُعرض النتائج غير المتوفرة بشكل منفصل.",
    courseList: "المقررات والنتائج المسجلة",
    result: "النتيجة المسجلة",
    missingResult: "النتيجة غير متوفرة",
    loading: "جارٍ تحميل نتائج المقررات…",
    unavailable: "نتائج المقررات غير متوفرة. لم تُقدَّم قائمة مقررات.",
    empty: "لا توجد مقررات في هذه القائمة.",
    error: "تعذّر عرض نتائج المقررات. حاول مرة أخرى.",
    retry: "حاول مرة أخرى",
  },
} as const satisfies Record<CourseResultsLanguage, CourseResultsLabels>;

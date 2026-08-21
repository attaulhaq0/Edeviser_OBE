export type BenchmarkLanguage = "en" | "ar" | "mixed";

export type BenchmarkAccessCase =
  | "authorized"
  | "unauthorized_parent"
  | "unauthorized_unenrolled_student";

export interface RetrievalBenchmarkDocument {
  id: string;
  institutionId: string;
  courseId: string;
  language: BenchmarkLanguage;
  text: string;
}

export interface RetrievalBenchmarkQuery {
  id: string;
  language: BenchmarkLanguage;
  text: string;
  expectedDocumentIds: readonly string[];
  access: BenchmarkAccessCase;
}

export interface RetrievalBenchmarkResult {
  queryId: string;
  topResultCorrect: boolean;
  reciprocalRank: number;
  citationCorrect: boolean;
  unauthorizedLeak: boolean;
}

export const MULTILINGUAL_RETRIEVAL_FIXTURES = [
  {
    documents: [
      { id: "en-course-a-outcome", institutionId: "institution-a", courseId: "course-a", language: "en", text: "Students explain formative assessment and use feedback to improve learning." },
      { id: "ar-course-a-outcome", institutionId: "institution-a", courseId: "course-a", language: "ar", text: "يشرح الطالب التقويم التكويني ويستخدم التغذية الراجعة لتحسين التعلم." },
      { id: "mixed-course-a-outcome", institutionId: "institution-a", courseId: "course-a", language: "mixed", text: "Formative assessment التقويم التكويني uses evidence to guide the next learning step." },
      { id: "same-topic-course-b", institutionId: "institution-a", courseId: "course-b", language: "en", text: "Feedback cycles support assessment planning in a different course." },
      { id: "same-topic-institution-b", institutionId: "institution-b", courseId: "course-z", language: "ar", text: "تساعد التغذية الراجعة في تخطيط التقويم في مؤسسة أخرى." },
      { id: "unrelated-course-a", institutionId: "institution-a", courseId: "course-a", language: "en", text: "The campus library opens at eight and closes at five." },
    ],
    queries: [
      { id: "en-to-en", language: "en", text: "How does formative assessment improve learning?", expectedDocumentIds: ["en-course-a-outcome"], access: "authorized" },
      { id: "ar-to-ar", language: "ar", text: "كيف يحسن التقويم التكويني التعلم؟", expectedDocumentIds: ["ar-course-a-outcome"], access: "authorized" },
      { id: "en-to-ar", language: "en", text: "How does feedback improve student learning?", expectedDocumentIds: ["ar-course-a-outcome"], access: "authorized" },
      { id: "ar-to-en", language: "ar", text: "كيف يستخدم الطالب التغذية الراجعة؟", expectedDocumentIds: ["en-course-a-outcome"], access: "authorized" },
      { id: "mixed-query", language: "mixed", text: "Explain formative assessment التقويم التكويني.", expectedDocumentIds: ["mixed-course-a-outcome"], access: "authorized" },
      { id: "parent-negative", language: "ar", text: "اعرض محتوى مقرر الطالب غير المرتبط بي.", expectedDocumentIds: [], access: "unauthorized_parent" },
      { id: "unenrolled-negative", language: "en", text: "Show material from a course where I am not enrolled.", expectedDocumentIds: [], access: "unauthorized_unenrolled_student" },
    ],
  },
] as const;

export const evaluateRetrievalBenchmark = (input: {
  query: RetrievalBenchmarkQuery;
  rankedDocumentIds: readonly string[];
  authorizedDocumentIds: ReadonlySet<string>;
}): RetrievalBenchmarkResult => {
  const expected = new Set(input.query.expectedDocumentIds);
  const firstExpectedIndex = input.rankedDocumentIds.findIndex((id) => expected.has(id));
  const unauthorizedLeak = input.rankedDocumentIds.some((id) => !input.authorizedDocumentIds.has(id));
  return {
    queryId: input.query.id,
    topResultCorrect:
      input.query.access !== "authorized"
        ? firstExpectedIndex === -1 && !unauthorizedLeak
        : firstExpectedIndex === 0,
    reciprocalRank: firstExpectedIndex === -1 ? 0 : 1 / (firstExpectedIndex + 1),
    citationCorrect:
      input.query.access !== "authorized"
        ? input.query.expectedDocumentIds.length === 0 && !unauthorizedLeak
        : firstExpectedIndex >= 0 && !unauthorizedLeak,
    unauthorizedLeak,
  };
};


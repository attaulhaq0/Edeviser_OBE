import { z } from "zod";

const MAX_PDF_BYTES = 5 * 1024 * 1024;
const responseSchema = z.object({
  success: z.literal(true),
  pdf_base64: z
    .string()
    .min(8)
    .max(Math.ceil(MAX_PDF_BYTES / 3) * 4)
    .regex(/^[A-Za-z0-9+/]+={0,2}$/),
  file_type: z.literal("pdf"),
  report_kind: z.literal("normalized_course_snapshot"),
  course_name: z.string().min(1),
  course_code: z.string().min(1),
  semester: z.string().min(1),
  generated_at: z.string().datetime({ offset: true }),
});

export const courseFileErrorKeys = {
  UNAUTHORIZED: "courseFileErrors.unauthorized",
  FORBIDDEN: "courseFileErrors.forbidden",
  COURSE_UNAVAILABLE: "courseFileErrors.courseUnavailable",
  SEMESTER_MISMATCH: "courseFileErrors.semesterMismatch",
  INVALID_REQUEST: "courseFileErrors.invalidRequest",
  REPORT_TOO_LARGE: "courseFileErrors.tooLarge",
  INVALID_SOURCE_DATA: "courseFileErrors.invalidSource",
  DATA_UNAVAILABLE: "courseFileErrors.dataUnavailable",
  GENERATION_FAILED: "courseFileErrors.failed",
  INVALID_RESPONSE: "courseFileErrors.invalidResponse",
  NETWORK_ERROR: "courseFileErrors.network",
} as const;
export type CourseFileErrorCode = keyof typeof courseFileErrorKeys;
export class CourseFileClientError extends Error {
  constructor(
    public readonly code: CourseFileErrorCode,
    public readonly status?: number
  ) {
    super(code);
  }
}
function readCode(value: unknown): CourseFileErrorCode | undefined {
  if (
    !value ||
    typeof value !== "object" ||
    !("code" in value) ||
    typeof value.code !== "string"
  )
    return undefined;
  return Object.prototype.hasOwnProperty.call(courseFileErrorKeys, value.code)
    ? (value.code as CourseFileErrorCode)
    : undefined;
}

/** Parse Supabase FunctionsHttpError's response without exposing raw backend details. */
export async function courseFileInvocationError(
  error: unknown,
  data: unknown
): Promise<CourseFileClientError> {
  let status: number | undefined;
  let code = readCode(data);
  if (
    error &&
    typeof error === "object" &&
    "context" in error &&
    error.context instanceof Response
  ) {
    status = error.context.status;
    try {
      code = readCode(await error.context.clone().json()) ?? code;
    } catch {
      /* Non-JSON gateway errors use status fallback. */
    }
  }
  code ??=
    status === 401
      ? "UNAUTHORIZED"
      : status === 403
      ? "FORBIDDEN"
      : status
      ? "GENERATION_FAILED"
      : error
      ? "NETWORK_ERROR"
      : "GENERATION_FAILED";
  return new CourseFileClientError(code, status);
}

/** Strictly reject legacy URL-only, malformed or non-PDF successes. */
export function parseCourseFileResponse(data: unknown) {
  const parsed = responseSchema.safeParse(data);
  if (!parsed.success) throw new CourseFileClientError("INVALID_RESPONSE");
  let binary: string;
  try {
    binary = atob(parsed.data.pdf_base64);
  } catch {
    throw new CourseFileClientError("INVALID_RESPONSE");
  }
  if (!binary.startsWith("%PDF-") || binary.length > MAX_PDF_BYTES)
    throw new CourseFileClientError("INVALID_RESPONSE");
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  const {
    success,
    file_type,
    report_kind,
    course_name,
    course_code,
    semester,
    generated_at,
  } = parsed.data;
  return {
    metadata: {
      success,
      file_type,
      report_kind,
      course_name,
      course_code,
      semester,
      generated_at,
    },
    blob: new Blob([bytes], { type: "application/pdf" }),
  };
}

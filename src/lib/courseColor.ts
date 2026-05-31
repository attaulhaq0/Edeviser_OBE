/**
 * Deterministic course color resolution for student course cards.
 *
 * `courses.color` is nullable (R9.3/R9.4). When an institution has assigned a
 * valid hex color it is used verbatim; otherwise a stable color is derived from
 * the course id so the same course always shows the same accent across sessions
 * and devices — no random or index-dependent assignment.
 *
 * Kept free of React/Supabase so it is trivially unit-testable and reusable.
 *
 * Satisfies Requirement 9.3.
 */

/** Brand-aligned palette (mirrors the calendar/timetable accent palette). */
export const COURSE_COLOR_PALETTE = [
  "#3b82f6", // blue-500
  "#8b5cf6", // violet-500
  "#ef4444", // red-500
  "#f59e0b", // amber-500
  "#22c55e", // green-500
  "#14b8a6", // teal-500
  "#ec4899", // pink-500
  "#6366f1", // indigo-500
] as const;

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

/**
 * Produces a non-negative 32-bit integer from a string (djb2).
 * Identical input always yields an identical hash, giving deterministic colors.
 */
const hashString = (value: string): number => {
  let hash = 5381;
  for (let i = 0; i < value.length; i++) {
    // hash * 33 + charCode, kept in 32-bit space.
    hash = ((hash << 5) + hash + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
};

/**
 * Resolve the color used as a course card's visual identifier.
 *
 * @param color - The stored `courses.color` value, or null when unassigned.
 * @param courseId - The course id used to derive a deterministic fallback.
 * @returns A 6-digit hex color string.
 */
export const resolveCourseColor = (
  color: string | null | undefined,
  courseId: string
): string => {
  if (color && HEX_COLOR.test(color)) return color;
  const index = hashString(courseId) % COURSE_COLOR_PALETTE.length;
  return COURSE_COLOR_PALETTE[index] ?? COURSE_COLOR_PALETTE[0];
};

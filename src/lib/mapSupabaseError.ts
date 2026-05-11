/**
 * Mapped error response
 */
export interface MappedError {
  code: string;
  userMessage: string;
  fieldPath?: string;
}

/**
 * Map of PostgreSQL constraint names to user-friendly messages
 *
 * These messages are in English; consumers should call t(userMessage) to localize
 */
const CONSTRAINT_MESSAGES: Record<string, Omit<MappedError, "code">> = {
  week_start_is_monday: {
    userMessage: "Week start must be a Monday",
    fieldPath: "week_start",
  },
  // Add more constraint mappings as needed
};

/**
 * Map PostgreSQL error codes to user-friendly messages
 */
const PG_ERROR_CODES: Record<string, string> = {
  "23505": "This record already exists",
  "23503":
    "Cannot delete this record because it is referenced by other records",
  "23502": "This field is required",
  "23514": "This value is not allowed",
  "42501": "You do not have permission to perform this action",
};

/**
 * Extract constraint name from PostgreSQL error message
 *
 * Example error message:
 * "duplicate key value violates unique constraint \"week_start_is_monday\""
 */
const extractConstraintName = (message: string): string | null => {
  const match = message.match(/constraint "([^"]+)"/);
  return match?.[1] ?? null;
};

/**
 * Extract PostgreSQL error code from error
 *
 * Supabase errors have a `code` property with the PG error code
 */
const extractPgCode = (error: Error): string | null => {
  if ("code" in error && typeof error.code === "string") {
    return error.code;
  }
  return null;
};

/**
 * Map Supabase/PostgreSQL errors to user-friendly messages
 *
 * Handles:
 * - Unique constraint violations (23505)
 * - Foreign key violations (23503)
 * - Not-null violations (23502)
 * - Check constraint violations (23514)
 * - RLS policy violations (42501)
 * - Named constraint violations (e.g., week_start_is_monday)
 *
 * Usage:
 * ```tsx
 * try {
 *   await supabase.from('table').insert(data);
 * } catch (error) {
 *   const mapped = mapSupabaseError(error);
 *   console.error(mapped.userMessage); // "This record already exists"
 *   console.error(mapped.fieldPath); // "email" (if applicable)
 * }
 * ```
 */
export const mapSupabaseError = (error: Error): MappedError => {
  const pgCode = extractPgCode(error);
  const message = error.message || "";

  // Try to match named constraints first
  const constraintName = extractConstraintName(message);
  if (constraintName) {
    const constraint = CONSTRAINT_MESSAGES[constraintName];
    if (constraint) {
      return {
        code: pgCode || "CONSTRAINT_VIOLATION",
        userMessage: constraint.userMessage,
        fieldPath: constraint.fieldPath,
      };
    }
  }

  // Try to match PostgreSQL error codes
  if (pgCode && pgCode in PG_ERROR_CODES) {
    return {
      code: pgCode,
      userMessage: PG_ERROR_CODES[pgCode] ?? "An error occurred",
    };
  }

  // Fallback: return the original error message
  return {
    code: pgCode ?? "UNKNOWN_ERROR",
    userMessage: message ?? "An unexpected error occurred",
  };
};

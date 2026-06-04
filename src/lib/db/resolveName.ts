/**
 * Standard UUID shape: 8-4-4-4-12 hexadecimal characters separated by hyphens.
 *
 * Anchored and case-insensitive so a *bare* UUID (and nothing else) is matched.
 * A display string that merely *contains* a UUID (e.g. "Cohort 9f1c…") is left
 * untouched, because that is still a human-readable label rather than a raw id.
 */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Resolve a display value for a name/title cell, guaranteeing a raw UUID is
 * never surfaced to the user.
 *
 * `resolveName` is the shared fallback helper behind the Admin/Teacher list
 * tables (Req 5): once a list query embeds the related row (e.g. a course or
 * program name), the column renders `resolveName(row.relation?.name)`. When the
 * relation could not be resolved — the value is `null`/`undefined`/empty, or an
 * unresolved bare UUID leaked through — the function returns the `fallback`
 * label instead of the raw identifier.
 *
 * The rule (no-raw-UUID correctness property, Req 5.7): return `value` only when
 * it is a non-empty, non-UUID display string; otherwise return `fallback`.
 *
 * The function is pure: it has no side effects and does not mutate its inputs.
 *
 * @param value - The candidate display string (typically an embedded relation
 *   name/title), which may be `null` or `undefined`.
 * @param fallback - The label to show when `value` cannot be displayed as a
 *   name. Defaults to an em dash (`"—"`).
 * @returns The trimmed display `value`, or `fallback` when `value` is missing,
 *   blank, or a bare UUID.
 *
 * @example
 * resolveName("Intro to Programming");                 // "Intro to Programming"
 * resolveName(null);                                   // "—"
 * resolveName("");                                     // "—"
 * resolveName("3f2504e0-4f89-41d3-9a0c-0305e82c3301"); // "—" (bare UUID)
 * resolveName(undefined, "Unassigned");                // "Unassigned"
 */
export const resolveName = (
  value: string | null | undefined,
  fallback = "—"
): string => {
  if (value === null || value === undefined) {
    return fallback;
  }

  const trimmed = value.trim();
  if (trimmed === "" || UUID_RE.test(trimmed)) {
    return fallback;
  }

  return trimmed;
};

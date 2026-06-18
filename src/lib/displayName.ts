/**
 * Honorific-aware display-name derivation.
 *
 * Seeded/imported names frequently carry an honorific title
 * ("Mr. David Okonkwo", "Dr. Aisha Al-Mansoori"). A naive `name.split(" ")[0]`
 * therefore renders the title ("Mr."/"Dr.") instead of the person's first name.
 * This single shared helper skips a leading honorific token so greetings and
 * profile headers show the actual first name.
 *
 * Kept free of React/Supabase so it is trivially unit-testable and reusable by
 * every surface that needs a first name (no duplicated inline logic).
 *
 * Production Bug Fixes — Track A, Item 3 (Requirement 3).
 */

/** Lowercased honorific tokens (trailing "." stripped before lookup). */
const HONORIFICS = new Set([
  "mr",
  "mrs",
  "ms",
  "miss",
  "dr",
  "prof",
  "mx",
  "sir",
]);

/**
 * Derive a display first name from a full name.
 *
 * - Trims, splits on whitespace, and drops empty tokens.
 * - When the first token is an honorific (case-insensitive, optional trailing
 *   ".") AND a following token exists, the following token is returned.
 * - Otherwise the first token is returned (a lone honorific is returned as-is).
 *
 * @param name - The full name, possibly null/undefined.
 * @returns The display first name, or `null` when no usable token exists so the
 *   caller can supply its own fallback.
 */
export const getDisplayFirstName = (name?: string | null): string | null => {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return null;
  const head = parts[0]!.replace(/\.$/, "").toLowerCase();
  if (HONORIFICS.has(head) && parts.length > 1) return parts[1]!;
  return parts[0]!;
};

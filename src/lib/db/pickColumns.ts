/**
 * Generic, type-safe column whitelist for database insert/update payloads.
 *
 * `pickColumns` returns a new object containing only the `allowed` keys that
 * are both present on the payload and not `undefined`. It is the shared, SOLID,
 * no-duplication building block behind the per-table insert whitelists (e.g.
 * `SOCIAL_CHALLENGES_INSERT_COLUMNS`, `TEAMS_INSERT_COLUMNS`): by stripping any
 * UI-only fields (such as `xp_race_acknowledged`) before an insert, it lets the
 * generated Supabase `Insert` types do their job instead of being defeated by an
 * `as never` cast.
 *
 * The function is pure: it never mutates `payload` and has no side effects.
 *
 * @typeParam T - The shape of the source payload.
 * @typeParam K - The union of keys allowed through to the result.
 * @param payload - The source object to copy allowed keys from.
 * @param allowed - The readonly list of keys permitted in the result.
 * @returns A new object containing only the allowed, defined keys of `payload`.
 *
 * @example
 * const row = pickColumns(
 *   { title: "Race", xp_race_acknowledged: true },
 *   ["title"] as const
 * );
 * // row === { title: "Race" }  — xp_race_acknowledged is dropped
 */
export const pickColumns = <T extends object, K extends keyof T>(
  payload: T,
  allowed: readonly K[]
): Pick<T, K> => {
  const out = {} as Pick<T, K>;
  for (const key of allowed) {
    if (
      key in payload &&
      (payload as Record<PropertyKey, unknown>)[key as PropertyKey] !==
        undefined
    ) {
      out[key] = payload[key];
    }
  }
  return out;
};

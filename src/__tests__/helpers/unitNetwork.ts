// Unit/property tooling only; the isolated Preview RLS configuration does not
// import this module or the unit setup. These are never deployment credentials.
export const UNIT_SUPABASE_URL = "http://localhost:54321";
export const UNIT_SUPABASE_ANON_KEY = "fake-unit-test-key";
export const UNIT_NETWORK_ERROR = "Supabase network access is disabled in unit/property tests";
const GUARD_MARK = Symbol.for("edeviser.unit.supabase-fetch-guard");

/** Preserve existing mocked/other HTTP behavior while blocking an accidental
 * real client aimed at the fixed unit Supabase origin. Not a network sandbox. */
export function guardUnitSupabaseFetch(nativeFetch: typeof fetch): typeof fetch {
  if ((nativeFetch as typeof fetch & { [GUARD_MARK]?: boolean })[GUARD_MARK]) return nativeFetch;
  const forward = nativeFetch.bind(globalThis);
  const guarded: typeof fetch = (input, init) => {
    const raw = typeof input === "string" ? input : "url" in input ? input.url : input.href;
    let origin: string | undefined;
    try { origin = new URL(raw).origin; } catch { /* Native fetch owns invalid/relative URL behavior. */ }
    if (origin === UNIT_SUPABASE_URL) return Promise.reject(new Error(UNIT_NETWORK_ERROR));
    return forward(input, init);
  };
  Object.defineProperty(guarded, GUARD_MARK, { value: true });
  return guarded;
}

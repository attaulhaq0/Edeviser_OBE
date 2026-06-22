// =============================================================================
// confetti — lazy-loaded canvas-confetti wrapper (Task 15.2, heavy-dep hygiene)
// =============================================================================
//
// `canvas-confetti` is a non-critical celebration effect. Importing it eagerly
// pulls the library into the chunk of every component that fires confetti
// (XP toasts, level-up overlay, badge modal, improvement bonus, leaderboard).
// This helper defers the import to first use via a dynamic `import()`, so the
// library is fetched only when a celebration actually happens (many sessions
// never fire one), and gives every call site one shared, fire-and-forget entry
// point instead of five duplicate eager imports.
//
// Failures (e.g. a chunk-load error on a flaky network) are swallowed: confetti
// is decoration and must never break the surrounding UI. Callers remain
// responsible for honoring `prefers-reduced-motion` before calling.

// Derive the options type from the package without importing it at runtime, so
// this stays type-safe (no `any`) while keeping the dependency fully lazy.
type ConfettiOptions = Parameters<typeof import("canvas-confetti")>[0];

/**
 * Fire a confetti burst, lazy-loading `canvas-confetti` on first call.
 *
 * Fire-and-forget: the returned promise resolves once the burst has been
 * triggered (or silently after a swallowed load error). Awaiting is optional.
 */
export const launchConfetti = async (
  options?: ConfettiOptions
): Promise<void> => {
  try {
    const { default: confetti } = await import("canvas-confetti");
    confetti(options);
  } catch {
    // Non-essential decoration — ignore load/runtime errors.
  }
};

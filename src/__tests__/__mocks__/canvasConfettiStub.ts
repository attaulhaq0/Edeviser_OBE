// Test stub for `canvas-confetti`, aliased in for the whole test run via
// vite.config.ts (`resolve.alias`, guarded by `isTest`).
//
// The real library starts a `requestAnimationFrame` animation loop that throws
// in the headless happy-dom test environment. Now that confetti is lazy-loaded
// (`src/lib/confetti.ts` → dynamic `import()`), that loop can resolve *after* the
// triggering test unmounts and leak into a later test file (seen under
// `test:coverage` as an async "canvas-confetti/src/confetti.js update/onFrame"
// error). Aliasing the real module to this no-op for every test — including
// transitive renders that never mock it — removes the whole class of failure.
//
// Tests that assert confetti behaviour override this with their own
// `vi.mock("canvas-confetti", ...)` (file-level mock wins).

const confetti = (..._args: unknown[]): null => null;

export default confetti;

import "@testing-library/jest-dom";
import { expect, vi } from "vitest";
import * as matchers from "vitest-axe/matchers";

expect.extend(matchers);

// canvas-confetti is a DOM-animating decoration library. Its requestAnimationFrame
// loop throws in the headless test DOM (no real canvas), and now that it is
// lazy-loaded via dynamic import() the stray animation can resolve *after* the
// triggering test finishes and leak into a later test file (seen as an async
// "confetti.js update/onFrame" error under `test:coverage`). Mock it globally so
// the real library never runs in any test. Individual tests that assert confetti
// behaviour re-mock it locally with their own spy (file-level vi.mock wins).
vi.mock("canvas-confetti", () => ({ default: vi.fn() }));

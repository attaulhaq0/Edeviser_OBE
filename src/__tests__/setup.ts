import "@testing-library/jest-dom";
import { expect, vi } from "vitest";
import * as matchers from "vitest-axe/matchers";

expect.extend(matchers);

// Node 22+ exposes a process-level `localStorage` accessor which is unavailable
// unless Node is launched with `--localstorage-file`. In Vitest fork workers it
// can win over happy-dom's browser storage and make DOM tests fail before they
// collect. Bind the browser implementation explicitly for every happy-dom test.
const createMemoryStorage = (): Storage => {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key: string) => values.get(key) ?? null,
    key: (index: number) => [...values.keys()][index] ?? null,
    removeItem: (key: string) => values.delete(key),
    setItem: (key: string, value: string) => values.set(key, String(value)),
  };
};

const localStoragePolyfill = createMemoryStorage();
const sessionStoragePolyfill = createMemoryStorage();

Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: localStoragePolyfill,
});
Object.defineProperty(globalThis, "sessionStorage", {
  configurable: true,
  value: sessionStoragePolyfill,
});

// CI intentionally supplies a loopback Supabase URL when no preview secrets
// are configured. Keep the unit/property suite hermetic: a few integration-
// shaped components can still construct a real client, and the client's
// retrying fetches otherwise leave hundreds of refused sockets open on a
// hosted runner. Tests that need HTTP explicitly mock `globalThis.fetch`.
if (
  process.env.CI === "true" &&
  (process.env.VITE_SUPABASE_URL ?? "").startsWith("http://localhost:54321")
) {
  const nativeFetch = globalThis.fetch.bind(globalThis);
  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const requestUrl =
      typeof input === "string"
        ? input
        : input instanceof URL
        ? input.href
        : input.url;

    if (requestUrl.startsWith("http://localhost:54321")) {
      return Promise.reject(
        new Error("Supabase network access is disabled in hermetic CI tests")
      );
    }

    return nativeFetch(input, init);
  }) as typeof fetch;
}

if (typeof window !== "undefined") {
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: localStoragePolyfill,
  });
  Object.defineProperty(window, "sessionStorage", {
    configurable: true,
    value: sessionStoragePolyfill,
  });
}

// ─── Hermetic AI-surface harness ─────────────────────────────────────────────
// The Wave-D AI components read through `supabase.functions.invoke(...)`
// (agent-orchestrator channels). Unit tests that render pages containing an AI
// surface (assistant panel, autonomy control, governance card) must not fire
// real HTTP at teardown (happy-dom AbortError flakiness). Install a global
// fail-closed stub returning an empty envelope so any unmocked consumer
// resolves deterministically instead of racing an in-flight fetch.
vi.mock("@/lib/supabase", () => {
  const supabase = {
    functions: {
      invoke: vi.fn(async () => ({ data: null, error: null })),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: null, error: null }),
        }),
      }),
    }),
    channel: () => ({
      on: () => ({ subscribe: () => ({ unsubscribe: vi.fn() }) }),
    }),
  };
  return { supabase };
});

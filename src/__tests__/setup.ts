import "@testing-library/jest-dom";
import { expect } from "vitest";
import * as matchers from "vitest-axe/matchers";
import { guardUnitSupabaseFetch } from "@/__tests__/helpers/unitNetwork";

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

// The unit config fixes the Supabase origin/key even outside CI. Preview RLS
// intentionally has a separate config with no unit setup. Do not leave real
// client's retries running simply because a local invocation omitted CI=true.
// Other HTTP remains the test author's responsibility to mock explicitly.
globalThis.fetch = guardUnitSupabaseFetch(globalThis.fetch);

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

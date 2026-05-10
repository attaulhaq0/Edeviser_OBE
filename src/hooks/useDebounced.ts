import { useEffect, useState } from "react";

/**
 * Debounce a changing value. The returned value updates only after `delayMs`
 * has elapsed without further changes to `value`.
 *
 * Lives in `src/hooks/` per project conventions — all reusable hooks belong
 * here so they can be imported with the `@/hooks/` alias from anywhere.
 *
 * @param value   The latest value to debounce.
 * @param delayMs Milliseconds to wait before publishing the latest value.
 */
export function useDebounced<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(handle);
  }, [value, delayMs]);

  return debounced;
}

// Feature: Page Capability Matrix (tasks.md 3.2).
// Hook: resolves assistant capabilities for the current location, fail-closed.
// Display/hint only — never an authorization boundary; server enforcement +
// RLS remain authoritative for any data the shell renders.

import { useLocation } from "react-router-dom";
import { useMemo } from "react";
import { resolvePageCapabilities } from "@/ai/capabilities/resolve";

/**
 * Returns the capability row for the current route, or null when the page has
 * no assistant capabilities. Components must treat null as "render nothing".
 */
export const usePageCapabilities = () => {
  const { pathname } = useLocation();
  return useMemo(() => resolvePageCapabilities(pathname), [pathname]);
};

export default usePageCapabilities;
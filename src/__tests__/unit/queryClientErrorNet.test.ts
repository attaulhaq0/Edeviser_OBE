// =============================================================================
// queryClientErrorNet.test.ts
// Feature: production-bug-fixes, Req 6 — global query/mutation error safety net.
// -----------------------------------------------------------------------------
// Verifies the dedup-aware handlers:
//   - always log (console + Sentry)
//   - query net toasts a fallback unless meta.suppressGlobalError (no double-toast)
//   - mutation net only surfaces the shared 429 notice (hooks toast their own)
// =============================================================================
import { describe, it, expect, vi, beforeEach } from "vitest";

const toastError = vi.fn();
vi.mock("sonner", () => ({ toast: { error: (m: string) => toastError(m) } }));

const captureException = vi.fn();
vi.mock("@sentry/react", () => ({
  captureException: (...a: unknown[]) => captureException(...a),
}));

import {
  handleGlobalQueryError,
  handleGlobalMutationError,
  getErrorMessage,
} from "@/lib/queryClient";

describe("Global error safety net (production-bug-fixes Req 6)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  describe("handleGlobalQueryError", () => {
    it("logs (console + Sentry) and toasts when not opted out", () => {
      handleGlobalQueryError(new Error("boom"), undefined);
      expect(console.error).toHaveBeenCalledTimes(1);
      expect(captureException).toHaveBeenCalledTimes(1);
      expect(toastError).toHaveBeenCalledWith("boom");
    });

    it("logs but does NOT toast when meta.suppressGlobalError is set (no double-toast)", () => {
      handleGlobalQueryError(new Error("handled by hook"), {
        suppressGlobalError: true,
      });
      expect(console.error).toHaveBeenCalledTimes(1);
      expect(captureException).toHaveBeenCalledTimes(1);
      expect(toastError).not.toHaveBeenCalled();
    });

    it("uses the rate-limit message for 429 errors", () => {
      handleGlobalQueryError({ status: 429 }, undefined);
      expect(toastError).toHaveBeenCalledWith(
        "Too many requests. Please wait a moment."
      );
    });
  });

  describe("handleGlobalMutationError", () => {
    it("logs always but does not toast a generic message (hooks own their toast)", () => {
      handleGlobalMutationError(new Error("save failed"), undefined);
      expect(console.error).toHaveBeenCalledTimes(1);
      expect(captureException).toHaveBeenCalledTimes(1);
      expect(toastError).not.toHaveBeenCalled();
    });

    it("surfaces the shared 429 notice", () => {
      handleGlobalMutationError({ status: 429 }, undefined);
      expect(toastError).toHaveBeenCalledWith(
        "Too many requests. Please wait a moment."
      );
    });

    it("respects the opt-out flag even for 429", () => {
      handleGlobalMutationError({ status: 429 }, { suppressGlobalError: true });
      expect(toastError).not.toHaveBeenCalled();
    });
  });

  describe("getErrorMessage", () => {
    it("returns the error message when present, else a generic fallback", () => {
      expect(getErrorMessage(new Error("specific"))).toBe("specific");
      expect(getErrorMessage(null)).toBe(
        "Something went wrong. Please try again."
      );
      expect(getErrorMessage({})).toBe(
        "Something went wrong. Please try again."
      );
    });
  });
});

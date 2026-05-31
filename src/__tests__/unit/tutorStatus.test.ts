import { describe, it, expect } from "vitest";
import { mapTutorError, type TutorUiState } from "@/lib/tutorStatus";

describe("mapTutorError", () => {
  describe("network failures", () => {
    it("maps a network error to unavailable", () => {
      expect(mapTutorError({ networkError: true })).toEqual({
        kind: "unavailable",
      });
    });

    it("treats network error as dominant over any status", () => {
      expect(mapTutorError({ networkError: true, httpStatus: 403 })).toEqual({
        kind: "unavailable",
      });
    });
  });

  describe("HTTP status mapping", () => {
    it("maps 200 to ready", () => {
      expect(mapTutorError({ httpStatus: 200 })).toEqual({ kind: "ready" });
    });

    it("maps any 2xx to ready", () => {
      expect(mapTutorError({ httpStatus: 204 })).toEqual({ kind: "ready" });
    });

    it("maps 403 to not_enrolled", () => {
      expect(mapTutorError({ httpStatus: 403 })).toEqual({
        kind: "not_enrolled",
      });
    });

    it("maps 429 to rate_limited", () => {
      expect(mapTutorError({ httpStatus: 429 })).toEqual({
        kind: "rate_limited",
        resetHint: undefined,
      });
    });

    it("maps 500 to unavailable", () => {
      expect(mapTutorError({ httpStatus: 500 })).toEqual({
        kind: "unavailable",
      });
    });

    it("maps 502 to unavailable", () => {
      expect(mapTutorError({ httpStatus: 502 })).toEqual({
        kind: "unavailable",
      });
    });

    it("maps 503 to unavailable", () => {
      expect(mapTutorError({ httpStatus: 503 })).toEqual({
        kind: "unavailable",
      });
    });
  });

  describe("structured code mapping", () => {
    it("maps RATE_LIMIT_EXCEEDED to rate_limited", () => {
      expect(
        mapTutorError({ httpStatus: 429, code: "RATE_LIMIT_EXCEEDED" })
      ).toEqual({ kind: "rate_limited", resetHint: undefined });
    });

    it("maps TOKEN_BUDGET_EXCEEDED to rate_limited", () => {
      expect(mapTutorError({ code: "TOKEN_BUDGET_EXCEEDED" })).toEqual({
        kind: "rate_limited",
        resetHint: undefined,
      });
    });

    it("threads resetHint into rate_limited", () => {
      expect(
        mapTutorError({ code: "RATE_LIMIT_EXCEEDED", resetHint: "midnight" })
      ).toEqual({ kind: "rate_limited", resetHint: "midnight" });
    });

    it("maps EMBEDDING_ERROR to unavailable", () => {
      expect(
        mapTutorError({ httpStatus: 502, code: "EMBEDDING_ERROR" })
      ).toEqual({ kind: "unavailable" });
    });

    it("maps LLM_ERROR to unavailable", () => {
      expect(mapTutorError({ code: "LLM_ERROR" })).toEqual({
        kind: "unavailable",
      });
    });

    it("maps LLM_UNAVAILABLE to unavailable", () => {
      expect(
        mapTutorError({ httpStatus: 503, code: "LLM_UNAVAILABLE" })
      ).toEqual({ kind: "unavailable" });
    });

    it("maps no_embeddings code to no_embeddings even on a 200 response", () => {
      expect(mapTutorError({ httpStatus: 200, code: "no_embeddings" })).toEqual(
        {
          kind: "no_embeddings",
        }
      );
    });

    it("matches codes case-insensitively", () => {
      expect(mapTutorError({ code: "rate_limit_exceeded" })).toEqual({
        kind: "rate_limited",
        resetHint: undefined,
      });
    });
  });

  describe("guaranteed fallback (R4.2a)", () => {
    it("falls back to error for an empty signal", () => {
      const result = mapTutorError({});
      expect(result.kind).toBe("error");
    });

    it("falls back to error for an unrecognized status", () => {
      const result = mapTutorError({ httpStatus: 418 });
      expect(result.kind).toBe("error");
    });

    it("threads a provided message into the fallback", () => {
      expect(mapTutorError({ httpStatus: 418, message: "Teapot" })).toEqual({
        kind: "error",
        message: "Teapot",
      });
    });

    it("supplies default copy when no message is provided", () => {
      const result = mapTutorError({});
      if (result.kind !== "error") throw new Error("expected error state");
      expect(result.message.length).toBeGreaterThan(0);
    });

    it("falls back to error when an unknown code has no usable status", () => {
      const result = mapTutorError({ code: "totally_unknown" });
      expect(result.kind).toBe("error");
    });

    it("uses status when an unknown code accompanies a known status", () => {
      expect(
        mapTutorError({ httpStatus: 403, code: "totally_unknown" })
      ).toEqual({ kind: "not_enrolled" });
    });
  });

  it("always returns a defined TutorUiState kind", () => {
    const kinds: TutorUiState["kind"][] = [
      "ready",
      "unavailable",
      "not_enrolled",
      "no_embeddings",
      "rate_limited",
      "error",
    ];
    const samples = [
      { httpStatus: 200 },
      { httpStatus: 403 },
      { httpStatus: 429 },
      { httpStatus: 500 },
      { networkError: true },
      { code: "no_embeddings" },
      {},
    ];
    for (const s of samples) {
      expect(kinds).toContain(mapTutorError(s).kind);
    }
  });
});

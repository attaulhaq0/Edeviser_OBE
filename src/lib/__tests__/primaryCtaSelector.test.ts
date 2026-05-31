import { describe, it, expect } from "vitest";
import {
  selectPrimary,
  orderSecondary,
  type CtaCandidate,
} from "../primaryCtaSelector";

const candidate = (
  id: string,
  priority: number,
  applicable: boolean
): CtaCandidate => ({ id, priority, applicable });

describe("primaryCtaSelector", () => {
  describe("selectPrimary", () => {
    it("returns null when there are no candidates", () => {
      expect(selectPrimary([])).toBeNull();
    });

    it("returns null when no candidate is applicable (R16.1)", () => {
      expect(
        selectPrimary([
          candidate("profile", 0, false),
          candidate("submit", 1, false),
        ])
      ).toBeNull();
    });

    it("selects the highest-precedence (lowest priority) applicable candidate (R16.2)", () => {
      const result = selectPrimary([
        candidate("continue", 2, true),
        candidate("submit", 1, true),
        candidate("feedback", 3, true),
      ]);
      expect(result?.id).toBe("submit");
    });

    it("excludes non-applicable candidates from the comparison (R16.2)", () => {
      // 'profile' has the highest precedence but is not applicable, so the
      // applicable 'submit' must win.
      const result = selectPrimary([
        candidate("profile", 0, false),
        candidate("submit", 1, true),
        candidate("continue", 2, true),
      ]);
      expect(result?.id).toBe("submit");
    });

    it("resolves priority ties to the first candidate in input order", () => {
      const result = selectPrimary([
        candidate("a", 1, true),
        candidate("b", 1, true),
      ]);
      expect(result?.id).toBe("a");
    });

    it("promotes the next applicable candidate once the top is no longer applicable (R16.3)", () => {
      const before = selectPrimary([
        candidate("submit", 1, true),
        candidate("continue", 2, true),
      ]);
      expect(before?.id).toBe("submit");

      const after = selectPrimary([
        candidate("submit", 1, false),
        candidate("continue", 2, true),
      ]);
      expect(after?.id).toBe("continue");
    });
  });

  describe("orderSecondary", () => {
    it("returns the applicable candidates except the primary, ordered by precedence", () => {
      const result = orderSecondary(
        [
          candidate("submit", 1, true),
          candidate("feedback", 3, true),
          candidate("continue", 2, true),
        ],
        "submit"
      );
      expect(result.map((c) => c.id)).toEqual(["continue", "feedback"]);
    });

    it("excludes non-applicable candidates", () => {
      const result = orderSecondary(
        [
          candidate("submit", 1, true),
          candidate("profile", 0, false),
          candidate("continue", 2, true),
        ],
        "submit"
      );
      expect(result.map((c) => c.id)).toEqual(["continue"]);
    });

    it("derives the primary itself when no primaryId is supplied", () => {
      const result = orderSecondary([
        candidate("continue", 2, true),
        candidate("submit", 1, true),
        candidate("feedback", 3, true),
      ]);
      // 'submit' is the computed primary and is excluded from the secondaries.
      expect(result.map((c) => c.id)).toEqual(["continue", "feedback"]);
    });

    it("returns an empty list when no candidate is applicable", () => {
      const result = orderSecondary([
        candidate("submit", 1, false),
        candidate("continue", 2, false),
      ]);
      expect(result).toEqual([]);
    });

    it("preserves input order for candidates sharing the same priority", () => {
      const result = orderSecondary(
        [
          candidate("primary", 0, true),
          candidate("b", 1, true),
          candidate("a", 1, true),
        ],
        "primary"
      );
      expect(result.map((c) => c.id)).toEqual(["b", "a"]);
    });
  });
});

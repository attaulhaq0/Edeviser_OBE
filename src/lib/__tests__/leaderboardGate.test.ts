import { describe, it, expect } from "vitest";
import { leaderboardState } from "../leaderboardGate";

describe("leaderboardGate", () => {
  describe("leaderboardState", () => {
    it("locks when zero eligible students regardless of minimum (R6.2a)", () => {
      expect(leaderboardState(0, 5)).toBe("locked");
      // Even a zero/negative configured minimum must not unlock an empty cohort.
      expect(leaderboardState(0, 0)).toBe("locked");
      expect(leaderboardState(0, -3)).toBe("locked");
    });

    it("locks for negative eligible counts", () => {
      expect(leaderboardState(-2, 5)).toBe("locked");
    });

    it("locks while eligible count is below the configured minimum (R6.1)", () => {
      expect(leaderboardState(1, 5)).toBe("locked");
      expect(leaderboardState(4, 5)).toBe("locked");
    });

    it("unlocks when eligible count meets the minimum (R6.2)", () => {
      expect(leaderboardState(5, 5)).toBe("unlocked");
    });

    it("unlocks when eligible count exceeds the minimum (R6.2)", () => {
      expect(leaderboardState(50, 5)).toBe("unlocked");
    });

    it("unlocks a single eligible student when the minimum is 1", () => {
      expect(leaderboardState(1, 1)).toBe("unlocked");
    });

    it("treats non-finite inputs conservatively as locked", () => {
      expect(leaderboardState(Number.NaN, 5)).toBe("locked");
      expect(leaderboardState(10, Number.NaN)).toBe("locked");
      expect(leaderboardState(Number.POSITIVE_INFINITY, 5)).toBe("locked");
    });
  });
});

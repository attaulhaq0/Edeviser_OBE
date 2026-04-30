import { describe, it, expect } from "vitest";
import { isReviewCycleComplete } from "@/lib/plannerUtils";

describe("Review Completion XP Flow", () => {
  describe("isReviewCycleComplete", () => {
    it("returns true when all 3 intervals (1, 3, 7) are completed", () => {
      const reviews = [
        { intervalDays: 1, status: "completed" },
        { intervalDays: 3, status: "completed" },
        { intervalDays: 7, status: "completed" },
      ];
      expect(isReviewCycleComplete(reviews)).toBe(true);
    });

    it("returns false when only 2 of 3 intervals are completed", () => {
      const reviews = [
        { intervalDays: 1, status: "completed" },
        { intervalDays: 3, status: "completed" },
        { intervalDays: 7, status: "pending" },
      ];
      expect(isReviewCycleComplete(reviews)).toBe(false);
    });

    it("returns false when no intervals are completed", () => {
      const reviews = [
        { intervalDays: 1, status: "pending" },
        { intervalDays: 3, status: "pending" },
        { intervalDays: 7, status: "pending" },
      ];
      expect(isReviewCycleComplete(reviews)).toBe(false);
    });

    it("returns false for empty reviews array", () => {
      expect(isReviewCycleComplete([])).toBe(false);
    });

    it("returns false when intervals are skipped instead of completed", () => {
      const reviews = [
        { intervalDays: 1, status: "completed" },
        { intervalDays: 3, status: "skipped" },
        { intervalDays: 7, status: "completed" },
      ];
      expect(isReviewCycleComplete(reviews)).toBe(false);
    });

    it("returns true when there are extra review rows beyond the 3 required", () => {
      const reviews = [
        { intervalDays: 1, status: "completed" },
        { intervalDays: 1, status: "completed" },
        { intervalDays: 3, status: "completed" },
        { intervalDays: 7, status: "completed" },
      ];
      expect(isReviewCycleComplete(reviews)).toBe(true);
    });

    it("returns true when at least one of each interval is completed among mixed statuses", () => {
      const reviews = [
        { intervalDays: 1, status: "skipped" },
        { intervalDays: 1, status: "completed" },
        { intervalDays: 3, status: "completed" },
        { intervalDays: 7, status: "pending" },
        { intervalDays: 7, status: "completed" },
      ];
      expect(isReviewCycleComplete(reviews)).toBe(true);
    });

    it("returns false when only interval 1 is completed", () => {
      const reviews = [{ intervalDays: 1, status: "completed" }];
      expect(isReviewCycleComplete(reviews)).toBe(false);
    });

    it("returns false when interval 7 is missing entirely", () => {
      const reviews = [
        { intervalDays: 1, status: "completed" },
        { intervalDays: 3, status: "completed" },
      ];
      expect(isReviewCycleComplete(reviews)).toBe(false);
    });
  });
});

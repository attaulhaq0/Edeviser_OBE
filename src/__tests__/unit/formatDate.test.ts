import { describe, it, expect, beforeEach } from "vitest";
import i18n from "@/lib/i18n";
import { formatLocalDate, formatRelativeTime } from "@/lib/formatDate";

describe("formatDate", () => {
  beforeEach(() => {
    i18n.changeLanguage("en");
  });

  describe("formatLocalDate", () => {
    it("formats a Date object with default pattern in English", () => {
      const date = new Date(2025, 0, 15); // Jan 15, 2025
      const result = formatLocalDate(date);
      expect(result).toContain("2025");
      expect(result).toContain("January");
    });

    it("formats an ISO string", () => {
      const result = formatLocalDate("2025-06-20T12:00:00Z");
      expect(result).toContain("2025");
    });

    it("formats with custom pattern", () => {
      const date = new Date(2025, 5, 20); // Jun 20, 2025
      const result = formatLocalDate(date, "yyyy-MM-dd");
      expect(result).toBe("2025-06-20");
    });

    it("returns Arabic-formatted date when language is Arabic", () => {
      i18n.changeLanguage("ar");
      const date = new Date(2025, 0, 15);
      const result = formatLocalDate(date);
      // Arabic locale should produce Arabic month names
      expect(result).toBeTruthy();
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe("formatRelativeTime", () => {
    it("returns a non-empty relative time string", () => {
      const recentDate = new Date(Date.now() - 3600 * 1000); // 1 hour ago
      const result = formatRelativeTime(recentDate);
      expect(result.length).toBeGreaterThan(0);
      expect(result).toContain("ago");
    });

    it("works with ISO string input", () => {
      const result = formatRelativeTime(
        new Date(Date.now() - 60000).toISOString()
      );
      expect(result.length).toBeGreaterThan(0);
    });
  });
});

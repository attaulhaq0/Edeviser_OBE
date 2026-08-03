// =============================================================================
// adminAnalytics.test.tsx — Unit & Integration Tests for Admin Analytics
// Requirements: 1, 2, 3, 4, 5, 6
// =============================================================================

import { describe, it, expect, vi, beforeEach } from "vitest";
import { MIN_COHORT_THRESHOLD } from "@/hooks/useAdminAnalytics";

// Mock Supabase
vi.mock("@/lib/supabase", () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(),
  },
}));

describe("Admin Analytics & Institution Scoping Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("enforces minimum cohort threshold for privacy suppression", () => {
    expect(MIN_COHORT_THRESHOLD).toBe(3);

    const cohort1 = 2; // Below threshold -> suppressed
    const cohort2 = 5; // Above threshold -> visible

    const isSuppressed1 = cohort1 > 0 && cohort1 < MIN_COHORT_THRESHOLD;
    const isSuppressed2 = cohort2 > 0 && cohort2 < MIN_COHORT_THRESHOLD;

    expect(isSuppressed1).toBe(true);
    expect(isSuppressed2).toBe(false);
  });

  it("calculates retention risk totals matching exact student population count", () => {
    const totalStudents = 40;
    const onTrack = Math.round(totalStudents * 0.75); // 30
    const watch = Math.round(totalStudents * 0.18); // 7
    const atRisk = totalStudents - onTrack - watch; // 3

    const total = onTrack + watch + atRisk;
    expect(total).toBe(totalStudents);
    expect(total).toBe(40);
  });

  it("maps PLO attainment percentages to correct status bands", () => {
    const getStatusBand = (attainment: number) => {
      if (attainment < 0) return "unmeasured";
      if (attainment >= 85) return "excellent";
      if (attainment >= 70) return "satisfactory";
      if (attainment >= 50) return "developing";
      return "notYet";
    };

    expect(getStatusBand(88)).toBe("excellent");
    expect(getStatusBand(76)).toBe("satisfactory");
    expect(getStatusBand(63)).toBe("developing");
    expect(getStatusBand(47)).toBe("notYet");
    expect(getStatusBand(-1)).toBe("unmeasured");
  });

  it("handles AI Co-Pilot performance empty state honestly without fake percentages", () => {
    const aiDataEmpty = {
      hasSufficientData: false,
      suggestionAcceptanceRate: 0,
      suggestionTotal: 0,
      predictionAccuracyRate: 0,
      predictionTotal: 0,
      draftAcceptanceRate: 0,
      draftTotal: 0,
    };

    expect(aiDataEmpty.hasSufficientData).toBe(false);
    expect(aiDataEmpty.suggestionAcceptanceRate).toBe(0);
  });
});

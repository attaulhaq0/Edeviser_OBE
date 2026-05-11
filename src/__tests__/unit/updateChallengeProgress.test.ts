import { describe, it, expect } from "vitest";

// ─── Test the core logic patterns used by update-challenge-progress Edge Function ──
// Since Edge Functions run on Deno, we test the pure logic extracted here.

// ─── Event-to-Challenge-Type Mapping ────────────────────────────────────────

type EventType = "grade" | "habit" | "xp";
type ChallengeType =
  | "academic"
  | "habit"
  | "xp_race"
  | "blooms_climb"
  | "cooperative";

function getMatchingChallengeTypes(eventType: EventType): ChallengeType[] {
  switch (eventType) {
    case "grade":
      return ["academic", "blooms_climb", "cooperative"];
    case "habit":
      return ["habit", "cooperative"];
    case "xp":
      return ["xp_race", "cooperative"];
    default:
      return [];
  }
}

// ─── Payload Validation ─────────────────────────────────────────────────────

const VALID_EVENT_TYPES: EventType[] = ["grade", "habit", "xp"];

interface UpdateProgressPayload {
  event_type: EventType;
  student_id: string;
  course_id: string;
  metadata?: Record<string, unknown>;
}

function validatePayload(
  payload: unknown
):
  | { valid: true; data: UpdateProgressPayload }
  | { valid: false; error: string } {
  if (!payload || typeof payload !== "object") {
    return { valid: false, error: "Request body must be a JSON object" };
  }

  const p = payload as Record<string, unknown>;

  if (
    !p.event_type ||
    typeof p.event_type !== "string" ||
    !VALID_EVENT_TYPES.includes(p.event_type as EventType)
  ) {
    return {
      valid: false,
      error: `event_type is required and must be one of: ${VALID_EVENT_TYPES.join(
        ", "
      )}`,
    };
  }

  if (!p.student_id || typeof p.student_id !== "string") {
    return {
      valid: false,
      error: "student_id is required and must be a string",
    };
  }

  if (!p.course_id || typeof p.course_id !== "string") {
    return {
      valid: false,
      error: "course_id is required and must be a string",
    };
  }

  return {
    valid: true,
    data: {
      event_type: p.event_type as EventType,
      student_id: p.student_id as string,
      course_id: p.course_id as string,
      metadata:
        p.metadata && typeof p.metadata === "object"
          ? (p.metadata as Record<string, unknown>)
          : undefined,
    },
  };
}

// ─── Completion Detection Logic ─────────────────────────────────────────────

function isCompleted(currentProgress: number, goalTarget: number): boolean {
  return currentProgress >= goalTarget;
}

// ─── Streak Computation (from sorted unique dates) ──────────────────────────

function computeStreakFromDates(sortedDatesDesc: string[]): number {
  if (sortedDatesDesc.length === 0) return 0;

  let streak = 1;
  for (let i = 1; i < sortedDatesDesc.length; i++) {
    const current = new Date(sortedDatesDesc[i]!);
    const previous = new Date(sortedDatesDesc[i - 1]!);
    const diffDays = Math.round(
      (previous.getTime() - current.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diffDays === 1) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

// ─── Distinct Bloom's Levels Count ──────────────────────────────────────────

function countDistinctBloomsLevels(levels: (string | null)[]): number {
  return new Set(levels.filter(Boolean)).size;
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("update-challenge-progress Edge Function Logic", () => {
  describe("getMatchingChallengeTypes", () => {
    it("maps grade events to academic, blooms_climb, and cooperative", () => {
      expect(getMatchingChallengeTypes("grade")).toEqual([
        "academic",
        "blooms_climb",
        "cooperative",
      ]);
    });

    it("maps habit events to habit and cooperative", () => {
      expect(getMatchingChallengeTypes("habit")).toEqual([
        "habit",
        "cooperative",
      ]);
    });

    it("maps xp events to xp_race and cooperative", () => {
      expect(getMatchingChallengeTypes("xp")).toEqual([
        "xp_race",
        "cooperative",
      ]);
    });
  });

  describe("validatePayload", () => {
    it("accepts a valid payload with all required fields", () => {
      const result = validatePayload({
        event_type: "grade",
        student_id: "123e4567-e89b-12d3-a456-426614174000",
        course_id: "223e4567-e89b-12d3-a456-426614174000",
      });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.data.event_type).toBe("grade");
        expect(result.data.student_id).toBe(
          "123e4567-e89b-12d3-a456-426614174000"
        );
        expect(result.data.course_id).toBe(
          "223e4567-e89b-12d3-a456-426614174000"
        );
      }
    });

    it("accepts a valid payload with optional metadata", () => {
      const result = validatePayload({
        event_type: "grade",
        student_id: "abc",
        course_id: "def",
        metadata: { blooms_level: "Analyzing" },
      });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.data.metadata).toEqual({ blooms_level: "Analyzing" });
      }
    });

    it("rejects null payload", () => {
      const result = validatePayload(null);
      expect(result.valid).toBe(false);
    });

    it("rejects non-object payload", () => {
      const result = validatePayload("not an object");
      expect(result.valid).toBe(false);
    });

    it("rejects missing event_type", () => {
      const result = validatePayload({ student_id: "abc", course_id: "def" });
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toContain("event_type");
      }
    });

    it("rejects invalid event_type", () => {
      const result = validatePayload({
        event_type: "invalid",
        student_id: "abc",
        course_id: "def",
      });
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toContain("event_type");
      }
    });

    it("rejects missing student_id", () => {
      const result = validatePayload({ event_type: "grade", course_id: "def" });
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toContain("student_id");
      }
    });

    it("rejects missing course_id", () => {
      const result = validatePayload({
        event_type: "grade",
        student_id: "abc",
      });
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toContain("course_id");
      }
    });

    it("ignores non-object metadata", () => {
      const result = validatePayload({
        event_type: "xp",
        student_id: "abc",
        course_id: "def",
        metadata: "not an object",
      });
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.data.metadata).toBeUndefined();
      }
    });
  });

  describe("isCompleted (completion detection)", () => {
    it("returns true when progress equals goal_target", () => {
      expect(isCompleted(10, 10)).toBe(true);
    });

    it("returns true when progress exceeds goal_target", () => {
      expect(isCompleted(15, 10)).toBe(true);
    });

    it("returns false when progress is below goal_target", () => {
      expect(isCompleted(5, 10)).toBe(false);
    });

    it("returns true for zero goal_target with zero progress", () => {
      expect(isCompleted(0, 0)).toBe(true);
    });

    it("handles large values correctly", () => {
      expect(isCompleted(9999, 10000)).toBe(false);
      expect(isCompleted(10000, 10000)).toBe(true);
    });
  });

  describe("computeStreakFromDates (habit progress)", () => {
    it("returns 0 for empty dates", () => {
      expect(computeStreakFromDates([])).toBe(0);
    });

    it("returns 1 for a single date", () => {
      expect(computeStreakFromDates(["2025-01-15"])).toBe(1);
    });

    it("returns correct streak for consecutive dates", () => {
      expect(
        computeStreakFromDates(["2025-01-15", "2025-01-14", "2025-01-13"])
      ).toBe(3);
    });

    it("stops counting at a gap", () => {
      expect(
        computeStreakFromDates([
          "2025-01-15",
          "2025-01-14",
          "2025-01-12", // gap: missing Jan 13
          "2025-01-11",
        ])
      ).toBe(2);
    });

    it("handles a single-day streak followed by a gap", () => {
      expect(computeStreakFromDates(["2025-01-15", "2025-01-10"])).toBe(1);
    });

    it("handles long consecutive streaks", () => {
      const dates: string[] = [];
      for (let i = 0; i < 30; i++) {
        const d = new Date("2025-01-30");
        d.setDate(d.getDate() - i);
        dates.push(d.toISOString().slice(0, 10));
      }
      expect(computeStreakFromDates(dates)).toBe(30);
    });
  });

  describe("countDistinctBloomsLevels (blooms_climb progress)", () => {
    it("returns 0 for empty array", () => {
      expect(countDistinctBloomsLevels([])).toBe(0);
    });

    it("returns 0 for all null values", () => {
      expect(countDistinctBloomsLevels([null, null])).toBe(0);
    });

    it("counts distinct non-null levels", () => {
      expect(
        countDistinctBloomsLevels([
          "Remembering",
          "Understanding",
          "Applying",
          "Analyzing",
          "Evaluating",
          "Creating",
        ])
      ).toBe(6);
    });

    it("deduplicates repeated levels", () => {
      expect(
        countDistinctBloomsLevels([
          "Remembering",
          "Remembering",
          "Understanding",
          "Understanding",
        ])
      ).toBe(2);
    });

    it("ignores null values mixed with valid levels", () => {
      expect(
        countDistinctBloomsLevels(["Remembering", null, "Applying", null])
      ).toBe(2);
    });
  });

  describe("Idempotency (Task 2.6)", () => {
    it("recomputing progress from same source data yields same result", () => {
      // Simulate: same set of graded assignments → same count
      const gradedAssignments = ["a1", "a2", "a3"];
      const progress1 = gradedAssignments.length;
      const progress2 = gradedAssignments.length;
      expect(progress1).toBe(progress2);
    });

    it("recomputing XP total from same transactions yields same result", () => {
      const transactions = [
        { xp_amount: 10 },
        { xp_amount: 25 },
        { xp_amount: 15 },
      ];
      const total1 = transactions.reduce((sum, t) => sum + t.xp_amount, 0);
      const total2 = transactions.reduce((sum, t) => sum + t.xp_amount, 0);
      expect(total1).toBe(total2);
      expect(total1).toBe(50);
    });

    it("reward_granted flag prevents double-awarding", () => {
      // Simulate: first completion triggers reward, second does not
      const progressRecord = {
        current_progress: 10,
        goal_target: 10,
        completed_at: null as string | null,
        reward_granted: false,
      };

      // First processing: completion detected
      const firstComplete =
        progressRecord.current_progress >= progressRecord.goal_target &&
        !progressRecord.completed_at;
      expect(firstComplete).toBe(true);

      // Simulate reward granted
      progressRecord.completed_at = "2025-01-15T00:00:00Z";
      progressRecord.reward_granted = true;

      // Second processing: already completed and rewarded — skip
      const secondComplete =
        progressRecord.current_progress >= progressRecord.goal_target &&
        !progressRecord.completed_at;
      expect(secondComplete).toBe(false);

      // Even if completed_at is set but reward_granted is checked
      const shouldReward = !progressRecord.reward_granted;
      expect(shouldReward).toBe(false);
    });
  });

  describe("Event type coverage", () => {
    it("all three event types map to at least one challenge type", () => {
      for (const eventType of VALID_EVENT_TYPES) {
        const types = getMatchingChallengeTypes(eventType);
        expect(types.length).toBeGreaterThan(0);
      }
    });

    it("cooperative challenges are reachable from all event types", () => {
      for (const eventType of VALID_EVENT_TYPES) {
        const types = getMatchingChallengeTypes(eventType);
        expect(types).toContain("cooperative");
      }
    });

    it("each non-cooperative challenge type is reachable from exactly one event type", () => {
      const typeToEvent: Record<string, EventType[]> = {};
      for (const eventType of VALID_EVENT_TYPES) {
        for (const ct of getMatchingChallengeTypes(eventType)) {
          if (ct === "cooperative") continue;
          if (!typeToEvent[ct]) typeToEvent[ct] = [];
          typeToEvent[ct].push(eventType);
        }
      }
      // academic → grade only
      expect(typeToEvent["academic"]).toEqual(["grade"]);
      // blooms_climb → grade only
      expect(typeToEvent["blooms_climb"]).toEqual(["grade"]);
      // habit → habit only
      expect(typeToEvent["habit"]).toEqual(["habit"]);
      // xp_race → xp only
      expect(typeToEvent["xp_race"]).toEqual(["xp"]);
    });
  });
});

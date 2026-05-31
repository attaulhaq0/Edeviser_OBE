// Unit tests for current/next-class timetable context (Task 19.3)
// Requirements: 12.4, 13.2, 21.3

import { describe, it, expect } from "vitest";
import {
  computeTimetableNow,
  formatDurationParts,
  parseTimeToMinutes,
} from "@/lib/timetableNow";
import type { TimetableSlot } from "@/hooks/useTimetable";

const slot = (overrides: Partial<TimetableSlot>): TimetableSlot => ({
  id: overrides.id ?? "slot-1",
  section_id: overrides.section_id ?? "sec-1",
  day_of_week: overrides.day_of_week ?? 1,
  start_time: overrides.start_time ?? "09:00",
  end_time: overrides.end_time ?? "10:00",
  room: overrides.room ?? null,
  slot_type: overrides.slot_type ?? "lecture",
  course_name: overrides.course_name,
  section_code: overrides.section_code,
  course_id: overrides.course_id,
  color: overrides.color,
});

// Reference instants. JS getDay(): 0=Sun … 6=Sat.
// 2025-06-02 is a Monday.
const MON_0900 = new Date("2025-06-02T09:00:00");
const MON_0930 = new Date("2025-06-02T09:30:00");
const MON_1100 = new Date("2025-06-02T11:00:00");
const FRI_1800 = new Date("2025-06-06T18:00:00"); // Friday evening

describe("parseTimeToMinutes", () => {
  it("parses HH:MM", () => {
    expect(parseTimeToMinutes("09:30")).toBe(570);
  });

  it("parses HH:MM:SS", () => {
    expect(parseTimeToMinutes("09:30:45")).toBe(570);
  });

  it("returns null for invalid input", () => {
    expect(parseTimeToMinutes("")).toBeNull();
    expect(parseTimeToMinutes("25:00")).toBeNull();
    expect(parseTimeToMinutes("09:60")).toBeNull();
    expect(parseTimeToMinutes(null)).toBeNull();
    expect(parseTimeToMinutes(undefined)).toBeNull();
    expect(parseTimeToMinutes("abc")).toBeNull();
  });
});

describe("computeTimetableNow", () => {
  it("reports 'none' when there are no slots (R13.2 empty fallback)", () => {
    expect(computeTimetableNow([], MON_0930)).toEqual({
      status: "none",
      slot: null,
      minutes: null,
    });
  });

  it("reports 'none' when all slots are unparseable", () => {
    const bad = [
      slot({ start_time: "bad", end_time: "10:00" }),
      slot({ day_of_week: 9 }),
      slot({ start_time: "10:00", end_time: "09:00" }), // non-positive duration
    ];
    expect(computeTimetableNow(bad, MON_0930).status).toBe("none");
  });

  it("detects an in-progress class and minutes until it ends (R12.4, R21.3)", () => {
    const ctx = computeTimetableNow(
      [slot({ day_of_week: 1, start_time: "09:00", end_time: "10:00" })],
      MON_0930
    );
    expect(ctx.status).toBe("in_class");
    expect(ctx.slot?.id).toBe("slot-1");
    expect(ctx.minutes).toBe(30);
  });

  it("treats the start boundary as in-class and the end boundary as not in-class", () => {
    const slots = [
      slot({ id: "s", day_of_week: 1, start_time: "09:00", end_time: "10:00" }),
    ];
    // Exactly at start → in class, full hour remaining.
    expect(
      computeTimetableNow(slots, new Date("2025-06-02T09:00:00"))
    ).toMatchObject({ status: "in_class", minutes: 60 });
    // Exactly at end → not in class anymore (next occurrence next week).
    expect(
      computeTimetableNow(slots, new Date("2025-06-02T10:00:00")).status
    ).toBe("upcoming");
  });

  it("prefers the soonest-ending class when slots overlap", () => {
    const ctx = computeTimetableNow(
      [
        slot({
          id: "long",
          day_of_week: 1,
          start_time: "09:00",
          end_time: "12:00",
        }),
        slot({
          id: "short",
          day_of_week: 1,
          start_time: "09:00",
          end_time: "10:00",
        }),
      ],
      MON_0930
    );
    expect(ctx.slot?.id).toBe("short");
    expect(ctx.minutes).toBe(30);
  });

  it("picks the next upcoming class with minutes until it starts", () => {
    const ctx = computeTimetableNow(
      [
        slot({
          id: "early",
          day_of_week: 1,
          start_time: "08:00",
          end_time: "08:45",
        }),
        slot({
          id: "next",
          day_of_week: 1,
          start_time: "10:00",
          end_time: "11:00",
        }),
      ],
      MON_0900
    );
    expect(ctx.status).toBe("upcoming");
    expect(ctx.slot?.id).toBe("next");
    expect(ctx.minutes).toBe(60);
  });

  it("chooses the nearest future slot across multiple days", () => {
    const ctx = computeTimetableNow(
      [
        slot({
          id: "tue",
          day_of_week: 2,
          start_time: "09:00",
          end_time: "10:00",
        }),
        slot({
          id: "mon-late",
          day_of_week: 1,
          start_time: "14:00",
          end_time: "15:00",
        }),
      ],
      MON_1100
    );
    expect(ctx.status).toBe("upcoming");
    expect(ctx.slot?.id).toBe("mon-late");
    expect(ctx.minutes).toBe(180); // 11:00 → 14:00
  });

  it("wraps around the week so a Friday-evening now points at next week's class", () => {
    const ctx = computeTimetableNow(
      [
        slot({
          id: "mon9",
          day_of_week: 1,
          start_time: "09:00",
          end_time: "10:00",
        }),
      ],
      FRI_1800
    );
    expect(ctx.status).toBe("upcoming");
    expect(ctx.slot?.id).toBe("mon9");
    // Fri 18:00 → Mon 09:00 = 2 days (Sat, Sun) + 15h = (2*1440) + 900 = 3780 min
    expect(ctx.minutes).toBe(3780);
  });

  it("is deterministic for identical inputs", () => {
    const slots = [
      slot({ day_of_week: 1, start_time: "10:00", end_time: "11:00" }),
    ];
    expect(computeTimetableNow(slots, MON_0930)).toEqual(
      computeTimetableNow(slots, MON_0930)
    );
  });
});

describe("formatDurationParts", () => {
  it("splits minutes into days/hours/minutes", () => {
    expect(formatDurationParts(0)).toEqual({ days: 0, hours: 0, minutes: 0 });
    expect(formatDurationParts(45)).toEqual({ days: 0, hours: 0, minutes: 45 });
    expect(formatDurationParts(90)).toEqual({ days: 0, hours: 1, minutes: 30 });
    expect(formatDurationParts(1500)).toEqual({
      days: 1,
      hours: 1,
      minutes: 0,
    });
    expect(formatDurationParts(3780)).toEqual({
      days: 2,
      hours: 15,
      minutes: 0,
    });
  });

  it("collapses negative or non-finite values to zero", () => {
    expect(formatDurationParts(-10)).toEqual({ days: 0, hours: 0, minutes: 0 });
    expect(formatDurationParts(Number.NaN)).toEqual({
      days: 0,
      hours: 0,
      minutes: 0,
    });
    expect(formatDurationParts(Number.POSITIVE_INFINITY)).toEqual({
      days: 0,
      hours: 0,
      minutes: 0,
    });
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ──────────────────────────────────────────────────────────────────
// A small chainable query builder mock: `from(...).select(...).eq(...).eq(...)`
// resolves to the seeded habit_logs rows. `functions.invoke` records calls.

let mockHabitRows: Array<{ habit_type: string }> = [];
let mockHabitError: { message: string } | null = null;

const mockInvoke = vi.fn().mockResolvedValue({ data: {}, error: null });
const mockRead = vi.fn();

const makeSelectChain = () => {
  const chain = {
    select: vi.fn(() => chain),
    // Each .eq returns the chain; the chain is awaitable (thenable) so the final
    // `.eq(...)` resolves to the result.
    eq: vi.fn(() => chain),
    then: (resolve: (value: { data: unknown; error: unknown }) => unknown) =>
      mockRead().then(resolve),
  };
  return chain;
};

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => makeSelectChain()),
    functions: {
      invoke: (...args: unknown[]) => mockInvoke(...args),
    },
  },
}));

import { awardPerfectDayIfComplete, PERFECT_DAY_XP } from "@/lib/perfectDay";

const ALL_FOUR = [
  { habit_type: "login" },
  { habit_type: "submit" },
  { habit_type: "journal" },
  { habit_type: "read" },
];

describe("awardPerfectDayIfComplete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHabitRows = [];
    mockHabitError = null;
    mockRead.mockImplementation(async () => ({
      data: mockHabitRows,
      error: mockHabitError,
    }));
    mockInvoke.mockResolvedValue({ data: {}, error: null });
  });

  it("does not start a lookup when the optional signal is already cancelled", async () => {
    const controller = new AbortController();
    controller.abort();
    expect(
      (await awardPerfectDayIfComplete("student-1", controller.signal)).awarded
    ).toBe(false);
    expect(mockRead).not.toHaveBeenCalled();
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it("does not invoke rewards if cancelled while the habit lookup is awaiting", async () => {
    let resolve!: (value: { data: typeof ALL_FOUR; error: null }) => void;
    mockRead.mockReturnValue(
      new Promise((done) => {
        resolve = done;
      })
    );
    const controller = new AbortController();
    const result = awardPerfectDayIfComplete("student-1", controller.signal);
    await vi.waitFor(() => expect(mockRead).toHaveBeenCalledTimes(1));
    controller.abort();
    resolve({ data: ALL_FOUR, error: null });
    expect((await result).awarded).toBe(false);
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it("does not invoke check-badges if cancelled during an already-started award-xp", async () => {
    mockHabitRows = ALL_FOUR;
    let resolve!: (value: { data: object; error: null }) => void;
    mockInvoke.mockReturnValueOnce(
      new Promise((done) => {
        resolve = done;
      })
    );
    const controller = new AbortController();
    const result = awardPerfectDayIfComplete("student-1", controller.signal);
    await vi.waitFor(() => expect(mockInvoke).toHaveBeenCalledTimes(1));
    controller.abort();
    resolve({ data: {}, error: null });
    expect((await result).awarded).toBe(false);
    expect(mockInvoke.mock.calls.map((call) => call[0])).toEqual(["award-xp"]);
  });

  it("awards perfect_day 50 XP and fires check-badges when all 4 habits present", async () => {
    mockHabitRows = ALL_FOUR;

    const result = await awardPerfectDayIfComplete("student-1");

    expect(result.awarded).toBe(true);

    // award-xp invoked with the canonical milestone payload.
    expect(mockInvoke).toHaveBeenCalledWith(
      "award-xp",
      expect.objectContaining({
        body: expect.objectContaining({
          student_id: "student-1",
          source: "perfect_day",
          xp_amount: PERFECT_DAY_XP,
          is_milestone: true,
          reference_id: expect.stringMatching(
            /^perfect_day:student-1:\d{4}-\d{2}-\d{2}$/
          ),
        }),
      })
    );

    // check-badges invoked with the perfect_day trigger.
    expect(mockInvoke).toHaveBeenCalledWith(
      "check-badges",
      expect.objectContaining({
        body: expect.objectContaining({
          student_id: "student-1",
          trigger: "perfect_day",
        }),
      })
    );
  });

  it("does NOT award when fewer than 4 habits present", async () => {
    mockHabitRows = [{ habit_type: "login" }, { habit_type: "submit" }];

    const result = await awardPerfectDayIfComplete("student-1");

    expect(result.awarded).toBe(false);
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it("treats duplicate habit rows as a single habit (no false positive)", async () => {
    mockHabitRows = [
      { habit_type: "login" },
      { habit_type: "login" },
      { habit_type: "submit" },
      { habit_type: "journal" },
    ];

    const result = await awardPerfectDayIfComplete("student-1");

    expect(result.awarded).toBe(false);
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it("uses a deterministic per-day reference_id for idempotency", async () => {
    mockHabitRows = ALL_FOUR;

    const result = await awardPerfectDayIfComplete("student-9");

    const call = mockInvoke.mock.calls.find((c) => c[0] === "award-xp");
    const body = (call?.[1] as { body: { reference_id: string } }).body;
    expect(body.reference_id).toBe(`perfect_day:student-9:${result.date}`);
  });

  it("returns not-awarded for an empty studentId without invoking", async () => {
    const result = await awardPerfectDayIfComplete("");

    expect(result.awarded).toBe(false);
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it("does not throw and returns not-awarded when habit read errors", async () => {
    mockHabitError = { message: "boom" };

    const result = await awardPerfectDayIfComplete("student-1");

    expect(result.awarded).toBe(false);
    expect(mockInvoke).not.toHaveBeenCalled();
  });
});

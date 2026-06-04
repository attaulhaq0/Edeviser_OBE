import { describe, it, expect } from "vitest";
import { pickColumns } from "../db/pickColumns";

describe("pickColumns", () => {
  it("copies only the allowed keys that are present", () => {
    const payload = { a: 1, b: 2, c: 3 };
    expect(pickColumns(payload, ["a", "c"] as const)).toEqual({ a: 1, c: 3 });
  });

  it("drops keys whose value is undefined", () => {
    const payload = { a: 1, b: undefined as number | undefined };
    expect(pickColumns(payload, ["a", "b"] as const)).toEqual({ a: 1 });
  });

  it("excludes UI-only keys that are not in the allowed list", () => {
    const payload = { title: "Race", xp_race_acknowledged: true };
    const row = pickColumns(payload, ["title"] as const);
    expect(row).toEqual({ title: "Race" });
    expect("xp_race_acknowledged" in row).toBe(false);
  });

  it("keeps falsy-but-defined values (0, false, empty string, null)", () => {
    const payload = { zero: 0, flag: false, text: "", maybe: null };
    expect(
      pickColumns(payload, ["zero", "flag", "text", "maybe"] as const)
    ).toEqual({
      zero: 0,
      flag: false,
      text: "",
      maybe: null,
    });
  });

  it("returns an empty object when no keys are allowed", () => {
    expect(pickColumns({ a: 1, b: 2 }, [] as const)).toEqual({});
  });

  it("does not mutate the source payload (pure function)", () => {
    const payload = { a: 1, b: 2 };
    const snapshot = { ...payload };
    pickColumns(payload, ["a"] as const);
    expect(payload).toEqual(snapshot);
  });

  it("returns a new object reference distinct from the payload", () => {
    const payload = { a: 1 };
    expect(pickColumns(payload, ["a"] as const)).not.toBe(payload);
  });
});

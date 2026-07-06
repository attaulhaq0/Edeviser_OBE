// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from "vitest";
import {
  readCachedDashboard,
  writeCachedDashboard,
  clearCachedDashboard,
  DASHBOARD_CACHE_MAX_AGE_MS,
} from "@/lib/dashboardCache";

const USER_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const USER_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

interface Payload {
  totalXP: number;
  label: string;
}
const PAYLOAD_A: Payload = { totalXP: 100, label: "alice" };

describe("dashboardCache", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("round-trips a snapshot for its owner", () => {
    writeCachedDashboard(USER_A, PAYLOAD_A);
    const hit = readCachedDashboard<Payload>(USER_A);
    expect(hit?.data).toEqual(PAYLOAD_A);
    expect(typeof hit?.cachedAt).toBe("number");
  });

  it("never returns one user's snapshot to another (cross-user no-leak)", () => {
    writeCachedDashboard(USER_A, PAYLOAD_A);
    // User B must not read A's snapshot...
    expect(readCachedDashboard<Payload>(USER_B)).toBeNull();
    // ...and the foreign entry is dropped on the mismatched read.
    expect(localStorage.getItem("edeviser.dashboard.student.v1")).toBeNull();
  });

  it("clears the snapshot", () => {
    writeCachedDashboard(USER_A, PAYLOAD_A);
    clearCachedDashboard();
    expect(readCachedDashboard<Payload>(USER_A)).toBeNull();
  });

  it("ignores (and drops) a snapshot older than the max age", () => {
    writeCachedDashboard(USER_A, PAYLOAD_A);
    // Rewrite the stored envelope with an ancient cachedAt.
    const key = "edeviser.dashboard.student.v1";
    const raw = JSON.parse(localStorage.getItem(key) as string);
    raw.cachedAt = Date.now() - (DASHBOARD_CACHE_MAX_AGE_MS + 1000);
    localStorage.setItem(key, JSON.stringify(raw));

    expect(readCachedDashboard<Payload>(USER_A)).toBeNull();
    expect(localStorage.getItem(key)).toBeNull();
  });

  it("returns null on a corrupt entry without throwing", () => {
    localStorage.setItem("edeviser.dashboard.student.v1", "{not json");
    expect(readCachedDashboard<Payload>(USER_A)).toBeNull();
  });
});

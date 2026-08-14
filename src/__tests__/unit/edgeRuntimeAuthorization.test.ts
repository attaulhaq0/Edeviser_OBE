import { describe, expect, it } from "vitest";
import {
  authorizeCronOrManagedServer,
  canProcessBadgesForStudent,
  fixedStudentSelfXp,
  hasCronOrManagedServerAuthorization,
  hasManagedServerAuthorization,
} from "../../../supabase/functions/_shared/runtimeAuthorization";

const managedKey = "test-managed-server-key";

describe("verify_jwt=false handler runtime authorization", () => {
  describe("award-xp", () => {
    it("rejects missing, invalid, and substring bearer authorization", () => {
      for (const authorization of [
        "",
        "Bearer invalid",
        `Bearer prefix-${managedKey}-suffix`,
      ]) {
        expect(
          hasManagedServerAuthorization({
            authorization,
            managedServerKey: managedKey,
          })
        ).toBe(false);
      }
    });

    it("accepts exact bearer or internal server authorization", () => {
      expect(
        hasManagedServerAuthorization({
          authorization: `Bearer ${managedKey}`,
          managedServerKey: managedKey,
        })
      ).toBe(true);
      expect(
        hasManagedServerAuthorization({
          authorization: "Bearer public-client-key",
          internalAuthorization: managedKey,
          managedServerKey: managedKey,
        })
      ).toBe(true);
    });

    it("enforces fixed XP for permitted fixed-amount self-actions", () => {
      expect(fixedStudentSelfXp("login")).toBe(10);
      expect(fixedStudentSelfXp("journal")).toBe(20);
      expect(fixedStudentSelfXp("admin_adjustment")).toBeNull();
    });
  });

  describe("check-badges", () => {
    it("rejects missing and invalid server authorization", () => {
      expect(
        hasManagedServerAuthorization({
          authorization: "",
          managedServerKey: managedKey,
        })
      ).toBe(false);
      expect(
        hasManagedServerAuthorization({
          authorization: "Bearer invalid",
          managedServerKey: managedKey,
        })
      ).toBe(false);
    });

    it("accepts internal processing and student self-processing only", () => {
      expect(
        canProcessBadgesForStudent({
          isManagedServer: true,
          callerId: null,
          studentId: "student-a",
        })
      ).toBe(true);
      expect(
        canProcessBadgesForStudent({
          isManagedServer: false,
          callerId: "student-a",
          studentId: "student-a",
        })
      ).toBe(true);
      expect(
        canProcessBadgesForStudent({
          isManagedServer: false,
          callerId: "student-a",
          studentId: "student-b",
        })
      ).toBe(false);
    });
  });

  describe("ai-at-risk-prediction", () => {
    it("rejects no auth, invalid server credentials, invalid cron, and user JWTs", () => {
      for (const authorization of [
        "",
        "Bearer invalid",
        "Bearer normal-user-jwt",
      ]) {
        expect(
          hasCronOrManagedServerAuthorization({
            authorization,
            cronSecret: "invalid-cron",
            expectedCronSecret: "expected-cron",
            managedServerKey: managedKey,
          })
        ).toBe(false);
        expect(
          authorizeCronOrManagedServer({
            authorization,
            cronSecret: "invalid-cron",
            expectedCronSecret: "expected-cron",
            managedServerKey: managedKey,
          })
        ).toEqual({ authorized: false, status: 401 });
      }
    });

    it("accepts exact internal server or cron authorization without an AI call", () => {
      expect(
        hasCronOrManagedServerAuthorization({
          authorization: `Bearer ${managedKey}`,
          expectedCronSecret: "expected-cron",
          managedServerKey: managedKey,
        })
      ).toBe(true);
      expect(
        hasCronOrManagedServerAuthorization({
          authorization: "",
          cronSecret: "expected-cron",
          expectedCronSecret: "expected-cron",
          managedServerKey: managedKey,
        })
      ).toBe(true);
    });
  });
});

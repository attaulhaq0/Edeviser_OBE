import { describe, expect, it } from "vitest";

import {
  buildProactiveMessage,
  type ProactiveJob,
} from "../../../supabase/functions/_shared/ai/proactive-worker";
import { timingSafeEqual } from "../../../supabase/functions/_shared/timing-safe-equal";

const job = (role: ProactiveJob["recipient_role"]): ProactiveJob => ({
  id: "11111111-1111-4111-8111-111111111111",
  institution_id: "22222222-2222-4222-8222-222222222222",
  student_id: "33333333-3333-4333-8333-333333333333",
  recipient_user_id: "44444444-4444-4444-8444-444444444444",
  recipient_role: role,
  course_id: "55555555-5555-4555-8555-555555555555",
  program_id: "66666666-6666-4666-8666-666666666666",
  learning_state_version: 4,
  trigger_key: "student-learning-state/low-mastery/v1",
  specialist: role === "student" ? "mastery" : role,
  evidence_hash: "a".repeat(32),
  evidence_packet: {
    contractVersion: "proactive-evidence/v1.0.0",
    riskSignal: { kind: "low_mastery", value: 49, threshold: 70 },
  },
});

const expectedRoleInstruction = {
  student: "one manageable next learning step",
  teacher: "one reviewable teaching intervention",
  parent: "non-diagnostic support summary",
  coordinator: "do not claim a cohort pattern",
  admin: "governance or data-quality review step",
} as const;

describe("proactive worker prompt boundary", () => {
  it.each(["student", "teacher", "parent", "coordinator", "admin"] as const)(
    "creates bounded role guidance for %s",
    (role) => {
      const message = buildProactiveMessage(job(role));
      expect(message).toContain(expectedRoleInstruction[role]);
      expect(message).toContain("deterministic server trigger");
      expect(message).toContain("Do not recalculate");
      expect(message).toContain("protected action");
      expect(message).toContain("UNTRUSTED_EVIDENCE_PACKET");
      expect(message).toContain('"kind":"low_mastery"');
    }
  );

  it("compacts oversized evidence into valid bounded JSON", () => {
    const oversized = job("student");
    oversized.evidence_packet = {
      ...oversized.evidence_packet,
      riskSignal: {
        kind: "low_mastery",
        outcomeId: "77777777-7777-4777-8777-777777777777",
        detail: "x".repeat(12_000),
      },
    };

    const message = buildProactiveMessage(oversized);
    const serializedPacket = message.split("UNTRUSTED_EVIDENCE_PACKET\n")[1];
    expect(message.length).toBeLessThan(8_000);
    if (!serializedPacket)
      throw new Error("Serialized evidence packet missing");
    expect(JSON.parse(serializedPacket)).toMatchObject({
      packetTruncated: true,
      riskSignal: { kind: "low_mastery" },
    });
  });
});

describe("worker credential comparison", () => {
  it("matches only identical byte sequences", () => {
    expect(timingSafeEqual("same-secret", "same-secret")).toBe(true);
    expect(timingSafeEqual("same-secret", "different-secret")).toBe(false);
    expect(timingSafeEqual("short", "shorter")).toBe(false);
    expect(timingSafeEqual("مفتاح", "مفتاح")).toBe(true);
  });
});

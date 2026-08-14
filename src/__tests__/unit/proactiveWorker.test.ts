import { describe, expect, it } from "vitest";

import {
  buildProactiveMessage,
  type ProactiveJob,
} from "../../../supabase/functions/_shared/ai/proactive-worker";

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

describe("proactive worker prompt boundary", () => {
  it.each(["student", "teacher", "parent", "coordinator", "admin"] as const)(
    "creates bounded role guidance for %s",
    (role) => {
      const message = buildProactiveMessage(job(role));
      expect(message).toContain("deterministic server trigger");
      expect(message).toContain("Do not recalculate");
      expect(message).toContain("protected action");
      expect(message).toContain("UNTRUSTED_EVIDENCE_PACKET");
      expect(message).toContain('"kind":"low_mastery"');
    }
  );
});

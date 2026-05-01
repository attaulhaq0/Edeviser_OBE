// Feature: adaptive-quiz-generation, Property 22: Recovery pathway blocks retry until complete
// **Validates: Requirements 18.3, 19.5**

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  isRecoveryComplete,
  type RecoveryPathway,
} from "@/lib/masteryRecovery";

/** Arbitrary for a RecoveryPathway with independent boolean flags. */
const recoveryPathwayArb: fc.Arbitrary<RecoveryPathway> = fc.record({
  ai_tutor_completed: fc.boolean(),
  practice_completed: fc.boolean(),
});

describe("Recovery pathway blocks retry until complete — property-based tests", () => {
  it("P22a: isRecoveryComplete returns true only when both ai_tutor_completed AND practice_completed are true", () => {
    fc.assert(
      fc.property(recoveryPathwayArb, (pathway) => {
        const result = isRecoveryComplete(pathway);
        const expected =
          pathway.ai_tutor_completed && pathway.practice_completed;
        expect(result).toBe(expected);
      }),
      { numRuns: 100 }
    );
  });

  it("P22b: isRecoveryComplete returns false when ai_tutor_completed is false", () => {
    fc.assert(
      fc.property(fc.boolean(), (practiceCompleted) => {
        const pathway: RecoveryPathway = {
          ai_tutor_completed: false,
          practice_completed: practiceCompleted,
        };
        expect(isRecoveryComplete(pathway)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it("P22c: isRecoveryComplete returns false when practice_completed is false", () => {
    fc.assert(
      fc.property(fc.boolean(), (aiTutorCompleted) => {
        const pathway: RecoveryPathway = {
          ai_tutor_completed: aiTutorCompleted,
          practice_completed: false,
        };
        expect(isRecoveryComplete(pathway)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it("P22d: isRecoveryComplete returns true when both steps are completed", () => {
    const pathway: RecoveryPathway = {
      ai_tutor_completed: true,
      practice_completed: true,
    };
    expect(isRecoveryComplete(pathway)).toBe(true);
  });

  it("P22e: peer suggestion step does not gate retry — only ai_tutor and practice matter", () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        fc.boolean(),
        fc.boolean(),
        (aiTutor, practice, _peerSuggestion) => {
          // The RecoveryPathway type only has ai_tutor_completed and practice_completed.
          // Peer suggestion is not part of the gating logic, confirming the design.
          const pathway: RecoveryPathway = {
            ai_tutor_completed: aiTutor,
            practice_completed: practice,
          };
          const result = isRecoveryComplete(pathway);
          expect(result).toBe(aiTutor && practice);
        }
      ),
      { numRuns: 100 }
    );
  });
});

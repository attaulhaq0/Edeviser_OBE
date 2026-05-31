import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  passwordVisibilityReducer,
  initialPasswordVisibilityState,
  isFieldRevealed,
  type PasswordVisibilityAction,
  type PasswordVisibilityState,
} from "@/lib/passwordVisibility";

/**
 * Feature: student-experience-remediation, Property 5: At most one password
 * field is revealed at a time.
 *
 * For any finite sequence of reveal/hide actions over any number of password
 * fields sharing a visibility group, after applying each action via the
 * `passwordVisibility` reducer the group has at most one revealed field, and
 * revealing a field hides every other field in the group.
 *
 * Validates: Requirements 5.5
 */

describe("passwordVisibility.property.test", () => {
  /**
   * Build a generator over a fixed roster of field ids and produce arbitrary
   * sequences of reveal/hide actions targeting those ids. Constraining action
   * ids to the known roster keeps the generator inside the realistic input
   * space (a form's password fields) while still exercising hides of
   * already-masked fields and reveals that displace a different field.
   */
  const actionsOverFields = (fieldIds: string[]) =>
    fc.array(
      fc.record({
        type: fc.constantFrom<"reveal" | "hide">("reveal", "hide"),
        id: fc.constantFrom(...fieldIds),
      }),
      { maxLength: 50 }
    );

  // 1..6 distinct field ids — covers single-field forms through large groups.
  const fieldRoster = fc
    .integer({ min: 1, max: 6 })
    .map((n) => Array.from({ length: n }, (_, i) => `field-${i}`));

  /**
   * Core invariant: after every action in any sequence, at most one field is
   * revealed. The state's `revealed` member is either null or exactly one of
   * the known field ids, so no two fields can be shown in plain text at once.
   */
  it("never reveals more than one field after any action sequence", () => {
    fc.assert(
      fc.property(
        fieldRoster.chain((fieldIds) =>
          fc.tuple(fc.constant(fieldIds), actionsOverFields(fieldIds))
        ),
        ([fieldIds, actions]) => {
          let state: PasswordVisibilityState = initialPasswordVisibilityState;

          for (const action of actions as PasswordVisibilityAction[]) {
            state = passwordVisibilityReducer(state, action);

            // At most one field reports as revealed across the whole roster.
            const revealedCount = fieldIds.filter((id) =>
              isFieldRevealed(state, id)
            ).length;
            expect(revealedCount).toBeLessThanOrEqual(1);

            // The revealed id, when present, is always a real group member.
            if (state.revealed !== null) {
              expect(fieldIds).toContain(state.revealed);
            }
          }
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * Revealing a field hides every other field: immediately after a `reveal`
   * action, the only revealed field is the one just revealed.
   */
  it("revealing a field hides every other field", () => {
    fc.assert(
      fc.property(
        fieldRoster.chain((fieldIds) =>
          fc.tuple(fc.constant(fieldIds), actionsOverFields(fieldIds))
        ),
        ([fieldIds, actions]) => {
          let state: PasswordVisibilityState = initialPasswordVisibilityState;

          for (const action of actions as PasswordVisibilityAction[]) {
            state = passwordVisibilityReducer(state, action);

            if (action.type === "reveal") {
              // The just-revealed field is shown...
              expect(isFieldRevealed(state, action.id)).toBe(true);
              // ...and no other field is.
              for (const id of fieldIds) {
                if (id !== action.id) {
                  expect(isFieldRevealed(state, id)).toBe(false);
                }
              }
            }
          }
        }
      ),
      { numRuns: 200 }
    );
  });

  /**
   * Hiding a field clears visibility only for that field. Hiding a field that
   * is not currently revealed leaves the state unchanged (mutual exclusion is
   * preserved either way).
   */
  it("hiding only affects the matching field", () => {
    fc.assert(
      fc.property(
        fieldRoster.chain((fieldIds) =>
          fc.tuple(fc.constant(fieldIds), actionsOverFields(fieldIds))
        ),
        ([fieldIds, actions]) => {
          let state: PasswordVisibilityState = initialPasswordVisibilityState;

          for (const action of actions as PasswordVisibilityAction[]) {
            const before = state;
            state = passwordVisibilityReducer(state, action);

            if (action.type === "hide") {
              if (before.revealed === action.id) {
                // Hiding the revealed field masks the whole group.
                expect(state.revealed).toBeNull();
              } else {
                // Hiding any other (already-masked) field is a no-op.
                expect(state.revealed).toBe(before.revealed);
              }
            }
          }

          // Sanity: the post-sequence state still honors mutual exclusion.
          const revealedCount = fieldIds.filter((id) =>
            isFieldRevealed(state, id)
          ).length;
          expect(revealedCount).toBeLessThanOrEqual(1);
        }
      ),
      { numRuns: 200 }
    );
  });
});

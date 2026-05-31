/**
 * Pure mutual-exclusion reducer for password-field visibility.
 *
 * A form may contain N password fields (e.g. "new password" + "confirm
 * password"). Requirement 5.5 mandates that at most one password field may
 * display its characters in plain text at a time: revealing one field masks
 * every other field. This module models that invariant as a pure reducer so it
 * can be unit/property tested in isolation and wired into a
 * `PasswordVisibilityGroup` React context via `useReducer`.
 *
 * The state tracks only the id of the single currently-revealed field (or
 * `null` when every field is masked), which makes the mutual-exclusion
 * invariant structurally impossible to violate.
 *
 * _Requirements: 5.5_
 */

/**
 * Visibility state for a group of password fields.
 *
 * `revealed` holds the id of the single field currently shown in plain text,
 * or `null` when all fields are masked. Representing the revealed field as a
 * single id (rather than a per-field boolean map) guarantees at most one field
 * is ever revealed.
 */
export interface PasswordVisibilityState {
  readonly revealed: string | null;
}

/**
 * Actions a password field can dispatch.
 *
 * - `reveal`: show the field with the given id in plain text (hiding all others).
 * - `hide`: mask the field with the given id (no-op for any other field).
 */
export type PasswordVisibilityAction =
  | { readonly type: "reveal"; readonly id: string }
  | { readonly type: "hide"; readonly id: string };

/**
 * The initial state for a freshly-mounted group: every field masked.
 */
export const initialPasswordVisibilityState: PasswordVisibilityState = {
  revealed: null,
};

/**
 * Pure reducer enforcing password-visibility mutual exclusion.
 *
 * - Revealing a field makes it the sole revealed field, masking any other.
 * - Hiding clears the revealed field only when it is the one currently shown;
 *   hiding any other (already-masked) field leaves state unchanged.
 *
 * The function never mutates its inputs and is fully deterministic.
 *
 * _Requirements: 5.5_
 */
export function passwordVisibilityReducer(
  state: PasswordVisibilityState,
  action: PasswordVisibilityAction
): PasswordVisibilityState {
  switch (action.type) {
    case "reveal":
      // Revealing one field hides all others by replacing the revealed id.
      // Return the same reference when nothing actually changes.
      return state.revealed === action.id ? state : { revealed: action.id };
    case "hide":
      // Hiding only clears the matching field; other fields are already masked.
      return state.revealed === action.id ? { revealed: null } : state;
    default: {
      // Exhaustiveness guard: a new action type would surface here at compile
      // time. `never` is assignable to the return type, so returning it both
      // satisfies the type checker and keeps the variable used.
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}

/**
 * Selector: is the field with the given id currently revealed?
 */
export function isFieldRevealed(
  state: PasswordVisibilityState,
  id: string
): boolean {
  return state.revealed === id;
}

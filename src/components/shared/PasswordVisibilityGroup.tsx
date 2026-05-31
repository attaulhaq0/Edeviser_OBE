// =============================================================================
// PasswordVisibilityGroup — mutual-exclusion provider for password fields
// =============================================================================
//
// Wraps a set of `PasswordInput` fields so that at most one of them may reveal
// its characters in plain text at a time (Requirement 5.5). The mutual-exclusion
// logic lives entirely in the pure `passwordVisibility` reducer
// (`src/lib/passwordVisibility.ts`); this provider only adapts that reducer to
// React via `useReducer` and exposes a small context API to descendant fields.
//
// A `PasswordInput` that renders outside any `PasswordVisibilityGroup` manages
// its own independent visibility (see `PasswordInput.tsx`), so the provider is
// only needed on forms that contain more than one password field (sign-up,
// accept-invite, update-password).
//
// _Requirements: 5.5_

import {
  createContext,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import {
  initialPasswordVisibilityState,
  isFieldRevealed,
  passwordVisibilityReducer,
} from "@/lib/passwordVisibility";

/**
 * Context API consumed by `PasswordInput` to coordinate mutual exclusion.
 */
export interface PasswordVisibilityContextValue {
  /** Is the field with this id currently revealed? */
  readonly isRevealed: (id: string) => boolean;
  /** Reveal this field, masking every other field in the group. */
  readonly reveal: (id: string) => void;
  /** Mask this field (no-op if it is already masked). */
  readonly hide: (id: string) => void;
}

const PasswordVisibilityContext =
  createContext<PasswordVisibilityContextValue | null>(null);

/**
 * Returns the enclosing group's visibility API, or `null` when the field is
 * rendered outside any `PasswordVisibilityGroup` (standalone, self-managed).
 */
// eslint-disable-next-line react-refresh/only-export-components
export const usePasswordVisibilityGroup =
  (): PasswordVisibilityContextValue | null =>
    useContext(PasswordVisibilityContext);

/**
 * Provider that enforces "at most one password field revealed at a time"
 * across all descendant `PasswordInput` fields via the pure reducer.
 */
export const PasswordVisibilityGroup = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [state, dispatch] = useReducer(
    passwordVisibilityReducer,
    initialPasswordVisibilityState
  );

  const value = useMemo<PasswordVisibilityContextValue>(
    () => ({
      isRevealed: (id: string) => isFieldRevealed(state, id),
      reveal: (id: string) => dispatch({ type: "reveal", id }),
      hide: (id: string) => dispatch({ type: "hide", id }),
    }),
    [state]
  );

  return (
    <PasswordVisibilityContext.Provider value={value}>
      {children}
    </PasswordVisibilityContext.Provider>
  );
};

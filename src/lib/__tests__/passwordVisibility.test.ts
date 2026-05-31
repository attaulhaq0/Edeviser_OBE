import { describe, it, expect } from "vitest";
import {
  passwordVisibilityReducer,
  initialPasswordVisibilityState,
  isFieldRevealed,
  type PasswordVisibilityState,
} from "../passwordVisibility";

describe("passwordVisibility reducer", () => {
  it("starts with every field masked", () => {
    expect(initialPasswordVisibilityState.revealed).toBeNull();
  });

  it("reveals a field from the initial masked state", () => {
    const next = passwordVisibilityReducer(initialPasswordVisibilityState, {
      type: "reveal",
      id: "password",
    });
    expect(next.revealed).toBe("password");
    expect(isFieldRevealed(next, "password")).toBe(true);
  });

  it("revealing one field masks any previously-revealed field (mutual exclusion)", () => {
    const first = passwordVisibilityReducer(initialPasswordVisibilityState, {
      type: "reveal",
      id: "password",
    });
    const second = passwordVisibilityReducer(first, {
      type: "reveal",
      id: "confirmPassword",
    });
    expect(second.revealed).toBe("confirmPassword");
    expect(isFieldRevealed(second, "password")).toBe(false);
    expect(isFieldRevealed(second, "confirmPassword")).toBe(true);
  });

  it("hiding the currently-revealed field masks everything", () => {
    const revealed = passwordVisibilityReducer(initialPasswordVisibilityState, {
      type: "reveal",
      id: "password",
    });
    const hidden = passwordVisibilityReducer(revealed, {
      type: "hide",
      id: "password",
    });
    expect(hidden.revealed).toBeNull();
  });

  it("hiding a non-revealed field leaves the revealed field untouched", () => {
    const revealed = passwordVisibilityReducer(initialPasswordVisibilityState, {
      type: "reveal",
      id: "password",
    });
    const afterHideOther = passwordVisibilityReducer(revealed, {
      type: "hide",
      id: "confirmPassword",
    });
    expect(afterHideOther.revealed).toBe("password");
  });

  it("returns the same reference when revealing the already-revealed field", () => {
    const revealed = passwordVisibilityReducer(initialPasswordVisibilityState, {
      type: "reveal",
      id: "password",
    });
    const again = passwordVisibilityReducer(revealed, {
      type: "reveal",
      id: "password",
    });
    expect(again).toBe(revealed);
  });

  it("returns the same reference when hiding an already-masked field", () => {
    const again = passwordVisibilityReducer(initialPasswordVisibilityState, {
      type: "hide",
      id: "password",
    });
    expect(again).toBe(initialPasswordVisibilityState);
  });

  it("does not mutate the input state", () => {
    const state: PasswordVisibilityState = { revealed: "a" };
    passwordVisibilityReducer(state, { type: "reveal", id: "b" });
    passwordVisibilityReducer(state, { type: "hide", id: "a" });
    expect(state.revealed).toBe("a");
  });
});

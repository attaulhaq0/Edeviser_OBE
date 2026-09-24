import { useContext, useEffect } from "react";
import { beforeEach, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MotionConfigContext } from "framer-motion";
import { AccessibilityMotion } from "@/providers/AccessibilityMotion";
import { Input } from "@/design-system/primitives";

const state = vi.hoisted(() => ({ reduced_animations: false, mounts: 0, unmounts: 0 }));
vi.mock("@/hooks/useAccessibilityPreferences", () => ({ useAccessibilityPreferenceControls: () => ({ effective: state }) }));
function Probe() {
  const config = useContext(MotionConfigContext);
  useEffect(() => { state.mounts++; return () => { state.unmounts++; }; }, []);
  return <div data-testid="motion" data-policy={config.reducedMotion}><Input aria-label="Draft" defaultValue="Keep my draft" /></div>;
}
beforeEach(() => { state.reduced_animations = false; state.mounts = 0; state.unmounts = 0; });
it("delegates to the real platform-aware MotionConfig when no explicit reduction is requested", () => {
  render(<AccessibilityMotion><Probe /></AccessibilityMotion>);
  expect(screen.getByTestId("motion")).toHaveAttribute("data-policy", "user");
});
it("adds reduction without remounting children and never disables the OS preference", () => {
  const view = render(<AccessibilityMotion><Probe /></AccessibilityMotion>);
  const input = screen.getByRole("textbox", { name: "Draft" });
  fireEvent.change(input, { target: { value: "Unsent lesson notes" } });
  state.reduced_animations = true;
  view.rerender(<AccessibilityMotion><Probe /></AccessibilityMotion>);
  expect(screen.getByTestId("motion")).toHaveAttribute("data-policy", "always");
  state.reduced_animations = false;
  view.rerender(<AccessibilityMotion><Probe /></AccessibilityMotion>);
  expect(screen.getByTestId("motion")).toHaveAttribute("data-policy", "user");
  expect(screen.getByRole("textbox", { name: "Draft" })).toBe(input);
  expect(input).toHaveValue("Unsent lesson notes");
  expect(state.mounts).toBe(1);
  expect(state.unmounts).toBe(0);
});

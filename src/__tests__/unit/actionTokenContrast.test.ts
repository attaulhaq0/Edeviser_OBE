// Source-token contracts, not rendered CSS/compositing proof (see shell browser regression).
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertTextContrast,
  contrastRatio,
  scopedHexToken,
} from "@/__tests__/helpers/contrast";

const css = readFileSync(
  resolve(__dirname, "../../design-system/tokens.css"),
  "utf8"
);
const pairs = [
  ["--primary-foreground", "--primary"],
  ["--primary-foreground", "--action-primary-hover"],
  ["--primary-foreground", "--action-primary-active"],
  ["--secondary-foreground", "--secondary"],
  ["--destructive-foreground", "--destructive"],
  ["--accent-foreground", "--accent"],
  ["--sidebar-primary-foreground", "--sidebar-primary"],
  ["--sidebar-accent-foreground", "--sidebar-accent"],
  ["--primary", "--card"],
  ["--text-brand", "--card"],
  ["--muted-foreground", "--background"],
  ["--muted-foreground", "--card"],
  ["--progress-attention", "--card"],
  ["--notification-unread-badge-fg", "--notification-unread-badge-bg"],
  ["--promotion-badge-fg", "--promotion-badge-bg"],
] as const;

describe.each([":root", ".dark"] as const)(
  "%s normal-text semantic contrast",
  (scope) => {
    it.each(pairs)(
      "%s on %s meets AA at 14px / weight500",
      (foreground, background) => {
        expect(() =>
          assertTextContrast(
            scopedHexToken(css, scope, foreground),
            scopedHexToken(css, scope, background),
            14,
            500
          )
        ).not.toThrow();
      }
    );
  }
);

it.each([":root", ".dark"] as const)(
  "%s attention progress distinguishes its muted track",
  (scope) => {
    expect(
      contrastRatio(
        scopedHexToken(css, scope, "--progress-attention"),
        scopedHexToken(css, scope, "--muted")
      )
    ).toBeGreaterThanOrEqual(3);
  }
);

it.each([":root", ".dark"] as const)(
  "%s unread count surface is distinct from card",
  (scope) => {
    expect(
      contrastRatio(
        scopedHexToken(css, scope, "--notification-unread-badge-bg"),
        scopedHexToken(css, scope, "--card")
      )
    ).toBeGreaterThanOrEqual(3);
  }
);
it.each([":root", ".dark"] as const)(
  "%s promotion badge contrasts its card",
  (scope) => {
    expect(
      contrastRatio(
        scopedHexToken(css, scope, "--promotion-badge-bg"),
        scopedHexToken(css, scope, "--card")
      )
    ).toBeGreaterThanOrEqual(3);
  }
);
it("keeps identity anchors separate from accessible semantic action colors", () => {
  expect(scopedHexToken(css, ":root", "--brand-primary")).toBe("#0382BD");
  expect(scopedHexToken(css, ":root", "--brand-secondary")).toBe("#5AB9B4");
  expect(scopedHexToken(css, ":root", "--brand-tertiary")).toBe("#1D3557");
});

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";
import { expect, it } from "vitest";

const text = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const source = ts.createSourceFile("App.tsx", text("src/App.tsx"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function nodes(name: string) {
  const matches: ts.Node[] = [];
  const visit = (node: ts.Node) => {
    if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && node.tagName.getText(source) === name) matches.push(node);
    ts.forEachChild(node, visit);
  };
  visit(source);
  return matches;
}
function ancestors(node: ts.Node) {
  const names: string[] = [];
  for (let parent = node.parent; parent; parent = parent.parent) {
    if (ts.isJsxElement(parent)) names.push(parent.openingElement.tagName.getText(source));
  }
  return names;
}
it("connects exactly one owner below existing auth/theme/query providers, around router and overlays", () => {
  const owners = nodes("AccessibilityPreferencesProvider");
  expect(owners).toHaveLength(1);
  const owner = owners[0];
  if (!owner) throw new Error("Missing root preference owner");
  expect(ancestors(owner)).toEqual(expect.arrayContaining(["QueryClientProvider", "AuthProvider", "LanguageProvider", "ThemeProvider"]));
  for (const name of ["AppRouter", "SkipToMain", "AppToaster", "GamificationFeedbackHost", "CookieConsentBanner"]) {
    const matches = nodes(name);
    expect(matches).toHaveLength(1);
    const node = matches[0];
    if (!node) throw new Error(`Missing ${name}`);
    expect(ancestors(node)).toEqual(expect.arrayContaining(["AccessibilityPreferencesProvider", "AccessibilityMotion"]));
  }
  expect(nodes("FocusModeProvider")).toHaveLength(0);
  expect(nodes("MotionConfig")).toHaveLength(0);
});
it("removes only the old Auth rendering writer and connects the actual shared menu entry", () => {
  const auth = text("src/providers/AuthProvider.tsx");
  expect(auth).not.toMatch(/(?:load|apply)AccessibilityPreferences/);
  expect(auth).toContain("ProfilePreferenceSyncContext.Provider");
  const menu = text("src/components/shared/ProfileDropdown.tsx");
  expect(menu).toContain("useAccessibilityPreferenceControls");
  expect(menu).toContain("dialogOwner === ownerKey");
  expect(menu).toContain("menuOwner === ownerKey");
  expect(menu).toContain('t("accessibility.menuLabel")');
  expect(menu).toContain("<ReadingDisplayDialog");
});

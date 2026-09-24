import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useRef, useState } from "react";
import { Button } from "@/design-system";
import ReadingDisplayDialog from "@/components/shared/ReadingDisplayDialog";
import { createInstance } from "i18next";
import { I18nextProvider, useTranslation } from "react-i18next";
import type { AccessibilityPreferences } from "@/lib/accessibilityPreferences";
import { AccessibilitySettingsPanel } from "@/components/shared/AccessibilitySettingsPanel";
import en from "@/locales/en/common.json";
import ar from "@/locales/ar/common.json";

const controls = vi.hoisted(() => ({
  effective: { font_size: "default", high_contrast: false, reduced_animations: false, dyslexia_font: false, simplified_view: false } as AccessibilityPreferences,
  source: "device",
  ownerKey: "device-1",
  profileRead: { status: "device-only", error: null as Error | null },
  accountSync: { status: "device-only", error: null as Error | null },
  devicePersistence: { status: "unchanged", error: null as Error | null },
  fontRequest: "off",
  patchLatest: vi.fn(), retryProfileRead: vi.fn(), retryAccountSync: vi.fn(),
  retryDevicePersistence: vi.fn(), retryFont: vi.fn(),
}));
vi.mock("@/hooks/useAccessibilityPreferences", () => ({ useAccessibilityPreferenceControls: () => controls }));

function DialogHarness() {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const { t } = useTranslation("common");
  return <>
    <Button ref={trigger} onClick={() => setOpen(true)}>{t("accessibility.menuLabel")}</Button>
    <ReadingDisplayDialog open={open} onOpenChange={setOpen} returnFocusRef={trigger} />
  </>;
}

async function mount(language: "en" | "ar", dialog = false) {
  const i18n = createInstance();
  await i18n.init({ lng: language, fallbackLng: false, resources: { en: { common: en }, ar: { common: ar } }, defaultNS: "common", interpolation: { escapeValue: false } });
  render(<I18nextProvider i18n={i18n}>{dialog ? <DialogHarness /> : <AccessibilitySettingsPanel />}</I18nextProvider>);
  return i18n.getFixedT(language, "common");
}
beforeEach(() => {
  controls.effective = { font_size: "default", high_contrast: false, reduced_animations: false, dyslexia_font: false, simplified_view: false };
  controls.profileRead = { status: "device-only", error: null };
  controls.accountSync = { status: "device-only", error: null };
  controls.devicePersistence = { status: "unchanged", error: null };
  controls.fontRequest = "off";
  vi.clearAllMocks();
});

for (const language of ["en", "ar"] as const) {
  describe(`owned accessibility panel / ${language}`, () => {
    it.each([
      ["highContrast", "high_contrast"],
      ["reducedAnimations", "reduced_animations"],
      ["dyslexiaFont", "dyslexia_font"],
    ] as const)("sends only the changed %s field to the latest-snapshot owner", async (label, field) => {
      const t = await mount(language);
      const toggle = screen.getByRole("switch", { name: t(`accessibility.${label}`) });
      expect(toggle).toHaveAttribute("aria-checked", "false");
      expect(toggle).toHaveClass("min-h-11", "min-w-16");
      fireEvent.click(toggle);
      expect(controls.patchLatest).toHaveBeenCalledExactlyOnceWith({ [field]: true });
    });

    it("keeps the real switch label operable without double dispatch", async () => {
      const t = await mount(language);
      fireEvent.click(screen.getByText(t("accessibility.highContrast"), { selector: "span" }));
      expect(controls.patchLatest).toHaveBeenCalledExactlyOnceWith({ high_contrast: true });
    });

    it("labels the actual font-size control and does not expose unsupported simplification", async () => {
      const t = await mount(language);
      expect(screen.getByRole("combobox", { name: t("accessibility.fontSize") })).toHaveTextContent(t("accessibility.fontDefault"));
      expect(screen.getAllByRole("switch")).toHaveLength(3);
      expect(screen.queryByText(t("accessibility.simplifiedView"))).not.toBeInTheDocument();
    });

    it("allows turning reading off while its real font is still loading", async () => {
      controls.effective.dyslexia_font = true;
      controls.fontRequest = "loading";
      const t = await mount(language);
      expect(screen.getByRole("status")).toHaveTextContent(t("accessibility.loadingFont"));
      const toggle = screen.getByRole("switch", { name: t("accessibility.dyslexiaFont") });
      expect(toggle).toBeEnabled();
      fireEvent.click(toggle);
      expect(controls.patchLatest).toHaveBeenCalledExactlyOnceWith({ dyslexia_font: false });
      expect(screen.queryByText(t("accessibility.fontReady"))).not.toBeInTheDocument();
    });

    it("does not confuse device persistence, account acknowledgement and font readiness", async () => {
      controls.devicePersistence.status = "saved";
      controls.accountSync.status = "pending";
      controls.effective.dyslexia_font = true;
      controls.fontRequest = "loading";
      const t = await mount(language);
      expect(screen.getByRole("status")).toHaveTextContent(t("accessibility.savedDevice"));
      expect(screen.getByRole("status")).toHaveTextContent(t("accessibility.syncingAccount"));
      expect(screen.queryByText(t("accessibility.savedAccount"))).not.toBeInTheDocument();
      expect(screen.queryByText(t("accessibility.fontReady"))).not.toBeInTheDocument();
    });

    it.each([
      ["profileRead", "retryRead", "retryProfileRead", "readFailed"],
      ["accountSync", "retrySync", "retryAccountSync", "syncFailed"],
      ["devicePersistence", "retryDevice", "retryDevicePersistence", "deviceFailed"],
    ] as const)("reports %s failure and invokes its actual retry", async (status, label, retry, message) => {
      controls[status] = { status: "error", error: new Error("private backend diagnostic") };
      const t = await mount(language);
      expect(screen.getByRole("alert")).toHaveTextContent(t(`accessibility.${message}`));
      expect(screen.queryByText("private backend diagnostic")).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: t(`accessibility.${label}`) }));
      expect(controls[retry]).toHaveBeenCalledOnce();
    });

    it("distinguishes unsupported account data from a confirmed profile save", async () => {
      controls.profileRead.status = "invalid";
      const t = await mount(language);
      expect(screen.getByRole("alert")).toHaveTextContent(t("accessibility.invalidAccount"));
      expect(screen.queryByText(t("accessibility.savedAccount"))).not.toBeInTheDocument();
    });

    it("opens the actual dialog with localized close controls and returns focus", async () => {
      const t = await mount(language, true);
      const trigger = screen.getByRole("button", { name: t("accessibility.menuLabel") });
      fireEvent.click(trigger);
      expect(screen.getByRole("dialog", { name: t("accessibility.menuLabel") })).toBeInTheDocument();
      expect(screen.getByRole("region", { name: t("accessibility.title") })).not.toHaveAttribute("tabindex");
      const close = screen.getAllByRole("button", { name: t("buttons.close") });
      expect(close).toHaveLength(2);
      const headerClose = close[0];
      if (!headerClose) throw new Error("Missing header close control");
      fireEvent.click(headerClose);
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      await waitFor(() => expect(trigger).toHaveFocus());
    });

    it("closes through Escape without losing the surviving trigger", async () => {
      const t = await mount(language, true);
      const trigger = screen.getByRole("button", { name: t("accessibility.menuLabel") });
      fireEvent.click(trigger);
      await screen.findByRole("dialog");
      fireEvent.keyDown(document, { key: "Escape" });
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
      await waitFor(() => expect(trigger).toHaveFocus());
    });

    it("offers font retry without claiming the requested face is already active", async () => {
      controls.effective.dyslexia_font = true;
      controls.fontRequest = "error";
      const t = await mount(language);
      expect(screen.getByRole("alert")).toHaveTextContent(t("accessibility.fontFailed"));
      fireEvent.click(screen.getByRole("button", { name: t("accessibility.retryFont") }));
      expect(controls.retryFont).toHaveBeenCalledOnce();
      expect(screen.queryByText(t("accessibility.fontReady"))).not.toBeInTheDocument();
    });
  });
}

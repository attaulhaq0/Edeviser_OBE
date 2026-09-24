import { useId } from "react";
import { useTranslation } from "react-i18next";
import {
  Button, Label, PreferenceToggle, Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/design-system";
import { useAccessibilityPreferenceControls } from "@/hooks/useAccessibilityPreferences";

/** The one preference owner handles merging, persistence and lifecycle guards. */
export const AccessibilitySettingsPanel = () => {
  const { t, i18n } = useTranslation("common");
  const id = useId();
  const controls = useAccessibilityPreferenceControls();
  const prefs = controls.effective;
  const readProblem = controls.profileRead.status === "error" || controls.profileRead.status === "invalid";
  const syncProblem = controls.accountSync.status === "error";
  const deviceProblem = controls.devicePersistence.status === "error";
  const fontProblem = prefs.dyslexia_font && controls.fontRequest === "error";
  const syncing = controls.accountSync.status === "pending";
  const reading = controls.profileRead.status === "pending";

  return <div className="min-w-0 space-y-5">
    <p className="text-sm text-muted-foreground">{t("accessibility.devicePolicy")}</p>
    <div className="flex min-w-0 flex-wrap items-center gap-3">
      <Label htmlFor={id} className="min-w-0 grow text-base">{t("accessibility.fontSize")}</Label>
      <Select dir={i18n.dir()} name="font_size" autoComplete="off" value={prefs.font_size} onValueChange={(value) => {
        if (value === "default" || value === "large" || value === "x-large") controls.patchLatest({ font_size: value });
      }}>
        <SelectTrigger id={id} className="h-auto min-h-11 w-44 max-w-full whitespace-normal">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="default" className="min-h-11">{t("accessibility.fontDefault")}</SelectItem>
          <SelectItem value="large" className="min-h-11">{t("accessibility.fontLarge")}</SelectItem>
          <SelectItem value="x-large" className="min-h-11">{t("accessibility.fontXLarge")}</SelectItem>
        </SelectContent>
      </Select>
    </div>
    <div className="divide-y divide-border">
      <PreferenceToggle label={t("accessibility.highContrast")} description={t("accessibility.highContrastHelp")}
        checked={prefs.high_contrast} onCheckedChange={(checked) => controls.patchLatest({ high_contrast: checked })} />
      <PreferenceToggle label={t("accessibility.reducedAnimations")} description={t("accessibility.motionHelp")}
        checked={prefs.reduced_animations} onCheckedChange={(checked) => controls.patchLatest({ reduced_animations: checked })} />
      <PreferenceToggle label={t("accessibility.dyslexiaFont")} description={t("accessibility.readingFontHelp")}
        checked={prefs.dyslexia_font} onCheckedChange={(checked) => controls.patchLatest({ dyslexia_font: checked })} />
    </div>
    <div role="status" aria-live="polite" aria-atomic="true" className="space-y-2 text-sm text-muted-foreground">
      {reading && <p>{t("accessibility.loadingAccount")}</p>}
      {controls.profileRead.status === "ready" && controls.accountSync.status === "idle" && <p>{t("accessibility.accountLoaded")}</p>}
      {controls.profileRead.status === "missing" && <p>{t("accessibility.noAccountPreferences")}</p>}
      {controls.devicePersistence.status === "saved" && <p>{t("accessibility.savedDevice")}</p>}
      {syncing && <p>{t("accessibility.syncingAccount")}</p>}
      {controls.accountSync.status === "saved" && <p>{t("accessibility.savedAccount")}</p>}
      {prefs.dyslexia_font && controls.fontRequest === "loading" && <p>{t("accessibility.loadingFont")}</p>}
      {prefs.dyslexia_font && controls.fontRequest === "ready" && <p>{t("accessibility.fontReady")}</p>}
    </div>
    {(readProblem || syncProblem || deviceProblem || fontProblem) && <div className="space-y-3">
      <div role="alert" className="space-y-2 text-sm text-destructive">
        {readProblem && <p>{t(controls.profileRead.status === "invalid" ? "accessibility.invalidAccount" : "accessibility.readFailed")}</p>}
        {syncProblem && <p>{t("accessibility.syncFailed")}</p>}
        {deviceProblem && <p>{t("accessibility.deviceFailed")}</p>}
        {fontProblem && <p>{t("accessibility.fontFailed")}</p>}
      </div>
      <div className="flex flex-wrap gap-2 [&>button]:h-auto [&>button]:min-h-11 [&>button]:max-w-full [&>button]:whitespace-normal">
        {readProblem && <Button type="button" variant="outline" disabled={reading} onClick={() => void controls.retryProfileRead()}>{t("accessibility.retryRead")}</Button>}
        {syncProblem && <Button type="button" variant="outline" disabled={reading || syncing} onClick={() => void controls.retryAccountSync()}>{t("accessibility.retrySync")}</Button>}
        {deviceProblem && <Button type="button" variant="outline" onClick={() => void controls.retryDevicePersistence()}>{t("accessibility.retryDevice")}</Button>}
        {fontProblem && <Button type="button" variant="outline" onClick={() => void controls.retryFont()}>{t("accessibility.retryFont")}</Button>}
      </div>
    </div>}
  </div>;
};

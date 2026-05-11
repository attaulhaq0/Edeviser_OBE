import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useAccessibilityPreferences,
  useUpdateAccessibilityPreferences,
} from "@/hooks/useAccessibilityPreferences";
import type { AccessibilityPreferences } from "@/lib/accessibilityPreferences";

export const AccessibilitySettingsPanel = () => {
  const { t } = useTranslation("common");
  const { data: prefs } = useAccessibilityPreferences();
  const updatePrefs = useUpdateAccessibilityPreferences();

  if (!prefs) return null;

  const update = (partial: Partial<AccessibilityPreferences>) => {
    updatePrefs.mutate({ ...prefs, ...partial });
  };

  return (
    <Card className="bg-white border-0 shadow-md rounded-xl p-6 space-y-6">
      <h2 className="text-lg font-bold tracking-tight">
        {t("accessibility.title", { defaultValue: "Accessibility Settings" })}
      </h2>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="font-size">
            {t("accessibility.fontSize", { defaultValue: "Font Size" })}
          </Label>
          <Select
            value={prefs.font_size}
            onValueChange={(v) =>
              update({ font_size: v as AccessibilityPreferences["font_size"] })
            }
          >
            <SelectTrigger id="font-size" className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">
                {t("accessibility.fontDefault", { defaultValue: "Default" })}
              </SelectItem>
              <SelectItem value="large">
                {t("accessibility.fontLarge", { defaultValue: "Large" })}
              </SelectItem>
              <SelectItem value="x-large">
                {t("accessibility.fontXLarge", { defaultValue: "Extra Large" })}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="high-contrast">
            {t("accessibility.highContrast", { defaultValue: "High Contrast" })}
          </Label>
          <Switch
            id="high-contrast"
            checked={prefs.high_contrast}
            onCheckedChange={(v) => update({ high_contrast: v })}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="reduced-animations">
            {t("accessibility.reducedAnimations", {
              defaultValue: "Reduced Animations",
            })}
          </Label>
          <Switch
            id="reduced-animations"
            checked={prefs.reduced_animations}
            onCheckedChange={(v) => update({ reduced_animations: v })}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="dyslexia-font">
            {t("accessibility.dyslexiaFont", {
              defaultValue: "Dyslexia-Friendly Font",
            })}
          </Label>
          <Switch
            id="dyslexia-font"
            checked={prefs.dyslexia_font}
            onCheckedChange={(v) => update({ dyslexia_font: v })}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="simplified-view">
            {t("accessibility.simplifiedView", {
              defaultValue: "Simplified View",
            })}
          </Label>
          <Switch
            id="simplified-view"
            checked={prefs.simplified_view}
            onCheckedChange={(v) => update({ simplified_view: v })}
          />
        </div>
      </div>
    </Card>
  );
};

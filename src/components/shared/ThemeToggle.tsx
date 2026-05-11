import { useTheme } from "@/hooks/useTheme";
import { Button } from "@/components/ui/button";
import { Sun, Moon, Monitor } from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * Tri-state theme toggle (light / dark / system).
 * Backed by useTheme hook which syncs to profiles.theme_preference.
 *
 * Design: ADR-01
 * Requirements: 2.10
 *
 * @example
 * <ThemeToggle />
 */
const ThemeToggle = () => {
  const { t } = useTranslation("common");
  const { themeMode, setThemeMode } = useTheme();

  const themes = [
    { mode: "light" as const, icon: Sun, label: t("theme.light") },
    { mode: "dark" as const, icon: Moon, label: t("theme.dark") },
    { mode: "system" as const, icon: Monitor, label: t("theme.system") },
  ];

  return (
    <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
      {themes.map(({ mode, icon: Icon, label }) => (
        <Button
          key={mode}
          variant={themeMode === mode ? "default" : "ghost"}
          size="sm"
          onClick={() => setThemeMode(mode)}
          title={label}
          aria-label={label}
          aria-pressed={themeMode === mode}
          className={`p-2 h-8 w-8 ${
            themeMode === mode
              ? "bg-white text-blue-600 shadow-sm"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          <Icon className="h-4 w-4" />
        </Button>
      ))}
    </div>
  );
};

export default ThemeToggle;

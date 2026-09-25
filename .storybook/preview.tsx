import { useLayoutEffect, type ReactNode } from "react";
import type { Preview } from "@storybook/react-vite";
import "../src/index.css";
import i18n from "../src/lib/i18n";
import { applyDirection } from "../src/lib/directionManager";

// This is a rendering-only environment for public patterns. The real Theme,
// Language and AccessibilityPreferences providers are auth/profile-owned and
// MUST NOT be mounted here without their actual bridge or fake login success.
const RenderingEnvironment = ({
  children,
  locale,
  theme,
  textScale,
  highContrast,
}: {
  children: ReactNode;
  locale: "en" | "ar";
  theme: "light" | "dark";
  textScale: "normal" | "large" | "double";
  highContrast: boolean;
}) => {
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.classList.toggle("light", theme === "light");
    root.classList.toggle("high-contrast", highContrast);
    root.style.fontSize =
      textScale === "double" ? "32px" : textScale === "large" ? "20px" : "16px";
    applyDirection(locale);
    void i18n.changeLanguage(locale).catch(() => {
      console.error(
        "[Storybook] Could not apply language in this isolated example"
      );
    });
    return () => {
      root.classList.remove("dark", "light", "high-contrast");
      root.style.removeProperty("font-size");
      applyDirection("en");
    };
  }, [locale, theme, textScale, highContrast]);
  return (
    <div className="min-h-screen bg-background p-4 text-foreground">
      <div style={{ maxWidth: "48rem", marginInline: "auto" }}>{children}</div>
    </div>
  );
};

const preview: Preview = {
  globalTypes: {
    locale: {
      description: "Rendering language/direction (not account preference)",
      toolbar: {
        title: "Language",
        icon: "globe",
        items: ["en", "ar"],
        dynamicTitle: true,
      },
    },
    theme: {
      description: "Rendering palette (not stored user setting)",
      toolbar: {
        title: "Palette",
        icon: "circlehollow",
        items: ["light", "dark"],
        dynamicTitle: true,
      },
    },
    contrast: {
      description:
        "Rendering high-contrast CSS (not persisted accessibility preference)",
      toolbar: {
        title: "Contrast",
        icon: "contrast",
        items: ["standard", "high"],
        dynamicTitle: true,
      },
    },
    textScale: {
      description:
        "Rendering root type scale (not persisted accessibility preference)",
      toolbar: {
        title: "Text",
        icon: "paragraph",
        items: ["normal", "large", "double"],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    locale: "en",
    theme: "light",
    contrast: "standard",
    textScale: "normal",
  },
  parameters: {
    layout: "fullscreen",
    a11y: { test: "todo" }, // The addon panel is exploratory; no unrun CI a11y pass.
  },
  decorators: [
    (Story, context) => (
      <RenderingEnvironment
        locale={context.globals.locale === "ar" ? "ar" : "en"}
        theme={context.globals.theme === "dark" ? "dark" : "light"}
        textScale={
          context.globals.textScale === "double"
            ? "double"
            : context.globals.textScale === "large"
            ? "large"
            : "normal"
        }
        highContrast={context.globals.contrast === "high"}
      >
        <Story />
      </RenderingEnvironment>
    ),
  ],
};
export default preview;

import type { CSSProperties } from "react";
import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
  XIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Toaster } from "@/components/ui/sonner";
import { useTheme } from "@/providers/ThemeProvider";
import { useLanguage } from "@/providers/LanguageProvider";

/**
 * One app-level adoption of the generated Sonner primitive. Keep notifications
 * inside the real preference providers without coupling them to a role/route.
 * Native Sonner owns announcements, Alt+T, dismissal, promises and transitions.
 */
const AppToaster = () => {
  const { resolvedTheme } = useTheme();
  const { direction } = useLanguage();
  const { t } = useTranslation("common");

  return (
    // Touch notifications use native vertical scrolling and the visible action/
    // close buttons. Sonner 2.x captures pointers before distinguishing scrolling
    // from swiping and has no pointer-cancel reset. Stop only touch pointer-down
    // propagation, not its default behavior or subsequent clicks. Mouse swipe,
    // keyboard, timers and native notification callbacks remain Sonner-owned.
    <div onPointerDownCapture={(event) => {
      if (event.pointerType === "touch") event.stopPropagation();
    }}>
    <Toaster
      theme={resolvedTheme}
      dir={direction}
      position={direction === "rtl" ? "bottom-left" : "bottom-right"}
      className="app-toaster"
      richColors={false}
      closeButton
      containerAriaLabel={t("notifications")}
      // Sonner switches offset families at 600px; our shell switches at 640px.
      // Both consume the same value, composed locally by the shared CSS owner.
      offset={{ bottom: "var(--app-toast-bottom)" }}
      mobileOffset={{
        bottom: "var(--app-toast-bottom)",
        left: "calc(1rem + env(safe-area-inset-left, 0px))",
        right: "calc(1rem + env(safe-area-inset-right, 0px))",
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as CSSProperties
      }
      icons={{
        success: <CircleCheckIcon className="size-4" aria-hidden="true" />,
        info: <InfoIcon className="size-4" aria-hidden="true" />,
        warning: <TriangleAlertIcon className="size-4" aria-hidden="true" />,
        error: <OctagonXIcon className="size-4" aria-hidden="true" />,
        loading: (
          <Loader2Icon
            className="size-4 animate-spin motion-reduce:animate-none"
            aria-hidden="true"
          />
        ),
        close: <XIcon className="size-4" aria-hidden="true" />,
      }}
      toastOptions={{
        closeButtonAriaLabel: t("buttons.close"),
        // Replace ALL five generated important defaults through the supported
        // API. Do not edit the generated file or start an !important contest.
        classNames: {
          toast: "app-toast",
          title: "app-toast-title",
          description: "app-toast-description",
          actionButton: "app-toast-action",
          cancelButton: "app-toast-cancel",
          closeButton: "app-toast-close",
          content: "app-toast-content",
          icon: "app-toast-icon",
        },
      }}
    />
    </div>
  );
};

export default AppToaster;

/**
 * CaptchaChallenge — hCaptcha/Turnstile integration (ADR-16)
 *
 * Renders conditionally on /signup and /accept-invite when the caller's IP
 * has logged ≥ 3 signup events in the last hour.
 *
 * The captcha token is passed to the Supabase auth call via the `options.captchaToken`
 * field. Supabase natively supports hCaptcha and Turnstile verification.
 *
 * Design: ADR-16
 * Requirements: 2.11
 *
 * @example
 * <CaptchaChallenge onVerify={(token) => setCaptchaToken(token)} />
 */

import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Shield } from "lucide-react";

export interface CaptchaChallengeProps {
  /** Called when the captcha is successfully verified with the token */
  onVerify: (token: string) => void;
  /** Called when the captcha expires */
  onExpire?: () => void;
  /** Called when the captcha encounters an error */
  onError?: (error: Error) => void;
}

// Detect which captcha provider is configured
const CAPTCHA_SITE_KEY = import.meta.env.VITE_CAPTCHA_SITE_KEY as
  | string
  | undefined;
const CAPTCHA_PROVIDER = import.meta.env.VITE_CAPTCHA_PROVIDER as
  | "hcaptcha"
  | "turnstile"
  | undefined;

/**
 * CaptchaChallenge renders an hCaptcha or Cloudflare Turnstile widget.
 *
 * If no VITE_CAPTCHA_SITE_KEY is configured, renders a development-mode
 * bypass button so the form remains usable in local development.
 */
const CaptchaChallenge = ({
  onVerify,
  onExpire,
  onError,
}: CaptchaChallengeProps) => {
  const { t } = useTranslation("common");
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const isDev = !CAPTCHA_SITE_KEY;

  useEffect(() => {
    if (isDev || !CAPTCHA_SITE_KEY) return;

    const provider = CAPTCHA_PROVIDER ?? "hcaptcha";
    // setIsLoaded is stable (React guarantees setState identity is stable)
    const onLoad = () => {
      setIsLoaded(true);
    };

    if (provider === "hcaptcha") {
      // Load hCaptcha script
      const scriptId = "hcaptcha-script";
      if (!document.getElementById(scriptId)) {
        const script = document.createElement("script");
        script.id = scriptId;
        script.src = "https://js.hcaptcha.com/1/api.js";
        script.async = true;
        script.defer = true;
        script.onload = onLoad;
        document.head.appendChild(script);
      } else {
        onLoad();
      }
    } else if (provider === "turnstile") {
      // Load Cloudflare Turnstile script
      const scriptId = "turnstile-script";
      if (!document.getElementById(scriptId)) {
        const script = document.createElement("script");
        script.id = scriptId;
        script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
        script.async = true;
        script.defer = true;
        script.onload = onLoad;
        document.head.appendChild(script);
      } else {
        onLoad();
      }
    }
  }, [isDev]);

  useEffect(() => {
    if (!isLoaded || !CAPTCHA_SITE_KEY || !containerRef.current) return;

    const provider = CAPTCHA_PROVIDER ?? "hcaptcha";
    const container = containerRef.current;

    try {
      if (provider === "hcaptcha" && typeof window.hcaptcha !== "undefined") {
        window.hcaptcha.render(container, {
          sitekey: CAPTCHA_SITE_KEY,
          callback: onVerify,
          "expired-callback": onExpire,
          "error-callback": () => onError?.(new Error("hCaptcha error")),
          theme: "light",
          size: "normal",
        });
      } else if (
        provider === "turnstile" &&
        typeof window.turnstile !== "undefined"
      ) {
        window.turnstile.render(container, {
          sitekey: CAPTCHA_SITE_KEY,
          callback: onVerify,
          "expired-callback": onExpire,
          "error-callback": () => onError?.(new Error("Turnstile error")),
          theme: "light",
          size: "normal",
        });
      }
    } catch (err) {
      onError?.(
        err instanceof Error ? err : new Error("Captcha render failed")
      );
    }
  }, [isLoaded, onVerify, onExpire, onError]);

  // Development bypass — renders a button that simulates captcha verification
  if (isDev) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg border border-amber-200 bg-amber-50">
        <Shield className="h-4 w-4 text-amber-600 shrink-0" />
        <div className="flex-1">
          <p className="text-xs font-medium text-amber-800">
            {t(
              "captcha.devMode",
              "Captcha (dev mode — no VITE_CAPTCHA_SITE_KEY set)"
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onVerify("dev-bypass-token")}
          className="text-xs font-semibold text-amber-700 hover:text-amber-900 underline"
        >
          {t("captcha.bypass", "Bypass")}
        </button>
      </div>
    );
  }

  return (
    <div className="flex justify-center">
      <div ref={containerRef} />
    </div>
  );
};

export default CaptchaChallenge;

// Extend Window type for captcha providers
declare global {
  interface Window {
    hcaptcha?: {
      render: (
        container: HTMLElement,
        options: Record<string, unknown>
      ) => string;
      reset: (widgetId?: string) => void;
      getResponse: (widgetId?: string) => string;
    };
    turnstile?: {
      render: (
        container: HTMLElement,
        options: Record<string, unknown>
      ) => string;
      reset: (widgetId?: string) => void;
      getResponse: (widgetId?: string) => string;
    };
  }
}

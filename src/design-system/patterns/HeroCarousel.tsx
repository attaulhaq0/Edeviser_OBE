import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { AccessibilityPreferencesContext } from "@/providers/AccessibilityPreferencesContext";
import { cn } from "@/lib/utils";

export interface HeroCarouselProps {
  /** Caller-owned slides; the active slide alone is interactive and exposed. */
  slides: React.ReactNode[];
  className?: string;
  style?: React.CSSProperties;
  /** Auto-advance is permitted only at 5 seconds or longer. Defaults to 7s. */
  autoAdvanceMs?: number;
  ariaLabel?: string;
  /** Light presentation for white/glass hero surfaces; dark is retained for legacy callers. */
  theme?: "dark" | "light";
}

/** One controlled, bilingual carousel. Movement is never required to read a slide. */
const HeroCarousel = ({
  slides,
  className,
  style,
  autoAdvanceMs = 7000,
  ariaLabel,
  theme = "dark",
}: HeroCarouselProps) => {
  const { t, i18n } = useTranslation("common");
  const rtl = i18n.dir() === "rtl";
  const owner = useContext(AccessibilityPreferencesContext);
  const osReduction = useReducedMotion();
  const reduceMotion = Boolean(
    osReduction || owner?.controls.effective.reduced_animations
  );
  const isLight = theme === "light";
  const count = slides.length;
  const [cursor, setCursor] = useState({ index: 0, count });
  const [userPaused, setUserPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pageVisible, setPageVisible] = useState(
    () =>
      typeof document === "undefined" || document.visibilityState !== "hidden"
  );
  const [announcement, setAnnouncement] = useState("");
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  // React adjusts current-component state before commit when slide count changes.
  // A stale position must not return after a 2→1→2 data transition.
  if (cursor.count !== count) setCursor({ index: 0, count });
  const current =
    count > 0 && cursor.count === count ? cursor.index % count : 0;
  const multi = count > 1;
  const canAutoAdvance =
    multi &&
    !reduceMotion &&
    Number.isFinite(autoAdvanceMs) &&
    autoAdvanceMs >= 5000;

  const go = useCallback(
    (next: number) => {
      if (count < 2) return;
      const normalized = ((next % count) + count) % count;
      if (
        normalized !== current &&
        slideRefs.current[current]?.contains(document.activeElement)
      ) {
        rootRef.current
          ?.querySelector<HTMLButtonElement>("[data-carousel-next]")
          ?.focus();
      }
      setUserPaused(true); // User interaction never restarts rotation without consent.
      setCursor({ index: normalized, count });
      setAnnouncement(
        t("carousel.slideOf", { current: normalized + 1, total: count })
      );
    },
    [count, current, t]
  );

  useEffect(() => {
    const syncVisibility = () =>
      setPageVisible(document.visibilityState !== "hidden");
    document.addEventListener("visibilitychange", syncVisibility);
    return () =>
      document.removeEventListener("visibilitychange", syncVisibility);
  }, []);

  useEffect(() => {
    if (!canAutoAdvance || userPaused || hovered || focused || !pageVisible)
      return;
    const timer = window.setInterval(
      () =>
        setCursor((value) => ({
          index: ((value.count === count ? value.index : 0) + 1) % count,
          count,
        })),
      autoAdvanceMs
    );
    return () => window.clearInterval(timer);
  }, [
    autoAdvanceMs,
    canAutoAdvance,
    count,
    focused,
    hovered,
    pageVisible,
    userPaused,
  ]);

  const onTouchStart = (event: React.TouchEvent) => {
    const touch = event.touches[0];
    touchStart.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
  };
  const onTouchEnd = (event: React.TouchEvent) => {
    const start = touchStart.current;
    touchStart.current = null;
    const touch = event.changedTouches[0];
    if (!start || !touch) return;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.25) {
      const forward = rtl ? dx > 0 : dx < 0;
      go(current + (forward ? 1 : -1));
    }
  };

  const chrome = isLight
    ? "border border-border bg-card text-foreground hover:bg-muted hover:text-foreground"
    : "border border-white/50 bg-white/15 text-white hover:bg-white/25 hover:text-white";
  const control = cn("h-11 w-11 shrink-0 rounded-full p-0", chrome);

  return (
    <div
      ref={rootRef}
      className={cn("relative min-w-0 overflow-clip", className)}
      style={style}
      role="region"
      aria-roledescription="carousel"
      dir={rtl ? "rtl" : "ltr"}
      aria-label={ariaLabel ?? t("carousel.label")}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null))
          setFocused(false);
      }}
    >
      <div
        className="flex transition-transform duration-[350ms] ease-[cubic-bezier(0.2,0.7,0.2,1)] motion-reduce:transition-none"
        dir={rtl ? "rtl" : "ltr"}
        style={{
          transform: `translateX(${rtl ? "" : "-"}${current * 100}%)`,
          transitionDuration: reduceMotion ? "0ms" : undefined,
          touchAction: "pan-y",
        }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onTouchCancel={() => {
          touchStart.current = null;
        }}
      >
        {slides.map((slide, position) => (
          <div
            key={position}
            className="min-w-0 flex-[0_0_100%]"
            role="group"
            aria-roledescription="slide"
            aria-label={t("carousel.slideOf", {
              current: position + 1,
              total: count,
            })}
            aria-hidden={position !== current}
            ref={(element) => {
              slideRefs.current[position] = element;
              if (element) element.inert = position !== current;
            }}
          >
            {slide}
          </div>
        ))}
      </div>

      {multi && (
        <div
          role="group"
          aria-label={t("carousel.controls")}
          className="flex min-w-0 items-center justify-center gap-1 px-2 py-1.5"
        >
          <Button
            type="button"
            variant="ghost"
            onClick={() => go(current - 1)}
            aria-label={t("carousel.previous")}
            className={control}
          >
            <span aria-hidden="true" className="text-xl">
              {rtl ? "›" : "‹"}
            </span>
          </Button>
          <div
            className="flex min-w-0 flex-1 items-center justify-center gap-0.5 overflow-x-auto"
            aria-label={t("carousel.position")}
          >
            {slides.map((_, position) => (
              <Button
                key={position}
                type="button"
                variant="ghost"
                onClick={() => go(position)}
                aria-label={t("carousel.goTo", { number: position + 1 })}
                aria-current={position === current ? "true" : undefined}
                className={cn(
                  "h-11 min-h-11 w-11 min-w-11 shrink-0 rounded-full p-0",
                  isLight
                    ? "text-foreground hover:bg-muted"
                    : "text-white hover:bg-[var(--hero-inverse-control-hover)] dark:hover:bg-[var(--hero-inverse-control-hover)]"
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "block h-1 rounded-full",
                    position === current ? "w-[22px]" : "w-4",
                    isLight ? "bg-slate-700" : "bg-white"
                  )}
                />
              </Button>
            ))}
          </div>
          <Button
            type="button"
            variant="ghost"
            data-carousel-next
            onClick={() => go(current + 1)}
            aria-label={t("carousel.next")}
            className={control}
          >
            <span aria-hidden="true" className="text-xl">
              {rtl ? "‹" : "›"}
            </span>
          </Button>
          {canAutoAdvance && (
            <Button
              type="button"
              variant="ghost"
              className={control}
              onClick={() => setUserPaused((value) => !value)}
              aria-label={t(userPaused ? "carousel.play" : "carousel.pause")}
              aria-pressed={userPaused}
            >
              <span aria-hidden="true" className="text-base">
                {userPaused ? "▶" : "Ⅱ"}
              </span>
            </Button>
          )}
        </div>
      )}
      <span
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {announcement}
      </span>
    </div>
  );
};

export default HeroCarousel;

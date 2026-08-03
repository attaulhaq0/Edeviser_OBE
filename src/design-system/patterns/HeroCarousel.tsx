// =============================================================================
// HeroCarousel — prototype `.hero-carousel` (shared.css + shared.js
// `initHeroCarousel`). A multi-slide dashboard hero: dots + prev/next arrows +
// touch swipe + auto-advance that pauses on hover/focus, reduced-motion-safe.
//
// Generic + presentational: the caller supplies fully-styled slides and the
// root's look (rounding / gradient background / shadow) via `className`+`style`,
// exactly like the prototype markup where the carousel root carries
// `rounded-2xl text-white shadow-lg` + `background:var(--hero-gradient)`.
//
// Values are reproduced 1:1 from `prototype/shared.css`:
//   .hero-slides transition .35s cubic-bezier(.2,.7,.2,1)
//   .hero-dots button 16x4 radius2 bg rgba(255,255,255,.25); .on -> 22px #fff
//   .hero-arrow 26x26 round bg rgba(255,255,255,.14) border rgba(255,255,255,.2)
//   auto-advance 7000ms (shared.js), swipe threshold 40px
// =============================================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface HeroCarouselProps {
  /** Fully-styled slide nodes. With a single slide, chrome (dots/arrows) is hidden. */
  slides: React.ReactNode[];
  /** Applied to the carousel root — carries the hero look (rounding/bg/shadow). */
  className?: string;
  style?: React.CSSProperties;
  /** Auto-advance interval; matches the prototype's 7s. */
  autoAdvanceMs?: number;
  /** Accessible name for the carousel region. */
  ariaLabel?: string;
}

/**
 * Prototype-faithful hero carousel. Auto-advance is disabled under
 * `prefers-reduced-motion` and while the user is hovering/focused within it.
 */
const HeroCarousel = ({
  slides,
  className,
  style,
  autoAdvanceMs = 7000,
  ariaLabel = "Highlights",
}: HeroCarouselProps) => {
  const { t } = useTranslation("common");
  const count = slides.length;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduceMotion = useReducedMotion();
  const touchStartX = useRef<number | null>(null);

  const current = count > 0 ? index % count : 0;

  const go = useCallback(
    (n: number) => {
      if (count === 0) return;
      setIndex(((n % count) + count) % count);
    },
    [count]
  );

  // Auto-advance (functional update so the interval never needs re-creating on
  // each tick). Pauses on hover/focus and honors reduced-motion.
  useEffect(() => {
    if (count < 2 || paused || reduceMotion) return;
    const id = window.setInterval(
      () => setIndex((i) => (i + 1) % count),
      autoAdvanceMs
    );
    return () => window.clearInterval(id);
  }, [count, paused, reduceMotion, autoAdvanceMs]);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return;
    const dx = (e.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
    if (Math.abs(dx) > 40) go(current + (dx < 0 ? 1 : -1));
    touchStartX.current = null;
  };

  const multi = count > 1;

  return (
    <div
      className={cn("relative overflow-hidden", className)}
      style={style}
      role="region"
      aria-roledescription="carousel"
      aria-label={ariaLabel}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      {multi && (
        <>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={() => go(current - 1)}
            aria-label={t("carousel.previous")}
            className="absolute start-1.5 top-1/2 z-[5] !h-[26px] !w-[26px] -translate-y-1/2 rounded-full border border-white/20 bg-white/[.14] text-xs leading-none text-white hover:bg-white/25 hover:text-white"
          >
            <span aria-hidden="true">&lsaquo;</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={() => go(current + 1)}
            aria-label={t("carousel.next")}
            className="absolute end-1.5 top-1/2 z-[5] !h-[26px] !w-[26px] -translate-y-1/2 rounded-full border border-white/20 bg-white/[.14] text-xs leading-none text-white hover:bg-white/25 hover:text-white"
          >
            <span aria-hidden="true">&rsaquo;</span>
          </Button>
        </>
      )}

      <div
        className="flex transition-transform duration-[350ms] ease-[cubic-bezier(0.2,0.7,0.2,1)] motion-reduce:transition-none"
        style={{ transform: `translateX(-${current * 100}%)` }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* Slides are a stable, caller-ordered list — index identity is correct. */}
        {slides.map((slide, i) => (
          <div
            key={i}
            className="min-w-0 flex-[0_0_100%]"
            role="group"
            aria-roledescription="slide"
            aria-label={t("carousel.slideOf", {
              current: i + 1,
              total: count,
            })}
          >
            {slide}
          </div>
        ))}
      </div>

      {multi && (
        <div className="flex justify-center gap-[5px] pb-2.5 pt-2">
          {slides.map((_, i) => (
            <Button
              key={i}
              type="button"
              variant="ghost"
              onClick={() => go(i)}
              aria-label={t("carousel.goTo", { number: i + 1 })}
              aria-current={i === current}
              className={cn(
                "!h-1 min-h-0 rounded-sm p-0 transition-all duration-150 hover:bg-white/50",
                i === current ? "!w-[22px] bg-white" : "!w-4 bg-white/25"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default HeroCarousel;

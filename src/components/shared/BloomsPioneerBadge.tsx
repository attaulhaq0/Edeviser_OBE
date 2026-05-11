// =============================================================================
// BloomsPioneerBadge — Badge display for Bloom's progression achievements
// Explorer (level 4 - Analyzing), Challenger (level 5 - Evaluating),
// Pioneer (level 6 - Creating)
// =============================================================================

import { Compass, Swords, Crown } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface BloomsPioneerBadgeProps {
  type: "explorer" | "challenger" | "pioneer";
  awarded?: boolean;
  animate?: boolean;
  size?: "sm" | "md" | "lg";
}

interface BadgeConfig {
  label: string;
  bloomLabel: string;
  Icon: typeof Compass;
  bg: string;
  text: string;
  dimBg: string;
  dimText: string;
  ring: string;
}

// ─── Badge config per type ──────────────────────────────────────────────────

const BADGE_CONFIG: Record<BloomsPioneerBadgeProps["type"], BadgeConfig> = {
  explorer: {
    label: "Bloom's Explorer",
    bloomLabel: "Analyzing",
    Icon: Compass,
    bg: "bg-yellow-500",
    text: "text-gray-900",
    dimBg: "bg-yellow-100",
    dimText: "text-yellow-400",
    ring: "ring-yellow-500/30",
  },
  challenger: {
    label: "Bloom's Challenger",
    bloomLabel: "Evaluating",
    Icon: Swords,
    bg: "bg-orange-500",
    text: "text-white",
    dimBg: "bg-orange-100",
    dimText: "text-orange-400",
    ring: "ring-orange-500/30",
  },
  pioneer: {
    label: "Bloom's Pioneer",
    bloomLabel: "Creating",
    Icon: Crown,
    bg: "bg-red-500",
    text: "text-white",
    dimBg: "bg-red-100",
    dimText: "text-red-400",
    ring: "ring-red-500/30",
  },
};

const SIZE_CLASSES = {
  sm: {
    wrapper: "gap-1 p-2",
    icon: "h-4 w-4",
    label: "text-[10px]",
    bloom: "text-[9px]",
  },
  md: {
    wrapper: "gap-1.5 p-3",
    icon: "h-5 w-5",
    label: "text-xs",
    bloom: "text-[10px]",
  },
  lg: {
    wrapper: "gap-2 p-4",
    icon: "h-6 w-6",
    label: "text-sm",
    bloom: "text-xs",
  },
};

// ─── Component ──────────────────────────────────────────────────────────────

export const BloomsPioneerBadge = ({
  type,
  awarded = false,
  animate = false,
  size = "md",
}: BloomsPioneerBadgeProps) => {
  const config = BADGE_CONFIG[type];
  const sizeClasses = SIZE_CLASSES[size];
  const { Icon } = config;

  return (
    <div
      data-testid={`blooms-pioneer-badge-${type}`}
      className={cn(
        "inline-flex flex-col items-center rounded-xl text-center transition-all",
        sizeClasses.wrapper,
        awarded
          ? cn(config.bg, config.text, "ring-2 ring-offset-1", config.ring)
          : cn(config.dimBg, config.dimText, "opacity-40 grayscale"),
        awarded && animate && "animate-badge-pop"
      )}
      role="img"
      aria-label={`${config.label} badge${
        awarded ? " — awarded" : " — not yet earned"
      }`}
    >
      <Icon className={sizeClasses.icon} aria-hidden="true" />
      <span className={cn("font-bold tracking-wide", sizeClasses.label)}>
        {config.label}
      </span>
      <span className={cn("font-medium", sizeClasses.bloom)}>
        {config.bloomLabel}
      </span>
    </div>
  );
};

export default BloomsPioneerBadge;

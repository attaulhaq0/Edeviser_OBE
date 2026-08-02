// =============================================================================
// L2 patterns — prototype design-system component surface.
// Barrel so screens can `import { PageHeader, SectionCard, KPICard, ... } from
// "@/design-system/patterns"`. A `.ts` barrel (not a component module), so
// react-refresh does not apply — safe to re-export components + types together.
// =============================================================================

export { default as PageHeader } from "./PageHeader";
export type { PageHeaderProps } from "./PageHeader";

export { default as PCard } from "./PCard";
export type { PCardProps } from "./PCard";

export { default as SectionHeader } from "./SectionHeader";
export type { SectionHeaderProps } from "./SectionHeader";

export { default as SectionCard } from "./SectionCard";
export type { SectionCardProps } from "./SectionCard";

export { default as KPICard } from "./KPICard";
export type { KPICardProps } from "./KPICard";

export { default as HeroCard } from "./HeroCard";
export type { HeroCardProps } from "./HeroCard";

export { default as HeroCarousel } from "./HeroCarousel";
export type { HeroCarouselProps } from "./HeroCarousel";

export { RailCard, RailHead, RailRow } from "./Rail";
export type { RailCardProps, RailHeadProps, RailRowProps } from "./Rail";

export { default as StatusDot } from "./StatusDot";
export type { DotTone, StatusDotProps } from "./StatusDot";

export { default as StatePanel } from "./StatePanel";
export type { StatePanelProps } from "./StatePanel";

export { default as Shimmer } from "./Shimmer";
export type { ShimmerProps } from "./Shimmer";

// Internalized patterns (PARITY.md §A) — the design system OWNS these now; the
// legacy `@/components/shared/*` files are thin re-export shims that point here
// (deleted at P5 once no legacy screen imports them directly).
export { default as MasteryRing } from "./MasteryRing";
export type { MasteryRingProps } from "./MasteryRing";
export { default as WelcomeHero } from "./WelcomeHero";
export type { WelcomeHeroProps } from "./WelcomeHero";
export { SeverityIcon } from "./SeverityIcon";
export type { SeverityIconProps } from "./SeverityIcon";
export { default as GradientCardHeader } from "./GradientCardHeader";
export type { GradientCardHeaderProps } from "./GradientCardHeader";

export { default as EMeter } from "./EMeter";
export {
  clampPercent,
  emeterFillBackground,
  EMETER_FILL,
  type EMeterVariant,
  type EMeterProps,
} from "./EMeter";

export {
  AdminCardHeader,
  AdminFilterPill,
  AdminSectionHeader,
  AdminStatCard,
  AdminStatusPill,
  adminCardClass,
  adminPageClass,
  adminTableClass,
} from "./AdminPrimitives";

// =============================================================================
// useBadgeSpotlight — Weekly badge spotlight query
// Task 20.11 — Re-exports from useTieredBadges
// =============================================================================

export {
  useBadgeSpotlight as useBadgeSpotlightQuery,
  useBadgeSpotlightSchedule,
  useUpdateBadgeSpotlightSchedule,
} from "@/hooks/useTieredBadges";

export type {
  SpotlightData,
  SpotlightScheduleEntry,
} from "@/hooks/useTieredBadges";

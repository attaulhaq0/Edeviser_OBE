// Feature: Production & Delivery Safety (Wave D review hardening).
// Canonical AI surface gate — delegates to capability-level resolution.
//
// Policy (ULTIMATE LIVE CERTIFICATION P1-6 fix):
//   1. VITE_AI_FEATURE_ENABLED="false" → Master kill-switch (overrides all)
//   2. Otherwise → delegate to isAnyAgenticEnabled() which checks
//      VITE_AI_ENVIRONMENT → per-capability gates
//
// This eliminates the conflicting gate architecture where:
//   - isAiSurfaceEnabled() (global binary) controlled dashboards
//   - isCapabilityEnabled() (per-capability) was unused by dashboards
//
// Now: Environment → Capability → Role → Permission → Availability
//
// `.env.example` ships VITE_AI_FEATURE_ENABLED=false and
// VITE_AI_ENVIRONMENT defaults to AI_DISABLED: the assistant surface,
// governance card, and every dashboard AI mount render ONLY when the
// deployment explicitly opts in. Nothing here is an authorization boundary;
// the server re-checks role/institution on every channel regardless.
import { isAnyAgenticEnabled } from "@/lib/aiFeatureFlags";

export const isAiSurfaceEnabled = (): boolean => {
  // Master kill-switch: explicitly "false" disables all AI surfaces
  if (import.meta.env.VITE_AI_FEATURE_ENABLED === "false") return false;
  // Otherwise delegate to capability-level resolution
  return isAnyAgenticEnabled();
};

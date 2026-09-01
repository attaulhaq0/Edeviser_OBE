// Feature: Production & Delivery Safety (Wave D review hardening).
// Single source of truth for the experimental AI surface flag.
//
// `.env.example` ships VITE_AI_FEATURE_ENABLED=false: the assistant surface,
// governance card, and every dashboard AI mount render ONLY when the
// deployment explicitly opts in — mirroring the RoleAppShell gate for the
// legacy intelligence panel. Nothing here is an authorization boundary; the
// server re-checks role/institution on every channel regardless.
export const isAiSurfaceEnabled = (): boolean =>
  import.meta.env.VITE_AI_FEATURE_ENABLED === "true";

// Hawdex Gamification — HexBadge, Tiers, CLAY 3D icons
import { type ReactNode } from "react";

export type BadgeTier = "bronze" | "silver" | "gold" | "platinum";

export const TIER_COLORS: Record<BadgeTier, { outer: string; inner: string; text: string }> = {
  bronze:   { outer: "#C97C3A", inner: "#E8A87C", text: "#7C3A00" },
  silver:   { outer: "#7B93BD", inner: "#B0C4DE", text: "#2C4A7C" },
  gold:     { outer: "#D4A017", inner: "#FFD966", text: "#7C5200" },
  platinum: { outer: "#6366F1", inner: "#A5B4FC", text: "#312E81" },
};

// ── CLAY 3D SVG Icons (inline, no external deps) ──────────────────────────
export const CLAY: Record<string, ReactNode> = {
  flame: (
    <svg viewBox="0 0 64 64" fill="none"><defs><radialGradient id="cl-f-glow" cx="50%" cy="85%" r="50%"><stop offset="0%" stopColor="#FF5500" stopOpacity="0.5"/><stop offset="100%" stopColor="#FF5500" stopOpacity="0"/></radialGradient><linearGradient id="cl-f-body" x1="32" y1="8" x2="32" y2="58"><stop offset="0%" stopColor="#FFD166"/><stop offset="38%" stopColor="#FF6B35"/><stop offset="100%" stopColor="#9E0000"/></linearGradient></defs><path d="M32 8C32 8 45 21 42 31 49 22 47 11 40 7 40 7 54 23 49 39 53 30 55 17 48 9 55 28 51 50 32 57 13 50 9 28 16 9 9 17 11 30 15 39 10 23 24 7 24 7 17 11 19 22 26 31 23 21 32 8 32 8Z" fill="url(#cl-f-body)"/></svg>
  ),
  target: (
    <svg viewBox="0 0 64 64" fill="none"><defs><radialGradient id="cl-t-outer" cx="38%" cy="30%" r="70%"><stop offset="0%" stopColor="#3A86FF"/><stop offset="60%" stopColor="#1A3B8C"/><stop offset="100%" stopColor="#0A1F5C"/></radialGradient></defs><circle cx="32" cy="29" r="25" fill="url(#cl-t-outer)"/><circle cx="32" cy="29" r="18" fill="white" opacity="0.15"/><circle cx="32" cy="29" r="11" fill="url(#cl-t-outer)"/><circle cx="32" cy="29" r="5.5" fill="#E63946"/></svg>
  ),
  lightning: (
    <svg viewBox="0 0 64 64" fill="none"><defs><linearGradient id="cl-l-body" x1="26" y1="6" x2="38" y2="58"><stop offset="0%" stopColor="#FFE566"/><stop offset="100%" stopColor="#AA7000"/></linearGradient></defs><path d="M41 5 L22 34 L31 34 L23 59 L45 26 L35 26 Z" fill="url(#cl-l-body)"/></svg>
  ),
  trophy: (
    <svg viewBox="0 0 64 64" fill="none"><defs><linearGradient id="cl-tr-cup" x1="20" y1="8" x2="44" y2="44"><stop offset="0%" stopColor="#FFE599"/><stop offset="100%" stopColor="#8B6000"/></linearGradient></defs><path d="M16 8 h32 v22 a16 16 0 0 1 -32 0 Z" fill="url(#cl-tr-cup)"/><rect x="24" y="46" width="16" height="8" rx="2" fill="url(#cl-tr-cup)"/><rect x="20" y="52" width="24" height="5" rx="2.5" fill="url(#cl-tr-cup)"/></svg>
  ),
};

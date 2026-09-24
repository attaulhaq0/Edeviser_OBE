// Hawdex Primitives — extracted from the Hawdex design system
// Uses var(--t-*) tokens mapped through theme-map.ts
import { type ReactNode } from "react";

// ── AccentDot — replaces gradient top bars on cards ────────────────────────
export const AccentDot = ({ color }: { color?: string }) => (
  <div style={{
    width: 7, height: 7, borderRadius: 3, flexShrink: 0, marginBottom: 12,
    background: color || "var(--t-dot)",
  }} />
);

// ── IconBox — icon containers with semantic backgrounds ────────────────────
export const IconBox = ({
  icon, size = 32, variant = "primary",
}: {
  icon: ReactNode; size?: number;
  variant?: "primary" | "ai" | "teal" | "success" | "warning" | "error";
}) => {
  const v: Record<string, Record<string, string>> = {
    primary: { background: "var(--t-icon-bg)",    color: "var(--t-icon-c)" },
    ai:      { background: "var(--t-icon-ai-bg)", color: "var(--t-icon-ai-c)" },
    teal:    { background: "var(--t-icon-tl-bg)", color: "var(--t-icon-tl-c)" },
    success: { background: "#ECFDF5",              color: "#059669" },
    warning: { background: "#FFFBEB",              color: "#D97706" },
    error:   { background: "#FEF2F2",              color: "#DC2626" },
  };
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.28, flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      ...v[variant],
    }}>
      {icon}
    </div>
  );
};

// ── Logo — Edeviser brand mark SVG ─────────────────────────────────────────
export const Logo = ({ size = 40 }: { size?: number }) => (
  <svg width={size} height={size * 0.515} viewBox="0 0 72 37" fill="none">
    <defs>
      <linearGradient id="hawdex-lg1" x1="0" y1="0" x2="72" y2="37" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#0382BD" />
        <stop offset="100%" stopColor="#09B99C" />
      </linearGradient>
    </defs>
    <rect width="72" height="37" rx="18.5" fill="url(#hawdex-lg1)" />
    <rect x="8" y="10" width="56" height="17" rx="8.5" fill="white" />
    <rect x="12" y="14" width="10" height="9" rx="1" fill="url(#hawdex-lg1)" />
    <polygon points="22,18.5 26,16 26,21" fill="url(#hawdex-lg1)" />
    <rect x="36" y="14" width="1.5" height="9" rx="0.75" fill="url(#hawdex-lg1)" />
    <rect x="40" y="14" width="12" height="9" rx="2" fill="none" stroke="url(#hawdex-lg1)" strokeWidth="1.5" />
  </svg>
);

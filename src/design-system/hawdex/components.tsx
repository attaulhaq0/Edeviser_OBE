import { type ReactNode } from "react";
import { cx } from "./primitives";

// ── Badge — 8 variants with optional dot ───────────────────────────────────
export const HBadge = ({
  variant = "neutral", dot, children, className, style,
}: {
  variant?: "primary" | "secondary" | "success" | "warning" | "error" | "neutral" | "outline" | "info";
  dot?: boolean; children: ReactNode; className?: string; style?: React.CSSProperties;
}) => {
  const s: Record<string, React.CSSProperties> = {
    primary:   { background: "#EFF8FF", color: "#0382BD", border: "1px solid rgba(3,130,189,0.14)" },
    secondary: { background: "#EFFEFB", color: "#0D7A76", border: "1px solid rgba(13,122,118,0.14)" },
    success:   { background: "#ECFDF5", color: "#065F46", border: "1px solid rgba(16,185,129,0.18)" },
    warning:   { background: "#FFFBEB", color: "#92400E", border: "1px solid rgba(245,158,11,0.20)" },
    error:     { background: "#FEF2F2", color: "#991B1B", border: "1px solid rgba(229,62,62,0.18)" },
    neutral:   { background: "#F1F5F9", color: "#475569", border: "1px solid rgba(71,85,105,0.12)" },
    outline:   { background: "transparent", color: "#64748B", border: "1px solid #CBD5E1" },
    info:      { background: "#EFF6FF", color: "#1E40AF", border: "1px solid rgba(59,130,246,0.18)" },
  };
  return <span className={cx("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium", className)} style={{...s[variant], ...style}}>
    {dot && <span className="w-1.5 h-1.5 rounded-full" style={{background:"currentColor"}} />}{children}
  </span>;
};
// ── Avatar ─────────────────────────────────────────────────────────────────
export const HAvatar = ({
  initials, size = "md", className,
}: {
  initials: string; size?: "xs" | "sm" | "md" | "lg"; className?: string;
}) => {
  const sz: Record<string, string> = {
    xs: "w-6 h-6 text-[10px]", sm: "w-7 h-7 text-xs",
    md: "w-9 h-9 text-sm", lg: "w-11 h-11 text-base",
  };
  return <div className={cx("rounded-full flex items-center justify-center font-semibold flex-shrink-0", sz[size], className)}
    style={{ background: "var(--primary-50)", color: "var(--primary)" }}>{initials}</div>;
};

// ── Button — 7 variants × 4 sizes, glass highlight on filled ──────────────
export const HButton = ({
  variant = "primary", size = "md", disabled, icon, children, className, onClick, type = "button",
}: {
  variant?: "primary" | "secondary" | "tertiary" | "ghost" | "outlined" | "destructive" | "teal";
  size?: "xs" | "sm" | "md" | "lg"; disabled?: boolean;
  icon?: ReactNode; children?: ReactNode; className?: string;
  onClick?: () => void; type?: "button" | "submit";
}) => {
  const pad: Record<string, string> = { xs: "px-2.5 py-1 text-xs gap-1", sm: "px-3 py-1.5 text-xs gap-1.5", md: "px-4 py-2 text-sm gap-2", lg: "px-5 py-2.5 text-sm gap-2" };
  const v: Record<string, React.CSSProperties> = {
    primary:     { background: "var(--primary)", color: "#fff", boxShadow: "0 1px 2px rgba(3,130,189,0.30), inset 0 1px 0 rgba(255,255,255,0.15)" },
    secondary:   { background: "var(--card)", color: "var(--primary)", borderWidth: "1.5px", borderColor: "var(--primary)" },
    tertiary:    { background: "var(--muted)", color: "var(--foreground)", borderColor: "transparent" },
    ghost:       { background: "transparent", color: "var(--muted-foreground)" },
    outlined:    { background: "var(--card)", color: "var(--foreground)", borderColor: "var(--border)" },
    destructive: { background: "#E53E3E", color: "#fff", boxShadow: "0 1px 2px rgba(229,62,62,0.28), inset 0 1px 0 rgba(255,255,255,0.14)" },
    teal:        { background: "var(--secondary)", color: "#fff", boxShadow: "0 1px 2px rgba(90,185,180,0.28), inset 0 1px 0 rgba(255,255,255,0.14)" },
  };
  const isFilled = variant === "primary" || variant === "destructive" || variant === "teal";
  const style = v[variant]!;
  return <button type={type} disabled={disabled} onClick={onClick}
    className={cx("inline-flex items-center select-none font-medium rounded-lg relative overflow-hidden whitespace-nowrap transition-all duration-[120ms]", pad[size], disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer hover:brightness-[1.05] active:scale-[0.98]", className)}
    style={{ fontFamily: "inherit", borderWidth: "1px", borderStyle: "solid", background: style.background, color: style.color, boxShadow: style.boxShadow, borderColor: (style as Record<string,unknown>).borderColor as string || "transparent" }}>
    {isFilled && <span style={{ position: "absolute", top: 0, left: 0, right: 0, height: "50%", background: "linear-gradient(180deg,rgba(255,255,255,0.12) 0%,transparent 100%)", pointerEvents: "none", borderRadius: "inherit" }} />}
    {icon}{children}
  </button>;
};

// ── Card — glass border + theme-aware shadow ───────────────────────────────
export const HCard = ({ children, className, style }: { children: ReactNode; className?: string; style?: React.CSSProperties }) => (
  <div className={cx("rounded-2xl", className)} style={{ background: "var(--card)", boxShadow: "var(--depth-2)", ...style }}>{children}</div>
);

// ── ProgressRing — SVG circular progress ───────────────────────────────────
export const ProgressRing = ({ value, size = 56, color, className }: { value: number; size?: number; color?: string; className?: string }) => {
  const sw = size * 0.12; const r = (size - sw) / 2; const c = 2 * Math.PI * r;
  return <div className={cx("relative flex items-center justify-center", className)} style={{ width: size, height: size }}>
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--muted)" strokeWidth={sw} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color || "var(--primary)"} strokeWidth={sw} strokeDasharray={`${c * (value / 100)} ${c}`} strokeLinecap="round" />
    </svg>
    <span className="absolute text-xs font-bold" style={{ color: "var(--foreground)" }}>{value}%</span>
  </div>;
};
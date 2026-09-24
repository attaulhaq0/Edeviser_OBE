import { type BadgeTier, TIER_COLORS } from "@/design-system/hawdex/gamification-data";

export const HexBadge = ({
  emoji: _emoji, icon: _icon, tier = "gold", xp, name, desc, locked, progress, total,
}: {
  emoji?: string; icon?: string; tier?: BadgeTier;
  xp: number; name: string; desc: string;
  locked?: boolean; progress?: number; total?: number;
}) => {
  const tc = TIER_COLORS[tier];
  const pts = "50,4 93,27 93,73 50,96 7,73 7,27";
  const uid = name.replace(/\s/g, "-");
  const pct = progress !== undefined && total ? (progress / total) * 100 : 100;
  return (
    <div className="flex flex-col items-center gap-2 p-3 rounded-2xl border glass cursor-pointer"
      style={{ background: "var(--card)", borderColor: locked ? "var(--border)" : `${tc.outer}40`, minWidth: 100, backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" }}>
      <div className="relative">
        <svg width={68} height={76} viewBox="0 0 100 100">
          <defs>
            <linearGradient id={`hg-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={locked ? "#CBD5E1" : tc.inner} />
              <stop offset="100%" stopColor={locked ? "#94A3B8" : tc.outer} />
            </linearGradient>
            <filter id={`hg-shadow-${uid}`}>
              <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor={locked ? "#00000040" : `${tc.outer}60`} />
            </filter>
          </defs>
          <polygon points={pts} fill={`url(#hg-${uid})`} stroke={locked ? "#94A3B8" : tc.outer} strokeWidth="1.5" opacity={locked ? 0.5 : 1} filter={`url(#hg-shadow-${uid})`} />
        </svg>
        {!locked && (
          <div className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-black"
            style={{ background: tc.outer, color: "#fff", boxShadow: `0 2px 8px ${tc.outer}60` }}>+{xp}</div>
        )}
      </div>
      <p className="text-[11px] font-bold text-center leading-tight" style={{ color: locked ? "var(--muted-foreground)" : "var(--foreground)" }}>{name}</p>
      <p className="text-[9px] text-center leading-tight" style={{ color: "var(--muted-foreground)" }}>{desc}</p>
      {!locked && progress !== undefined && total && (
        <div className="w-full">
          <div className="h-1 rounded-full overflow-hidden" style={{ background: "var(--muted)" }}>
            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: tc.outer }} />
          </div>
          <p className="text-[8px] text-center mt-0.5 tabular-nums" style={{ color: "var(--muted-foreground)" }}>{progress}/{total}</p>
        </div>
      )}
      <span className="text-[8px] font-black tracking-widest uppercase" style={{ color: locked ? "var(--muted-foreground)" : tc.outer }}>
        {locked ? "LOCKED" : progress === undefined ? "UNLOCKED!" : `${Math.round(pct)}%`}
      </span>
    </div>
  );
};

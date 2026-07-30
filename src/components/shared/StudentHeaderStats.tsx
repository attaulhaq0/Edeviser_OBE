import { useAuth } from "@/hooks/useAuth";
import { useStreak } from "@/hooks/useStreak";
import { useXPBalance } from "@/hooks/useXPBalance";

/** Prototype `.top-stats` treatment for students — 🔥 streak (orange) + 💎 gems (amber). */
const StudentHeaderStats = () => {
  const { user } = useAuth();
  const streak = useStreak();
  const xp = useXPBalance(user?.id ?? "");

  if (!user) return null;

  return (
    <div className="top-stats" aria-label="Student progress">
      <span className="stat-chip" style={{ color: "#ea580c" }}>
        <span aria-hidden="true" style={{ fontSize: "14px", lineHeight: 1 }}>
          🔥
        </span>
        {streak.data?.streak_count ?? 0}
      </span>
      <span className="stat-chip" style={{ color: "#d97706" }}>
        <span aria-hidden="true" style={{ fontSize: "14px", lineHeight: 1 }}>
          💎
        </span>
        {(xp.data?.balance ?? 0).toLocaleString()}
      </span>
    </div>
  );
};

export default StudentHeaderStats;

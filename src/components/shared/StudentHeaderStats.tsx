import { Flame, Gem } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useStreak } from "@/hooks/useStreak";
import { useXPBalance } from "@/hooks/useXPBalance";

/** Prototype `.top-stats` treatment, bound only to the student's existing data. */
const StudentHeaderStats = () => {
  const { user } = useAuth();
  const streak = useStreak();
  const xp = useXPBalance(user?.id ?? "");

  if (!user) return null;

  return (
    <div className="top-stats" aria-label="Student progress">
      <span className="stat-chip">
        <Flame className="size-3.5 text-muted-foreground" aria-hidden="true" />
        {streak.data?.streak_count ?? 0}
      </span>
      <span className="stat-chip">
        <Gem className="size-3.5 text-muted-foreground" aria-hidden="true" />
        {(xp.data?.balance ?? 0).toLocaleString()}
      </span>
    </div>
  );
};

export default StudentHeaderStats;

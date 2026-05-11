// =============================================================================
// TeamCard — Compact team display with gradient header
// Task 4.1: name, XP, streak, member count, health score badge
// =============================================================================

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Users, Flame, Trophy, Zap } from "lucide-react";
import TeamHealthBadge from "@/components/shared/TeamHealthBadge";

export interface TeamCardProps {
  name: string;
  avatarLetter?: string;
  xpTotal: number;
  streakCount: number;
  memberCount: number;
  healthScore: number;
  cooperationScore?: number;
  className?: string;
  onClick?: () => void;
}

const TeamCard = ({
  name,
  avatarLetter,
  xpTotal,
  streakCount,
  memberCount,
  healthScore,
  cooperationScore,
  className,
  onClick,
}: TeamCardProps) => (
  <Card
    className={cn(
      "bg-white border-0 shadow-md rounded-xl overflow-hidden",
      onClick && "cursor-pointer hover:shadow-lg transition-shadow",
      className
    )}
    onClick={onClick}
    role={onClick ? "button" : undefined}
    tabIndex={onClick ? 0 : undefined}
    onKeyDown={
      onClick
        ? (e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onClick();
            }
          }
        : undefined
    }
  >
    {/* Gradient Header */}
    <div
      className="px-4 py-3 flex items-center gap-3"
      style={{
        background: "linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)",
      }}
    >
      <div className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold text-white shrink-0">
        {avatarLetter ?? name.charAt(0).toUpperCase()}
      </div>
      <h3 className="text-sm font-bold text-white truncate">{name}</h3>
      <div className="ms-auto">
        <TeamHealthBadge score={healthScore} size="sm" />
      </div>
    </div>

    {/* Body */}
    <div className="p-4">
      <div className="grid grid-cols-2 gap-3">
        {/* XP */}
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-50">
            <Zap className="h-4 w-4 text-amber-500" />
          </div>
          <div>
            <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">
              Team XP
            </p>
            <p className="text-lg font-black">{xpTotal.toLocaleString()}</p>
          </div>
        </div>

        {/* Streak */}
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-orange-50">
            <Flame className="h-4 w-4 text-orange-500 animate-streak-flame" />
          </div>
          <div>
            <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">
              Streak
            </p>
            <p className="text-lg font-black bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">
              {streakCount}
            </p>
          </div>
        </div>

        {/* Members */}
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-50">
            <Users className="h-4 w-4 text-blue-500" />
          </div>
          <div>
            <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">
              Members
            </p>
            <p className="text-lg font-black">{memberCount}</p>
          </div>
        </div>

        {/* Cooperation Score */}
        {cooperationScore !== undefined && (
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-green-50">
              <Trophy className="h-4 w-4 text-green-500" />
            </div>
            <div>
              <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">
                Co-op
              </p>
              <p className="text-lg font-black">{cooperationScore}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  </Card>
);

export default TeamCard;

// =============================================================================
// AnnouncementCard — Announcement display card
// =============================================================================

import { Megaphone } from "lucide-react";
import { cn } from "@/lib/utils";

interface AnnouncementCardProps {
  title: string;
  content: string;
  authorName: string;
  createdAt: string;
  priority?: "normal" | "high";
  className?: string;
}

const AnnouncementCard = ({
  title,
  content,
  authorName,
  createdAt,
  priority = "normal",
  className,
}: AnnouncementCardProps) => (
  <div
    className={cn(
      "rounded-xl border bg-white p-4 space-y-2",
      priority === "high"
        ? "border-amber-200 bg-amber-50/30"
        : "border-slate-200",
      className
    )}
  >
    <div className="flex items-start gap-2">
      <Megaphone
        className={cn(
          "h-4 w-4 mt-0.5 shrink-0",
          priority === "high" ? "text-amber-500" : "text-gray-400"
        )}
      />
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-bold">{title}</h4>
        <p className="text-sm text-gray-600 mt-1 line-clamp-3">{content}</p>
      </div>
    </div>
    <div className="flex items-center gap-2 text-xs text-gray-400">
      <span>{authorName}</span>
      <span>·</span>
      <span>{createdAt}</span>
    </div>
  </div>
);

export default AnnouncementCard;
export type { AnnouncementCardProps };

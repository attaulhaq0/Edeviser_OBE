// =============================================================================
// DiscussionThreadCard — Discussion forum thread card
// =============================================================================

import { MessageSquare, Pin } from "lucide-react";
import { cn } from "@/lib/utils";

interface DiscussionThreadCardProps {
  title: string;
  authorName: string;
  createdAt: string;
  replyCount: number;
  isPinned?: boolean;
  isResolved?: boolean;
  onClick?: () => void;
  className?: string;
}

const DiscussionThreadCard = ({
  title,
  authorName,
  createdAt,
  replyCount,
  isPinned = false,
  isResolved = false,
  onClick,
  className,
}: DiscussionThreadCardProps) => (
  <div
    className={cn(
      "rounded-xl border border-slate-200 bg-white p-4 hover:shadow-sm transition-shadow cursor-pointer",
      isPinned && "border-blue-200 bg-blue-50/30",
      className
    )}
    onClick={onClick}
    role="button"
    tabIndex={0}
    onKeyDown={(e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onClick?.();
      }
    }}
  >
    <div className="flex items-start gap-2">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {isPinned && <Pin className="h-3 w-3 text-blue-500 shrink-0" />}
          <h4 className="text-sm font-bold truncate">{title}</h4>
          {isResolved && (
            <span className="text-[10px] font-bold tracking-widest uppercase text-green-600 bg-green-50 px-1.5 py-0.5 rounded shrink-0">
              Resolved
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
          <span>{authorName}</span>
          <span>·</span>
          <span>{createdAt}</span>
        </div>
      </div>
      <div className="flex items-center gap-1 text-xs text-gray-400 shrink-0">
        <MessageSquare className="h-3.5 w-3.5" />
        <span>{replyCount}</span>
      </div>
    </div>
  </div>
);

export default DiscussionThreadCard;
export type { DiscussionThreadCardProps };

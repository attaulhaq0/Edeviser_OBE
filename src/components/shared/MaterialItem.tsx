// =============================================================================
// MaterialItem — Course material list item
// =============================================================================

import { FileText, Link as LinkIcon, Video, File } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type MaterialType = "file" | "link" | "video" | "text";

interface MaterialItemProps {
  title: string;
  type: MaterialType;
  url?: string;
  onClick?: () => void;
  className?: string;
}

const TYPE_ICONS: Record<MaterialType, LucideIcon> = {
  file: FileText,
  link: LinkIcon,
  video: Video,
  text: File,
};

const TYPE_COLORS: Record<MaterialType, string> = {
  file: "bg-blue-50 text-blue-600",
  link: "bg-green-50 text-green-600",
  video: "bg-purple-50 text-purple-600",
  text: "bg-gray-50 text-gray-600",
};

const MaterialItem = ({
  title,
  type,
  url,
  onClick,
  className,
}: MaterialItemProps) => {
  const Icon = TYPE_ICONS[type];
  const color = TYPE_COLORS[type];

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-slate-50 transition-colors cursor-pointer",
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
      <div className={cn("p-1.5 rounded-lg", color)}>
        <Icon className="h-4 w-4" />
      </div>
      <span className="text-sm font-medium flex-1 truncate">{title}</span>
      {url && <span className="text-xs text-gray-400 shrink-0">{type}</span>}
    </div>
  );
};

export default MaterialItem;
export type { MaterialItemProps, MaterialType };

import * as React from "react";
import { cn } from "@/lib/utils";

export interface ParentSectionIconProps {
  children?: React.ReactNode;
  emoji?: string;
  className?: string;
}

/**
 * Reusable prototype section icon tile (.sec-h .chip in shared.css).
 * Neumorphic soft-extrude 30x30 tile:
 * white/light surface, thin border, subtle extrude shadow.
 */
export const ParentSectionIcon: React.FC<ParentSectionIconProps> = ({
  children,
  emoji,
  className,
}) => {
  return (
    <span
      className={cn(
        "flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[10px] text-[16px] leading-none text-slate-800 shadow-[0_2px_5px_rgba(15,23,42,0.10),inset_0_1px_0_rgba(255,255,255,0.9)] border border-slate-200 bg-gradient-to-b from-white to-slate-100 dark:border-slate-800 dark:from-slate-900 dark:to-slate-950 dark:text-slate-200 dark:shadow-none",
        className
      )}
    >
      {emoji ?? children}
    </span>
  );
};

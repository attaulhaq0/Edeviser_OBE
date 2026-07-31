import * as React from "react";
import { cn } from "@/lib/utils";

export interface ParentButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "compactIcon";
  size?: "sm" | "md" | "lg";
}

/**
 * Reusable Parent button system matching prototype CSS:
 * On parent surfaces, buttons use flat brand blue (#0382bd) for primary actions,
 * soft blue (#eff6ff) for secondary, ghost (#f8fafc + border) for quiet actions,
 * and soft red (#fef2f2) for destructive actions.
 */
export const ParentButton = React.forwardRef<
  HTMLButtonElement,
  ParentButtonProps
>(
  (
    { className, variant = "primary", size = "md", children, ...props },
    ref
  ) => {
    const baseClasses =
      "inline-flex items-center justify-center gap-1.5 font-extrabold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 disabled:pointer-events-none disabled:opacity-50";

    const variantClasses = {
      primary:
        "bg-[#0382bd] text-white shadow-xs hover:bg-[#026fa3] active:bg-[#025c88]",
      secondary:
        "bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900",
      ghost:
        "bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800",
      danger:
        "bg-red-50 text-red-700 border border-red-100 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900",
      compactIcon:
        "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800 p-1.5 rounded-lg",
    };

    const sizeClasses = {
      sm: "h-8 px-3 text-xs rounded-xl",
      md: "h-9 px-4 text-xs rounded-xl",
      lg: "h-11 px-5 text-sm rounded-xl",
    };

    return (
      <button
        ref={ref}
        className={cn(
          baseClasses,
          variantClasses[variant],
          variant !== "compactIcon" && sizeClasses[size],
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

ParentButton.displayName = "ParentButton";

// =============================================================================
// StatePanel — loading / empty / error states (design system)
// =============================================================================
// A single primitive for the three common async states. Loading is a
// reduced-motion-safe shimmer block; empty/error render inside a card surface.
// =============================================================================

import { cn } from "@/lib/utils";

export interface StatePanelProps {
  variant: "loading" | "empty" | "error";
  /** Message for empty/error variants. */
  message?: string;
  className?: string;
}

const StatePanel = ({ variant, message, className }: StatePanelProps) => {
  if (variant === "loading") {
    return (
      <div
        aria-hidden="true"
        className={cn(
          "h-40 animate-pulse rounded-xl bg-slate-100 motion-reduce:animate-none",
          className
        )}
      />
    );
  }

  if (variant === "error") {
    return (
      <div
        className={cn(
          "rounded-xl border-0 bg-white p-6 shadow-md",
          className
        )}
      >
        <p className="text-sm text-red-600" role="alert">
          {message ?? "Something went wrong. Please try again."}
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn("rounded-xl border-0 bg-white p-6 shadow-md", className)}
    >
      <p className="text-sm text-gray-500">{message ?? "Nothing here yet."}</p>
    </div>
  );
};

export default StatePanel;

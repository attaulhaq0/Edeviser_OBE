import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

export interface EdvToggleProps
  extends React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root> {
  noTick?: boolean;
}

/**
 * Reusable prototype-exact toggle (.edv-toggle in shared.css).
 * ON: Brand gradient / Teal track, knob moved right, visible white checkmark (✓).
 * OFF: Muted gray track, knob left, no checkmark.
 */
export const EdvToggle = React.forwardRef<
  React.ComponentRef<typeof SwitchPrimitives.Root>,
  EdvToggleProps
>(({ className, noTick = false, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer relative inline-flex h-[26px] w-[44px] shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-teal-500 data-[state=unchecked]:bg-slate-300 dark:data-[state=unchecked]:bg-slate-700",
      className
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none relative flex h-[20px] w-[20px] items-center justify-center rounded-full bg-white shadow-md ring-0 transition-transform data-[state=checked]:translate-x-[21px] data-[state=unchecked]:translate-x-[3px]"
      )}
    >
      {!noTick && (
        <span className="text-[11px] font-black text-teal-600 opacity-0 transition-opacity data-[state=checked]:opacity-100">
          ✓
        </span>
      )}
    </SwitchPrimitives.Thumb>
  </SwitchPrimitives.Root>
));

EdvToggle.displayName = "EdvToggle";

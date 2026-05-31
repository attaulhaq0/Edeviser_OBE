// =============================================================================
// PasswordInput — Shadcn Input with an accessible show/hide visibility toggle
// =============================================================================
//
// Renders a password field with a trailing eye toggle that reveals or masks the
// entered characters (Requirements 5.1–5.4). The toggle:
//   - swaps the input `type` between "password" (masked) and "text" (plain),
//   - exposes an `aria-label` that reflects the action it will perform next
//     ("Show password" while masked, "Hide password" while revealed),
//   - meets the 44px minimum mobile touch target.
//
// When more than one password field shares a form, wrap them in a
// `PasswordVisibilityGroup` and pass a `groupId`; the group enforces that at
// most one field is revealed at a time via the pure `passwordVisibility`
// reducer (Requirement 5.5). Outside a group, each field manages its own
// independent visibility.
//
// This is a presentational component only — no Supabase access. It is a drop-in
// replacement for a Shadcn `Input type="password"` and forwards its ref to the
// underlying input so it composes with React Hook Form's `register`/`field`.
//
// _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { usePasswordVisibilityGroup } from "@/components/shared/PasswordVisibilityGroup";

export interface PasswordInputProps
  extends Omit<React.ComponentProps<typeof Input>, "type"> {
  /**
   * Stable identifier used for mutual-exclusion coordination when the field is
   * rendered inside a `PasswordVisibilityGroup`. Omit it for standalone fields
   * (e.g. the single password field on the login form); a unique fallback id is
   * generated automatically so group membership is opt-in.
   */
  groupId?: string;
}

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, groupId, ...props }, ref) => {
    const { t } = useTranslation("auth");
    const group = usePasswordVisibilityGroup();

    // A generated id keeps standalone fields and ungrouped duplicates distinct
    // within a group without requiring callers to supply one.
    const generatedId = React.useId();
    const fieldId = groupId ?? generatedId;

    // Local visibility for standalone use; the group (when present) owns the
    // mutual-exclusion state instead so revealing one field masks the others.
    const [localRevealed, setLocalRevealed] = React.useState(false);
    const revealed = group ? group.isRevealed(fieldId) : localRevealed;

    const toggle = () => {
      if (group) {
        if (revealed) {
          group.hide(fieldId);
        } else {
          group.reveal(fieldId);
        }
        return;
      }
      setLocalRevealed((prev) => !prev);
    };

    // The accessible name describes the action the control performs next, so it
    // changes as visibility toggles (R5.4).
    const toggleLabel = revealed ? t("password.hide") : t("password.show");

    return (
      <div className="relative">
        <Input
          {...props}
          ref={ref}
          type={revealed ? "text" : "password"}
          // Reserve inline-end space for the toggle (logical for RTL support).
          className={cn("pe-11", className)}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={toggle}
          // Mirror the input's disabled state so the toggle is unreachable when
          // the field itself is disabled.
          disabled={props.disabled}
          aria-label={toggleLabel}
          aria-pressed={revealed}
          title={toggleLabel}
          // 44px minimum touch target (R5.4); centered over the inline-end edge.
          className="absolute end-0 top-1/2 h-11 w-11 -translate-y-1/2 text-gray-500 hover:bg-transparent hover:text-gray-700"
        >
          {revealed ? (
            <EyeOff className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Eye className="h-4 w-4" aria-hidden="true" />
          )}
        </Button>
      </div>
    );
  }
);

PasswordInput.displayName = "PasswordInput";

export { PasswordInput };

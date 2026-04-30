// =============================================================================
// QuickThoughtInput — Single-line thought capture (max 280 chars). Lightweight
// alternative to the full EvidenceUploader for low-friction session evidence.
// =============================================================================

import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Send, Loader2 } from "lucide-react";

// ─── Constants ───────────────────────────────────────────────────────────────

const MAX_CHARS = 280;

// ─── Types ───────────────────────────────────────────────────────────────────

interface QuickThoughtInputProps {
  /** Called when the student submits a quick thought */
  onSubmit: (text: string) => void;
  /** Whether the submit operation is pending */
  isPending?: boolean;
  /** Whether the entire input is disabled */
  disabled?: boolean;
  /** Placeholder text for the input */
  placeholder?: string;
  /** Additional CSS classes */
  className?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

const QuickThoughtInput = ({
  onSubmit,
  isPending = false,
  disabled = false,
  placeholder = "What's the one thing you'll remember?",
  className,
}: QuickThoughtInputProps) => {
  const [text, setText] = useState("");

  const charCount = text.length;
  const isOverLimit = charCount > MAX_CHARS;
  const isEmpty = text.trim().length === 0;
  const canSubmit = !isEmpty && !isOverLimit && !isPending && !disabled;

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!canSubmit) return;
      onSubmit(text.trim());
      setText("");
    },
    [canSubmit, onSubmit, text]
  );

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);
  }, []);

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2">
        <Input
          type="text"
          value={text}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled || isPending}
          aria-label="Quick thought"
          aria-describedby="quick-thought-counter"
        />
        <Button
          type="submit"
          size="icon"
          disabled={!canSubmit}
          aria-label="Submit thought"
          className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Character counter + hint */}
      <div className="flex items-center justify-between text-[11px] text-gray-500">
        <span>One sentence is plenty.</span>
        <span
          id="quick-thought-counter"
          aria-live="polite"
          className={cn(
            "tabular-nums",
            isOverLimit
              ? "font-medium text-red-600"
              : charCount > MAX_CHARS - 30
              ? "font-medium text-amber-600"
              : ""
          )}
        >
          {charCount}/{MAX_CHARS}
        </span>
      </div>
    </form>
  );
};

export default QuickThoughtInput;
export type { QuickThoughtInputProps };

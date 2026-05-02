// =============================================================================
// SessionIntentDialog — Pre-learning intent dialog shown before Focus Mode.
// Collects a concept + success criterion, with auto-suggested intents as
// clickable chips. Supports Skip and Submit actions.
// =============================================================================

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Target, Lightbulb, SkipForward, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useSaveSessionIntent,
  useSuggestedIntents,
} from "@/hooks/useSessionIntent";
import type { SessionIntent, SuggestedIntent } from "@/types/planner";

// ─── Local form schema (sessionId injected at submit time) ──────────────────

const intentFormSchema = z.object({
  concept: z
    .string()
    .min(5, "At least 5 characters")
    .max(200, "Max 200 characters"),
  successCriterion: z
    .string()
    .min(5, "At least 5 characters")
    .max(200, "Max 200 characters"),
});

type IntentFormValues = z.infer<typeof intentFormSchema>;

// ─── Props ──────────────────────────────────────────────────────────────────

interface SessionIntentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  onSubmit?: (intent: SessionIntent) => void;
  onSkip?: () => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

const SessionIntentDialog = ({
  open,
  onOpenChange,
  sessionId,
  onSubmit,
  onSkip,
}: SessionIntentDialogProps) => {
  const { data: suggestions = [], isLoading: suggestionsLoading } =
    useSuggestedIntents(sessionId);
  const saveIntent = useSaveSessionIntent();

  const form = useForm<IntentFormValues>({
    resolver: zodResolver(intentFormSchema),
    defaultValues: {
      concept: "",
      successCriterion: "",
    },
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      form.reset({ concept: "", successCriterion: "" });
    }
  }, [open, form]);

  const handleChipClick = (suggestion: SuggestedIntent) => {
    form.setValue("concept", suggestion.concept, { shouldValidate: true });
    form.setValue("successCriterion", suggestion.successCriterion, {
      shouldValidate: true,
    });
  };

  const handleSubmit = (values: IntentFormValues) => {
    const isAutoSuggested = suggestions.some(
      (s) =>
        s.concept === values.concept &&
        s.successCriterion === values.successCriterion
    );

    saveIntent.mutate(
      {
        sessionId,
        concept: values.concept,
        successCriterion: values.successCriterion,
        isAutoSuggested,
      },
      {
        onSuccess: (intent) => {
          onSubmit?.(intent);
          onOpenChange(false);
        },
      }
    );
  };

  const handleSkip = () => {
    onSkip?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" aria-label="Set session intent">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-teal-500" />
            Set Your Intent
          </DialogTitle>
          <DialogDescription>
            What will you focus on this session? Setting a clear goal helps you
            stay on track.
          </DialogDescription>
        </DialogHeader>

        {/* Auto-suggested intents */}
        {suggestions.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-500 flex items-center gap-1">
              <Lightbulb className="h-3 w-3" />
              Suggested intents
            </p>
            <div
              className="flex flex-wrap gap-2"
              role="group"
              aria-label="Suggested intents"
            >
              {suggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleChipClick(suggestion)}
                  className={cn("cursor-pointer transition-colors")}
                  aria-label={`Use suggestion: ${suggestion.concept}`}
                >
                  <Badge
                    variant="outline"
                    className={cn(
                      "px-3 py-1.5 text-xs hover:bg-teal-50 hover:border-teal-300 hover:text-teal-700 cursor-pointer",
                       
                      form.watch("concept") === suggestion.concept &&
                        form.watch("successCriterion") ===
                          suggestion.successCriterion
                        ? "bg-teal-50 border-teal-400 text-teal-700"
                        : ""
                    )}
                  >
                    {suggestion.concept}
                  </Badge>
                </button>
              ))}
            </div>
          </div>
        )}

        {suggestionsLoading && (
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Loader2 className="h-3 w-3 animate-spin" />
            Loading suggestions…
          </div>
        )}

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="concept"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>What specific concept will you work on?</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Quadratic equations, Chapter 3 vocabulary"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="successCriterion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>What does success look like?</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Solve 5 practice problems correctly"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleSkip}
                className="gap-2"
              >
                <SkipForward className="h-4 w-4" />
                Skip
              </Button>
              <Button
                type="submit"
                disabled={saveIntent.isPending}
                className="gap-2 bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95"
              >
                {saveIntent.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Submit
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default SessionIntentDialog;
export type { SessionIntentDialogProps };

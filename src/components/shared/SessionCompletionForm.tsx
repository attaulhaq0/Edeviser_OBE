import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent } from '@/components/ui/card';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, Loader2, Clock, BookOpen, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StudySession } from '@/types/planner';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SessionCompletionData {
  notes: string | null;
  satisfactionRating: number | null;
  reflectionContent: string | null;
  evidenceFiles: File[];
  quickThought: string | null;
}

export interface SessionCompletionFormProps {
  session: StudySession;
  actualDurationMinutes: number;
  onSubmit: (data: SessionCompletionData) => void;
  onSkip: () => void;
  isSubmitting?: boolean;
}

// ---------------------------------------------------------------------------
// Form schema (client-side, extends sessionCompletionSchema concepts)
// ---------------------------------------------------------------------------

const completionFormSchema = z.object({
  notes: z.string().max(5000).optional(),
  satisfactionRating: z.number().int().min(1).max(5).nullable(),
});

type CompletionFormValues = z.infer<typeof completionFormSchema>;

import EvidenceUploader from '@/components/shared/EvidenceUploader';
import SessionReflectionInput from '@/components/shared/SessionReflectionInput';
import QuickThoughtInput from '@/components/shared/QuickThoughtInput';

// ---------------------------------------------------------------------------
// Star Rating sub-component
// ---------------------------------------------------------------------------

const StarRating = ({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
}) => {
  const [hovered, setHovered] = useState<number | null>(null);
  const displayValue = hovered ?? value ?? 0;

  return (
    <div
      className="flex items-center gap-1"
      role="radiogroup"
      aria-label="Satisfaction rating"
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={value === star}
          aria-label={`${star} star${star > 1 ? 's' : ''}`}
          className={cn(
            'p-1 rounded-md transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            'min-h-[44px] min-w-[44px] flex items-center justify-center',
          )}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(null)}
          onClick={() => onChange(value === star ? null : star)}
        >
          <Star
            className={cn(
              'h-6 w-6 transition-colors',
              star <= displayValue
                ? 'fill-amber-400 text-amber-400'
                : 'fill-transparent text-gray-300',
            )}
          />
        </button>
      ))}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const SessionCompletionForm = ({
  session,
  actualDurationMinutes,
  onSubmit,
  onSkip,
  isSubmitting = false,
}: SessionCompletionFormProps) => {
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [reflectionContent, setReflectionContent] = useState('');
  const [quickThought, setQuickThought] = useState<string | null>(null);
  const [showFullEvidence, setShowFullEvidence] = useState(false);

  const form = useForm<CompletionFormValues>({
    resolver: zodResolver(completionFormSchema),
    defaultValues: {
      notes: '',
      satisfactionRating: null,
    },
  });

  const handleFormSubmit = (values: CompletionFormValues) => {
    onSubmit({
      notes: values.notes?.trim() || null,
      satisfactionRating: values.satisfactionRating,
      reflectionContent: reflectionContent.trim() || null,
      evidenceFiles,
      quickThought,
    });
  };

  return (
    <Card className="bg-white border-0 shadow-lg rounded-xl overflow-hidden w-full max-w-lg mx-auto">
      {/* Gradient header */}
      <div
        className="px-6 py-4 flex items-center gap-2"
        style={{
          background:
            'linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)',
        }}
      >
        <CheckCircle2 className="h-5 w-5 text-white" />
        <h2 className="text-lg font-bold tracking-tight text-white">
          Session Complete
        </h2>
      </div>

      <CardContent className="pt-6 space-y-6">
        {/* Session summary */}
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="font-semibold">{session.title}</span>
          {session.courseName && (
            <Badge variant="secondary" className="gap-1">
              <BookOpen className="h-3 w-3" />
              {session.courseName}
            </Badge>
          )}
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3" />
            {actualDurationMinutes} min
          </Badge>
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleFormSubmit)}
            className="space-y-5"
          >
            {/* Session notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Session Notes (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="What did you work on? Any key takeaways?"
                      className="resize-none"
                      rows={3}
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Quick Thought — primary evidence option */}
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">
                Evidence (optional)
              </legend>
              <QuickThoughtInput
                onSubmit={(text) => setQuickThought(text)}
                maxLength={280}
              />
              {quickThought && (
                <p className="text-xs text-green-600 font-medium">
                  ✓ Quick thought saved
                </p>
              )}

              {/* Expandable full evidence uploader */}
              {!showFullEvidence ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-xs text-gray-400 hover:text-blue-600"
                  onClick={() => setShowFullEvidence(true)}
                >
                  Attach Files…
                </Button>
              ) : (
                <EvidenceUploader
                  files={evidenceFiles}
                  onChange={setEvidenceFiles}
                />
              )}
            </fieldset>

            {/* Satisfaction rating */}
            <FormField
              control={form.control}
              name="satisfactionRating"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>How satisfied are you with this session?</FormLabel>
                  <FormControl>
                    <StarRating
                      value={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Session reflection */}
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">
                Reflection (optional)
              </legend>
              <SessionReflectionInput
                value={reflectionContent}
                onChange={setReflectionContent}
              />
            </fieldset>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-gradient-to-r from-teal-500 to-blue-600 text-white font-semibold shadow-md active:scale-95"
              >
                {isSubmitting && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                Submit
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={onSkip}
                className="flex-1"
              >
                Skip
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default SessionCompletionForm;

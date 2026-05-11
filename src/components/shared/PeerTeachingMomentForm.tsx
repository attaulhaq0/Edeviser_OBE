// =============================================================================
// PeerTeachingMomentForm — Form to create a teaching moment
// Task 4.11: title, text 50-500 chars, optional media URL, Zod validation
// =============================================================================

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createTeachingMomentSchema,
  type CreateTeachingMomentInput,
} from "@/lib/schemas/peerTeaching";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, BookOpen } from "lucide-react";

export interface PeerTeachingMomentFormProps {
  teamId: string;
  cloId: string;
  onSubmit: (data: CreateTeachingMomentInput) => void;
  isPending?: boolean;
  className?: string;
}

const PeerTeachingMomentForm = ({
  teamId,
  cloId,
  onSubmit,
  isPending = false,
  className,
}: PeerTeachingMomentFormProps) => {
  const form = useForm<CreateTeachingMomentInput>({
    resolver: zodResolver(createTeachingMomentSchema),
    defaultValues: {
      team_id: teamId,
      clo_id: cloId,
      title: "",
      explanation_text: "",
      media_url: null,
    },
  });

  const explanationText = form.watch("explanation_text");
  const charCount = explanationText?.length ?? 0;

  const handleSubmit = (data: CreateTeachingMomentInput) => {
    // Normalize empty media_url to null
    const normalized = {
      ...data,
      media_url: data.media_url?.trim() || null,
    };
    onSubmit(normalized);
  };

  return (
    <div className={className}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          {/* Title */}
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g., Understanding Binary Search"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Explanation Text */}
          <FormField
            control={form.control}
            name="explanation_text"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Explanation</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Explain the concept in your own words (50-500 characters)..."
                    rows={5}
                    {...field}
                  />
                </FormControl>
                <div className="flex items-center justify-between">
                  <FormMessage />
                  <FormDescription className="text-end tabular-nums">
                    {charCount}/500
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />

          {/* Media URL (optional) */}
          <FormField
            control={form.control}
            name="media_url"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Media Link (optional)</FormLabel>
                <FormControl>
                  <Input
                    type="url"
                    placeholder="https://..."
                    {...field}
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value || null)}
                  />
                </FormControl>
                <FormDescription>
                  Link to a video, audio, or diagram that supports your
                  explanation
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Hidden fields */}
          <input type="hidden" {...form.register("team_id")} />
          <input type="hidden" {...form.register("clo_id")} />

          <Button
            type="submit"
            disabled={isPending}
            className="bg-gradient-to-r from-teal-500 to-blue-600 text-white active:scale-95 transition-transform duration-100 gap-1.5"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <BookOpen className="h-4 w-4" />
            )}
            Share Teaching Moment
          </Button>
        </form>
      </Form>
    </div>
  );
};

export default PeerTeachingMomentForm;

// =============================================================================
// PeerTeachingMomentForm — Task 4.11
// Form to create teaching moment (title, text 50-500 chars, optional media URL)
// with Zod validation
// =============================================================================

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createTeachingMomentSchema } from '@/lib/schemas/peerTeaching';
import { z } from 'zod';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Loader2, BookOpen } from 'lucide-react';

type FormValues = z.infer<typeof createTeachingMomentSchema>;

interface PeerTeachingMomentFormProps {
  teamId: string;
  cloId: string;
  cloTitle: string;
  onSubmit: (data: FormValues) => void;
  onCancel: () => void;
  isPending?: boolean;
}

const PeerTeachingMomentForm = ({
  teamId,
  cloId,
  cloTitle,
  onSubmit,
  onCancel,
  isPending,
}: PeerTeachingMomentFormProps) => {
  const form = useForm<FormValues>({
    resolver: zodResolver(createTeachingMomentSchema),
    defaultValues: {
      team_id: teamId,
      clo_id: cloId,
      title: '',
      explanation_text: '',
      media_url: null,
    },
  });

  // eslint-disable-next-line react-hooks/incompatible-library
  const textLength = form.watch('explanation_text')?.length ?? 0;

  return (
    <Card className="bg-white border-0 shadow-md rounded-xl p-6" data-testid="teaching-moment-form">
      <div className="flex items-center gap-2 mb-4">
        <BookOpen className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-bold tracking-tight">Share a Teaching Moment</h3>
      </div>
      <p className="text-xs text-gray-500 mb-4">
        Help your teammates understand <span className="font-semibold">{cloTitle}</span>
      </p>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="e.g., How I understood recursion"
                    maxLength={100}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="explanation_text"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Explanation</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="Explain the concept in your own words..."
                    rows={5}
                    maxLength={500}
                  />
                </FormControl>
                <FormDescription>
                  {textLength}/500 characters (minimum 50)
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="media_url"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Media URL (optional)</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value || null)}
                    placeholder="https://youtube.com/watch?v=..."
                    type="url"
                  />
                </FormControl>
                <FormDescription>
                  Link to a video, audio, or diagram that helps explain the concept
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex gap-2 pt-2">
            <Button
              type="submit"
              disabled={isPending}
              className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95"
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Share Teaching Moment
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </Form>
    </Card>
  );
};

export default PeerTeachingMomentForm;

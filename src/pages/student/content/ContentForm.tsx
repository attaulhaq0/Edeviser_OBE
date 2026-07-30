// =============================================================================
// ContentForm — Form for study plans, quiz questions, explanation videos
// Task 21.3
// =============================================================================

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCreateStudentContent } from "@/hooks/useStudentContent";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, Loader2, X } from "lucide-react";
import { PCard, SectionHeader } from "@/design-system";
import {
  studentContentFormSchema,
  type StudentContentFormInput,
} from "@/lib/marketplaceSchemas";

interface ContentFormProps {
  onClose: () => void;
}

const ContentForm = ({ onClose }: ContentFormProps) => {
  const { profile } = useAuth();
  const createContent = useCreateStudentContent();

  const form = useForm<StudentContentFormInput>({
    resolver: zodResolver(studentContentFormSchema),
    defaultValues: {
      content_type: "study_plan",
      title: "",
      body: "",
    },
  });

  const handleSubmit = (values: StudentContentFormInput) => {
    if (!profile?.id) return;

    createContent.mutate(
      {
        content_type: values.content_type,
        title: values.title,
        clo_id: null,
        content_data: { body: values.body },
        studentId: profile.id,
      },
      { onSuccess: () => onClose() }
    );
  };

  return (
    <PCard className="p-6">
      <SectionHeader
        icon={FileText}
        title="Create Content"
        action={
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        }
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="content_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Content Type</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="study_plan">Study Plan</SelectItem>
                    <SelectItem value="quiz_question">Quiz Question</SelectItem>
                    <SelectItem value="explanation_video">
                      Explanation Video
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter a title for your content"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="body"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Content</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Describe your content..."
                    rows={4}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createContent.isPending}
              variant="tactile"
            >
              {createContent.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Submit for Review
            </Button>
          </div>
        </form>
      </Form>
    </PCard>
  );
};

export default ContentForm;

import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Assignment, StudentSubmission, InsertStudentSubmission } from "@shared/schema";
import { insertStudentSubmissionSchema } from "@shared/schema";

const submissionFormSchema = insertStudentSubmissionSchema.extend({
  submissionText: z.string().min(1, "Submission content is required"),
}).omit({
  studentId: true,
  submittedAt: true,
  gradedAt: true,
  gradedBy: true,
});

type SubmissionFormData = z.infer<typeof submissionFormSchema>;

interface SubmissionFormProps {
  assignment: Assignment;
  existingSubmission?: StudentSubmission;
  onSuccess: () => void;
  onCancel: () => void;
}

export function SubmissionForm({ assignment, existingSubmission, onSuccess, onCancel }: SubmissionFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isReadOnly = !!existingSubmission;
  const submissionData = existingSubmission?.submissionData as any;

  const form = useForm<SubmissionFormData>({
    resolver: zodResolver(submissionFormSchema),
    defaultValues: {
      assignmentId: assignment.id,
      submissionText: submissionData?.text || "",
      submissionData: submissionData || null,
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (data: InsertStudentSubmission) => {
      return apiRequest("/api/student-submissions", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/student-submissions"] });
      toast({
        title: "Success",
        description: "Assignment submitted successfully",
      });
      onSuccess();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit assignment",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: SubmissionFormData) => {
    if (!user || isReadOnly) return;
    
    setIsSubmitting(true);
    
    try {
      const submissionData: InsertStudentSubmission = {
        assignmentId: assignment.id,
        studentId: user.id,
        submissionData: {
          text: data.submissionText,
          submittedAt: new Date().toISOString(),
        },
        submittedAt: new Date(),
      };

      await submitMutation.mutateAsync(submissionData);
    } catch (error) {
      console.error("Submission error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Assignment Details */}
      <div className="border rounded-lg p-4 bg-muted/20">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{assignment.title}</h3>
          <Badge variant="outline" data-testid="assignment-points-badge">
            {assignment.totalPoints} points
          </Badge>
        </div>
        
        {assignment.description && (
          <p className="text-sm text-muted-foreground mb-4">
            {assignment.description}
          </p>
        )}
        
        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
          {assignment.dueDate && (
            <span>
              <strong>Due:</strong> {new Date(assignment.dueDate).toLocaleDateString()}
            </span>
          )}
          {existingSubmission?.submittedAt && (
            <span>
              <strong>Submitted:</strong> {new Date(existingSubmission.submittedAt).toLocaleDateString()}
            </span>
          )}
          {existingSubmission?.totalScore && (
            <span>
              <strong>Grade:</strong> {existingSubmission.totalScore}/{assignment.totalPoints}
            </span>
          )}
        </div>
      </div>

      {/* Submission Form or View */}
      {isReadOnly ? (
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Your Submission:</h4>
            <div className="border rounded-lg p-4 bg-background">
              <p className="whitespace-pre-wrap">
                {submissionData?.text || "No submission content available"}
              </p>
            </div>
          </div>
          
          {existingSubmission?.feedback && (
            <div>
              <h4 className="font-medium mb-2">Teacher Feedback:</h4>
              <div className="border rounded-lg p-4 bg-blue-50 dark:bg-blue-950/20">
                <p className="whitespace-pre-wrap text-blue-900 dark:text-blue-100">
                  {existingSubmission.feedback}
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="submissionText"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Submission</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter your assignment submission here..."
                      className="min-h-[200px]"
                      data-testid="input-submission-text"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                data-testid="button-cancel-submission"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                data-testid="button-submit-assignment"
              >
                {isSubmitting ? "Submitting..." : "Submit Assignment"}
              </Button>
            </div>
          </form>
        </Form>
      )}

      {isReadOnly && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            onClick={onCancel}
            data-testid="button-close-submission"
          >
            Close
          </Button>
        </div>
      )}
    </div>
  );
}
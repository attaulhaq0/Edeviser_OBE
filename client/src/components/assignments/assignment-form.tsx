import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Assignment, Course, InsertAssignment } from "@shared/schema";
import { insertAssignmentSchema } from "@shared/schema";

const assignmentFormSchema = insertAssignmentSchema.extend({
  dueDate: z.string().optional(),
}).omit({
  teacherId: true,
});

type AssignmentFormData = z.infer<typeof assignmentFormSchema>;

interface AssignmentFormProps {
  assignment?: Assignment;
  onSuccess: () => void;
  onCancel: () => void;
}

export function AssignmentForm({ assignment, onSuccess, onCancel }: AssignmentFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: courses = [] } = useQuery<Course[]>({
    queryKey: ["/api/courses/teacher/" + user?.id],
    enabled: !!user,
  });

  const form = useForm<AssignmentFormData>({
    resolver: zodResolver(assignmentFormSchema),
    defaultValues: {
      title: assignment?.title || "",
      description: assignment?.description || "",
      courseId: assignment?.courseId || "",
      totalPoints: assignment?.totalPoints || 100,
      dueDate: assignment?.dueDate ? new Date(assignment.dueDate).toISOString().split('T')[0] : "",
      isActive: assignment?.isActive ?? true,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertAssignment) => {
      return apiRequest("/api/assignments", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assignments"] });
      toast({
        title: "Success",
        description: "Assignment created successfully",
      });
      onSuccess();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create assignment",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<InsertAssignment>) => {
      return apiRequest(`/api/assignments/${assignment?.id}`, "PUT", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assignments"] });
      toast({
        title: "Success",
        description: "Assignment updated successfully",
      });
      onSuccess();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update assignment",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: AssignmentFormData) => {
    if (!user) return;
    
    setIsSubmitting(true);
    
    try {
      const submissionData: InsertAssignment = {
        ...data,
        teacherId: user.id,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
      };

      if (assignment) {
        await updateMutation.mutateAsync(submissionData);
      } else {
        await createMutation.mutateAsync(submissionData);
      }
    } catch (error) {
      console.error("Assignment submission error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Assignment Title</FormLabel>
              <FormControl>
                <Input
                  placeholder="Enter assignment title"
                  data-testid="input-assignment-title"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Enter assignment description"
                  className="min-h-[100px]"
                  data-testid="input-assignment-description"
                  {...field}
                  value={field.value || ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="courseId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Course</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="select-assignment-course">
                    <SelectValue placeholder="Select a course" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.code} - {course.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="totalPoints"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Total Points</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="1"
                    placeholder="100"
                    data-testid="input-assignment-points"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="dueDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Due Date</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    data-testid="input-assignment-due-date"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end space-x-4 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            data-testid="button-cancel-assignment"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            data-testid="button-save-assignment"
          >
            {isSubmitting ? "Saving..." : assignment ? "Update Assignment" : "Create Assignment"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
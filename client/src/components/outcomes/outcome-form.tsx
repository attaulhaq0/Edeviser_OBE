import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { insertLearningOutcomeSchema, type InsertLearningOutcome, type LearningOutcome } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { BLOOMS_LEVELS, OUTCOME_TYPES } from "@shared/schema";

interface OutcomeFormProps {
  outcome?: LearningOutcome;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function OutcomeForm({ outcome, onSuccess, onCancel }: OutcomeFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: programs } = useQuery({
    queryKey: ["/api/programs"],
  });

  const { data: courses } = useQuery({
    queryKey: ["/api/courses"],
  });

  const form = useForm<InsertLearningOutcome>({
    resolver: zodResolver(insertLearningOutcomeSchema),
    defaultValues: {
      code: outcome?.code || "",
      title: outcome?.title || "",
      description: outcome?.description || "",
      type: outcome?.type || "CLO",
      bloomsLevel: outcome?.bloomsLevel || "understand",
      programId: outcome?.programId || "",
      courseId: outcome?.courseId || "",
      ownerId: user?.id || "",
      lastEditedBy: user?.id || "",
      version: outcome?.version || 1,
      isActive: outcome?.isActive ?? true,
    },
  });

  const selectedType = form.watch("type");
  const selectedProgramId = form.watch("programId");

  const createMutation = useMutation({
    mutationFn: async (data: InsertLearningOutcome) => {
      const response = await apiRequest("POST", "/api/learning-outcomes", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Learning outcome created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/learning-outcomes"] });
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<LearningOutcome>) => {
      const response = await apiRequest("PUT", `/api/learning-outcomes/${outcome?.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Learning outcome updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/learning-outcomes"] });
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertLearningOutcome) => {
    if (outcome) {
      updateMutation.mutate({ ...data, lastEditedBy: user?.id });
    } else {
      createMutation.mutate({ ...data, ownerId: user?.id, lastEditedBy: user?.id });
    }
  };

  const getBloomsDescription = (level: string) => {
    const descriptions = {
      remember: "Recall facts and basic concepts",
      understand: "Explain ideas or concepts", 
      apply: "Use information in new situations",
      analyze: "Draw connections among ideas",
      evaluate: "Justify a stand or decision",
      create: "Produce new or original work"
    };
    return descriptions[level as keyof typeof descriptions];
  };

  const filteredCourses = courses?.filter(course => 
    selectedType === "CLO" && (!selectedProgramId || course.programId === selectedProgramId)
  ) || [];

  return (
    <Card className="w-full max-w-2xl mx-auto" data-testid="outcome-form">
      <CardHeader>
        <CardTitle className="flex items-center">
          <i className="fas fa-bullseye text-primary mr-3"></i>
          {outcome ? "Edit Learning Outcome" : "Create New Learning Outcome"}
        </CardTitle>
        <CardDescription>
          {outcome ? "Update the learning outcome details below" : "Define a new learning outcome with Bloom's taxonomy classification"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Outcome Type */}
          <div className="space-y-2">
            <Label htmlFor="type">Outcome Type *</Label>
            <Select 
              value={form.watch("type")} 
              onValueChange={(value) => {
                form.setValue("type", value as any);
                // Clear program/course when type changes
                if (value === "ILO") {
                  form.setValue("programId", "");
                  form.setValue("courseId", "");
                } else if (value === "PLO") {
                  form.setValue("courseId", "");
                }
              }}
            >
              <SelectTrigger data-testid="select-outcome-type">
                <SelectValue placeholder="Select outcome type" />
              </SelectTrigger>
              <SelectContent>
                {OUTCOME_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type} - {type === "ILO" ? "Institutional" : type === "PLO" ? "Program" : "Course"} Learning Outcome
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.type && (
              <p className="text-sm text-destructive">{form.formState.errors.type.message}</p>
            )}
          </div>

          {/* Code and Title */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code">Outcome Code *</Label>
              <Input
                id="code"
                {...form.register("code")}
                placeholder="e.g., ILO-1, PLO-1, CLO-1.1"
                data-testid="input-outcome-code"
              />
              {form.formState.errors.code && (
                <p className="text-sm text-destructive">{form.formState.errors.code.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                {...form.register("title")}
                placeholder="Brief title of the learning outcome"
                data-testid="input-outcome-title"
              />
              {form.formState.errors.title && (
                <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              {...form.register("description")}
              placeholder="Detailed description of what students should be able to do..."
              className="min-h-[100px]"
              data-testid="textarea-outcome-description"
            />
            {form.formState.errors.description && (
              <p className="text-sm text-destructive">{form.formState.errors.description.message}</p>
            )}
          </div>

          {/* Bloom's Taxonomy Level */}
          <div className="space-y-2">
            <Label htmlFor="bloomsLevel">Bloom's Taxonomy Level *</Label>
            <Select value={form.watch("bloomsLevel")} onValueChange={(value) => form.setValue("bloomsLevel", value as any)}>
              <SelectTrigger data-testid="select-blooms-level">
                <SelectValue placeholder="Select cognitive level" />
              </SelectTrigger>
              <SelectContent>
                {BLOOMS_LEVELS.map((level) => (
                  <SelectItem key={level} value={level}>
                    <div className="flex items-center space-x-3">
                      <Badge variant="outline" className="capitalize">
                        {level}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {getBloomsDescription(level)}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.bloomsLevel && (
              <p className="text-sm text-destructive">{form.formState.errors.bloomsLevel.message}</p>
            )}
          </div>

          {/* Program Selection (for PLO and CLO) */}
          {(selectedType === "PLO" || selectedType === "CLO") && (
            <div className="space-y-2">
              <Label htmlFor="programId">Program {selectedType === "PLO" ? "*" : ""}</Label>
              <Select 
                value={form.watch("programId") || ""} 
                onValueChange={(value) => {
                  form.setValue("programId", value);
                  if (selectedType === "CLO") {
                    form.setValue("courseId", ""); // Clear course when program changes
                  }
                }}
              >
                <SelectTrigger data-testid="select-program">
                  <SelectValue placeholder="Select program" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No program selected</SelectItem>
                  {programs?.map((program) => (
                    <SelectItem key={program.id} value={program.id}>
                      {program.name} ({program.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.programId && (
                <p className="text-sm text-destructive">{form.formState.errors.programId.message}</p>
              )}
            </div>
          )}

          {/* Course Selection (for CLO only) */}
          {selectedType === "CLO" && (
            <div className="space-y-2">
              <Label htmlFor="courseId">Course *</Label>
              <Select 
                value={form.watch("courseId") || ""} 
                onValueChange={(value) => form.setValue("courseId", value)}
              >
                <SelectTrigger data-testid="select-course">
                  <SelectValue placeholder="Select course" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No course selected</SelectItem>
                  {filteredCourses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.name} ({course.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.courseId && (
                <p className="text-sm text-destructive">{form.formState.errors.courseId.message}</p>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-6 border-t">
            {onCancel && (
              <Button 
                type="button" 
                variant="outline" 
                onClick={onCancel}
                data-testid="button-cancel-outcome"
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              data-testid="button-save-outcome"
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  {outcome ? "Updating..." : "Creating..."}
                </>
              ) : (
                <>
                  <i className="fas fa-save mr-2"></i>
                  {outcome ? "Update Outcome" : "Create Outcome"}
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

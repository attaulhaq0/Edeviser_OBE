import { useEffect, useState } from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';
import {
  createAssignmentSchema,
  type CreateAssignmentFormData,
} from '@/lib/schemas/assignment';
import {
  useAssignment,
  useCreateAssignment,
  useUpdateAssignment,
} from '@/hooks/useAssignments';
import { useCourses } from '@/hooks/useCourses';
import { useCLOs } from '@/hooks/useCLOs';
import { useRubrics } from '@/hooks/useRubrics';
import { BLOOMS_COLORS } from '@/lib/bloomsVerbs';
import type { BloomsLevel } from '@/lib/schemas/clo';
import type { LearningOutcome } from '@/types/app';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader2, Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ─── Form data type using z.input to handle defaults ─────────────────────────

type AssignmentFormData = z.input<typeof createAssignmentSchema>;

// ─── Bloom's badge helper ────────────────────────────────────────────────────

const BloomsBadge = ({ level }: { level: string | null }) => {
  if (!level) return null;
  const key = level.toLowerCase() as BloomsLevel;
  const colors = BLOOMS_COLORS[key];
  if (!colors) return null;
  return (
    <Badge variant="outline" className={cn(colors.bg, colors.text, 'border-0 text-xs')}>
      {level}
    </Badge>
  );
};

// ─── CLO Weight Section ──────────────────────────────────────────────────────

interface CLOWeightSectionProps {
  clos: LearningOutcome[];
  isLoadingCLOs: boolean;
  form: ReturnType<typeof useForm<AssignmentFormData>>;
}

const CLOWeightSection = ({ clos, isLoadingCLOs, form }: CLOWeightSectionProps) => {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'clo_weights',
  });

  const watchedWeights = useWatch({ control: form.control, name: 'clo_weights' }) ?? [];
  const totalWeight = watchedWeights.reduce((sum, w) => sum + (Number(w?.weight) || 0), 0);
  const selectedCloIds = watchedWeights.map((w) => w?.clo_id).filter(Boolean);

  const toggleCLO = (clo: LearningOutcome) => {
    const idx = fields.findIndex((f) => f.clo_id === clo.id);
    if (idx >= 0) {
      remove(idx);
    } else if (fields.length < 3) {
      append({ clo_id: clo.id as `${string}-${string}-${string}-${string}-${string}`, weight: 0 });
    }
  };

  if (isLoadingCLOs) {
    return <p className="text-sm text-gray-500">Loading CLOs…</p>;
  }

  if (clos.length === 0) {
    return <p className="text-sm text-gray-500">No CLOs found for this course. Create CLOs first.</p>;
  }

  return (
    <div className="space-y-3">
      {clos.map((clo) => {
        const isSelected = selectedCloIds.includes(clo.id);
        const fieldIdx = fields.findIndex((f) => f.clo_id === clo.id);

        return (
          <div
            key={clo.id}
            className={cn(
              'flex items-center gap-3 rounded-lg border p-3 transition-colors',
              isSelected ? 'border-blue-300 bg-blue-50/50' : 'border-slate-200',
            )}
          >
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => toggleCLO(clo)}
              disabled={!isSelected && fields.length >= 3}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              aria-label={`Select ${clo.title}`}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium truncate">{clo.title}</span>
                <BloomsBadge level={clo.blooms_level} />
              </div>
            </div>
            {isSelected && fieldIdx >= 0 && (
              <div className="flex items-center gap-2">
                <FormField
                  control={form.control}
                  name={`clo_weights.${fieldIdx}.weight`}
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-1 space-y-0">
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          className="w-20 h-8 text-sm"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                          value={field.value ?? 0}
                        />
                      </FormControl>
                      <span className="text-xs text-gray-500">%</span>
                    </FormItem>
                  )}
                />
              </div>
            )}
          </div>
        );
      })}

      <FormMessage>{form.formState.errors.clo_weights?.message}</FormMessage>

      <div className="flex items-center justify-between pt-2 border-t border-slate-200">
        <span className="text-sm text-gray-500">
          {fields.length}/3 CLOs selected
        </span>
        <span
          className={cn(
            'text-sm font-semibold',
            totalWeight === 100 ? 'text-green-600' : 'text-amber-600',
          )}
        >
          Total: {totalWeight}%
          {totalWeight !== 100 && ' (should be 100%)'}
        </span>
      </div>
    </div>
  );
};

// ─── Prerequisite Gates Section ──────────────────────────────────────────────

interface PrerequisiteSectionProps {
  clos: LearningOutcome[];
  form: ReturnType<typeof useForm<AssignmentFormData>>;
}

const PrerequisiteSection = ({ clos, form }: PrerequisiteSectionProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'prerequisites',
  });

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
      >
        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        Prerequisite Gates ({fields.length})
      </button>

      {isOpen && (
        <div className="space-y-3 pl-6">
          <p className="text-xs text-gray-500">
            Students must achieve the required attainment on a CLO before accessing this assignment.
          </p>

          {fields.map((field, index) => (
            <div key={field.id} className="flex items-center gap-3">
              <FormField
                control={form.control}
                name={`prerequisites.${index}.clo_id`}
                render={({ field: selectField }) => (
                  <FormItem className="flex-1 space-y-0">
                    <Select onValueChange={selectField.onChange} value={selectField.value}>
                      <FormControl>
                        <SelectTrigger className="bg-white h-8 text-sm">
                          <SelectValue placeholder="Select CLO" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {clos.map((clo) => (
                          <SelectItem key={clo.id} value={clo.id}>
                            <span className="flex items-center gap-2">
                              {clo.title}
                              <BloomsBadge level={clo.blooms_level} />
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name={`prerequisites.${index}.required_attainment`}
                render={({ field: numField }) => (
                  <FormItem className="space-y-0">
                    <div className="flex items-center gap-1">
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          className="w-20 h-8 text-sm"
                          placeholder="Min %"
                          {...numField}
                          onChange={(e) => numField.onChange(Number(e.target.value))}
                          value={numField.value ?? 0}
                        />
                      </FormControl>
                      <span className="text-xs text-gray-500">%</span>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => remove(index)}
                className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              append({
                clo_id: '' as `${string}-${string}-${string}-${string}-${string}`,
                required_attainment: 70,
              })
            }
            className="text-sm"
          >
            <Plus className="h-4 w-4" /> Add Prerequisite
          </Button>
        </div>
      )}
    </div>
  );
};

// ─── Shared form fields ──────────────────────────────────────────────────────

interface AssignmentFormFieldsProps {
  form: ReturnType<typeof useForm<AssignmentFormData>>;
  onSubmit: (data: AssignmentFormData) => void;
  isPending: boolean;
  isEditMode: boolean;
}

const AssignmentFormFields = ({
  form,
  onSubmit,
  isPending,
  isEditMode,
}: AssignmentFormFieldsProps) => {
  const navigate = useNavigate();

  const selectedCourseId = useWatch({ control: form.control, name: 'course_id' });
  const { data: courses = [], isLoading: isLoadingCourses } = useCourses();
  const { data: clos = [], isLoading: isLoadingCLOs } = useCLOs(
    selectedCourseId || undefined,
  );
  const { data: rubrics = [], isLoading: isLoadingRubrics } = useRubrics(
    selectedCourseId || undefined,
  );

  // Reset CLO weights and rubric when course changes
  useEffect(() => {
    if (selectedCourseId && !isEditMode) {
      form.setValue('clo_weights', []);
      form.setValue('rubric_id', '' as `${string}-${string}-${string}-${string}-${string}`);
      form.setValue('prerequisites', []);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCourseId]);

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((data) => {
          // Convert datetime-local to ISO string
          const isoDate = data.due_date.includes('Z')
            ? data.due_date
            : new Date(data.due_date).toISOString();
          onSubmit({ ...data, due_date: isoDate });
        })}
        className="space-y-6"
      >
        {/* Section 1: Basic Details */}
        <Card className="bg-white border-0 shadow-md rounded-xl p-6">
          <h2 className="text-lg font-bold tracking-tight mb-4">Basic Details</h2>
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Binary Search Tree Implementation" {...field} />
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
                      placeholder="Describe the assignment objectives and deliverables…"
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="course_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Course</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isLoadingCourses || isEditMode}
                  >
                    <FormControl>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Select a course" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {courses.map((course) => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.code} — {course.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="due_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date</FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        {...field}
                        value={
                          field.value
                            ? field.value.includes('T')
                              ? field.value.slice(0, 16)
                              : field.value
                            : ''
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="total_marks"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Marks</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        placeholder="100"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="late_window_hours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Late Window (hours)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        placeholder="24"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        value={field.value ?? 24}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </Card>

        {/* Section 2: Rubric Selection */}
        <Card className="bg-white border-0 shadow-md rounded-xl p-6">
          <h2 className="text-lg font-bold tracking-tight mb-4">Rubric</h2>
          <FormField
            control={form.control}
            name="rubric_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Select Rubric</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  disabled={isLoadingRubrics || !selectedCourseId}
                >
                  <FormControl>
                    <SelectTrigger className="bg-white">
                      <SelectValue
                        placeholder={
                          !selectedCourseId
                            ? 'Select a course first'
                            : 'Select a rubric'
                        }
                      />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {rubrics.map((rubric) => (
                      <SelectItem key={rubric.id} value={rubric.id}>
                        {rubric.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedCourseId && rubrics.length === 0 && !isLoadingRubrics && (
                  <p className="text-xs text-amber-600 mt-1">
                    No rubrics found for this course. Create a rubric first.
                  </p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        </Card>

        {/* Section 3: CLO Linking & Weight Distribution */}
        <Card className="bg-white border-0 shadow-md rounded-xl p-6">
          <h2 className="text-lg font-bold tracking-tight mb-4">
            CLO Linking &amp; Weight Distribution
          </h2>
          {selectedCourseId ? (
            <CLOWeightSection
              clos={clos}
              isLoadingCLOs={isLoadingCLOs}
              form={form}
            />
          ) : (
            <p className="text-sm text-gray-500">Select a course to see available CLOs.</p>
          )}
        </Card>

        {/* Section 4: Prerequisite Gates */}
        <Card className="bg-white border-0 shadow-md rounded-xl p-6">
          <h2 className="text-lg font-bold tracking-tight mb-4">
            Prerequisite Gates
            <span className="text-sm font-normal text-gray-500 ml-2">(Optional)</span>
          </h2>
          {selectedCourseId ? (
            <PrerequisiteSection clos={clos} form={form} />
          ) : (
            <p className="text-sm text-gray-500">Select a course to configure prerequisites.</p>
          )}
        </Card>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Button
            type="submit"
            disabled={isPending}
            className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95 text-white"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEditMode ? 'Update Assignment' : 'Create Assignment'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/teacher/assignments')}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
};

// ─── Create mode form ────────────────────────────────────────────────────────

const CreateAssignmentForm = () => {
  const navigate = useNavigate();
  const createMutation = useCreateAssignment();

  const form = useForm<AssignmentFormData>({
    resolver: zodResolver(createAssignmentSchema),
    defaultValues: {
      title: '',
      description: '',
      course_id: '' as `${string}-${string}-${string}-${string}-${string}`,
      due_date: '',
      total_marks: undefined as unknown as number,
      rubric_id: '' as `${string}-${string}-${string}-${string}-${string}`,
      clo_weights: [],
      late_window_hours: 24,
      prerequisites: [],
    },
  });

  const onSubmit = (data: AssignmentFormData) => {
    createMutation.mutate(data as CreateAssignmentFormData, {
      onSuccess: () => {
        toast.success('Assignment created successfully');
        navigate('/teacher/assignments');
      },
      onError: (err) => toast.error(err.message),
    });
  };

  return (
    <AssignmentFormFields
      form={form}
      onSubmit={onSubmit}
      isPending={createMutation.isPending}
      isEditMode={false}
    />
  );
};

// ─── Edit mode form ──────────────────────────────────────────────────────────

const EditAssignmentForm = ({ assignmentId }: { assignmentId: string }) => {
  const navigate = useNavigate();
  const { data: existing, isLoading } = useAssignment(assignmentId);
  const updateMutation = useUpdateAssignment(assignmentId);

  const form = useForm<AssignmentFormData>({
    resolver: zodResolver(createAssignmentSchema),
    defaultValues: {
      title: '',
      description: '',
      course_id: '' as `${string}-${string}-${string}-${string}-${string}`,
      due_date: '',
      total_marks: undefined as unknown as number,
      rubric_id: '' as `${string}-${string}-${string}-${string}-${string}`,
      clo_weights: [],
      late_window_hours: 24,
      prerequisites: [],
    },
  });

  useEffect(() => {
    if (existing) {
      form.reset({
        title: existing.title,
        description: existing.description,
        course_id: existing.course_id as `${string}-${string}-${string}-${string}-${string}`,
        due_date: existing.due_date,
        total_marks: existing.total_marks,
        rubric_id: existing.rubric_id as `${string}-${string}-${string}-${string}-${string}`,
        clo_weights: (existing.clo_weights ?? []).map((w) => ({
          clo_id: w.clo_id as `${string}-${string}-${string}-${string}-${string}`,
          weight: w.weight,
        })),
        late_window_hours: existing.late_window_hours,
        prerequisites: (existing.prerequisites ?? []).map((p) => ({
          clo_id: p.clo_id as `${string}-${string}-${string}-${string}-${string}`,
          required_attainment: p.required_attainment,
        })),
      });
    }
  }, [existing, form]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const onSubmit = (data: AssignmentFormData) => {
    updateMutation.mutate(data as Partial<CreateAssignmentFormData>, {
      onSuccess: () => {
        toast.success('Assignment updated successfully');
        navigate('/teacher/assignments');
      },
      onError: (err) => toast.error(err.message),
    });
  };

  return (
    <AssignmentFormFields
      form={form}
      onSubmit={onSubmit}
      isPending={updateMutation.isPending}
      isEditMode
    />
  );
};

// ─── Main page component ─────────────────────────────────────────────────────

const AssignmentForm = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditMode = !!id;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/teacher/assignments')}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">
          {isEditMode ? 'Edit Assignment' : 'Create Assignment'}
        </h1>
      </div>

      {isEditMode ? (
        <EditAssignmentForm assignmentId={id} />
      ) : (
        <CreateAssignmentForm />
      )}
    </div>
  );
};

export default AssignmentForm;

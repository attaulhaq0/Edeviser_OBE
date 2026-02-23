import { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams } from 'react-router-dom';
import { createCLOSchema, type CreateCLOFormData, type BloomsLevel } from '@/lib/schemas/clo';
import {
  useCreateCLO,
  useUpdateCLO,
  useCLO,
  useCLOMappings,
  useUpdateCLOMappings,
} from '@/hooks/useCLOs';
import { useCourses } from '@/hooks/useCourses';
import { usePLOs } from '@/hooks/usePLOs';
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
import { ArrowLeft, Loader2, Link2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import BloomsVerbGuide from '@/components/shared/BloomsVerbGuide';
import type { LearningOutcome } from '@/types/app';

// ─── Bloom's level config ───────────────────────────────────────────────────

const BLOOMS_LEVELS: Array<{ value: BloomsLevel; label: string; color: string }> = [
  { value: 'remembering', label: 'Remembering', color: 'bg-purple-500' },
  { value: 'understanding', label: 'Understanding', color: 'bg-blue-500' },
  { value: 'applying', label: 'Applying', color: 'bg-green-500' },
  { value: 'analyzing', label: 'Analyzing', color: 'bg-yellow-500' },
  { value: 'evaluating', label: 'Evaluating', color: 'bg-orange-500' },
  { value: 'creating', label: 'Creating', color: 'bg-red-500' },
];

// ─── PLO Mapping types ──────────────────────────────────────────────────────

interface PLOMappingEntry {
  plo_id: string;
  weight: number;
  enabled: boolean;
}

// ─── CLO Details Form (Create) ──────────────────────────────────────────────

const CreateCLODetailsForm = () => {
  const navigate = useNavigate();
  const createMutation = useCreateCLO();
  const { data: courses = [], isLoading: isLoadingCourses } = useCourses();

  const form = useForm<CreateCLOFormData>({
    resolver: zodResolver(createCLOSchema),
    defaultValues: {
      title: '',
      description: '',
      course_id: '' as `${string}-${string}-${string}-${string}-${string}`,
      blooms_level: undefined,
    },
  });

  // eslint-disable-next-line react-hooks/incompatible-library
  const watchedBloomsLevel = form.watch('blooms_level');

  const handleVerbClick = (verb: string) => {
    const currentTitle = form.getValues('title');
    const capitalizedVerb = verb.charAt(0).toUpperCase() + verb.slice(1);
    form.setValue('title', currentTitle ? `${capitalizedVerb} ${currentTitle}` : capitalizedVerb, {
      shouldValidate: true,
    });
  };

  const onSubmit = (data: CreateCLOFormData) => {
    createMutation.mutate(data, {
      onSuccess: (clo) => {
        toast.success('CLO created successfully');
        navigate(`/teacher/clos/${clo.id}/edit`);
      },
      onError: (err) => toast.error(err.message),
    });
  };

  return (
    <Card className="bg-white border-0 shadow-md rounded-xl p-6 max-w-2xl">
      <h2 className="text-lg font-bold tracking-tight mb-4">CLO Details</h2>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g. Analyze data structures for algorithmic efficiency"
                    maxLength={255}
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
                    placeholder="Describe this course learning outcome..."
                    className="min-h-[100px] resize-y"
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
                  disabled={isLoadingCourses}
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

          <FormField
            control={form.control}
            name="blooms_level"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bloom&apos;s Taxonomy Level</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Select Bloom's level" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {BLOOMS_LEVELS.map((level) => (
                      <SelectItem key={level.value} value={level.value}>
                        <span className="flex items-center gap-2">
                          <span className={`inline-block h-2.5 w-2.5 rounded-full ${level.color}`} />
                          {level.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <BloomsVerbGuide selectedLevel={watchedBloomsLevel} onVerbClick={handleVerbClick} />

          <div className="flex items-center gap-3 pt-2">
            <Button
              type="submit"
              disabled={createMutation.isPending}
              className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95 text-white"
            >
              {createMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Create CLO
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/teacher/clos')}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Form>
    </Card>
  );
};

// ─── CLO Details Form (Edit) ────────────────────────────────────────────────

const EditCLODetailsForm = ({ cloId }: { cloId: string }) => {
  const navigate = useNavigate();
  const { data: existingCLO, isLoading } = useCLO(cloId);
  const updateMutation = useUpdateCLO(cloId);

  const form = useForm<CreateCLOFormData>({
    resolver: zodResolver(createCLOSchema),
    defaultValues: {
      title: '',
      description: '',
      course_id: '' as `${string}-${string}-${string}-${string}-${string}`,
      blooms_level: undefined,
    },
  });

  useEffect(() => {
    if (existingCLO) {
      const clo = existingCLO as unknown as LearningOutcome;
      form.reset({
        title: clo.title,
        description: clo.description ?? '',
        course_id: (clo.course_id ?? '') as `${string}-${string}-${string}-${string}-${string}`,
        blooms_level: (clo.blooms_level?.toLowerCase() ?? undefined) as BloomsLevel | undefined,
      });
    }
  }, [existingCLO, form]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const onSubmit = (data: CreateCLOFormData) => {
    updateMutation.mutate(data, {
      onSuccess: () => toast.success('CLO updated successfully'),
      onError: (err) => toast.error(err.message),
    });
  };

  // eslint-disable-next-line react-hooks/incompatible-library
  const currentBloomsLevel = form.watch('blooms_level');
  const bloomsConfig = BLOOMS_LEVELS.find((l) => l.value === currentBloomsLevel);

  const handleVerbClick = (verb: string) => {
    const currentTitle = form.getValues('title');
    const capitalizedVerb = verb.charAt(0).toUpperCase() + verb.slice(1);
    form.setValue('title', currentTitle ? `${capitalizedVerb} ${currentTitle}` : capitalizedVerb, {
      shouldValidate: true,
    });
  };

  return (
    <Card className="bg-white border-0 shadow-md rounded-xl p-6 max-w-2xl">
      <h2 className="text-lg font-bold tracking-tight mb-4">CLO Details</h2>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g. Analyze data structures for algorithmic efficiency"
                    maxLength={255}
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
                    placeholder="Describe this course learning outcome..."
                    className="min-h-[100px] resize-y"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Course is read-only in edit mode */}
          <div className="grid gap-2">
            <label className="text-sm font-medium">Course</label>
            <Input
              value={
                (existingCLO as unknown as LearningOutcome)?.course_id ?? ''
              }
              disabled
              className="bg-gray-50"
            />
            <p className="text-sm text-muted-foreground">
              Course cannot be changed after creation.
            </p>
          </div>

          <FormField
            control={form.control}
            name="blooms_level"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bloom&apos;s Taxonomy Level</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Select Bloom's level" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {BLOOMS_LEVELS.map((level) => (
                      <SelectItem key={level.value} value={level.value}>
                        <span className="flex items-center gap-2">
                          <span className={`inline-block h-2.5 w-2.5 rounded-full ${level.color}`} />
                          {level.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {bloomsConfig && (
                  <div className="mt-1">
                    <Badge className={`${bloomsConfig.color} text-white text-xs`}>
                      {bloomsConfig.label}
                    </Badge>
                  </div>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          <BloomsVerbGuide selectedLevel={currentBloomsLevel} onVerbClick={handleVerbClick} />

          <div className="flex items-center gap-3 pt-2">
            <Button
              type="submit"
              disabled={updateMutation.isPending}
              className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95 text-white"
            >
              {updateMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Update CLO
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/teacher/clos')}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Form>
    </Card>
  );
};

// ─── PLO Mapping Section ────────────────────────────────────────────────────

const PLOMappingSection = ({ cloId, programId }: { cloId: string; programId: string | undefined }) => {
  const { data: plos = [], isLoading: isLoadingPLOs } = usePLOs(programId);
  const { data: existingMappings = [], isLoading: isLoadingMappings } =
    useCLOMappings(cloId);
  const updateMappingsMutation = useUpdateCLOMappings();

  const [overrides, setOverrides] = useState<
    Record<string, { weight: number; enabled: boolean }>
  >({});

  // Derive display mappings from server data + user overrides
  const mappings = useMemo((): PLOMappingEntry[] => {
    if (plos.length === 0) return [];
    return plos.map((plo) => {
      const override = overrides[plo.id];
      if (override) {
        return { plo_id: plo.id, weight: override.weight, enabled: override.enabled };
      }
      const existing = existingMappings.find(
        (m) => m.parent_outcome_id === plo.id,
      );
      return {
        plo_id: plo.id,
        weight: existing ? existing.weight : 0,
        enabled: !!existing,
      };
    });
  }, [plos, existingMappings, overrides]);

  const totalWeight = useMemo(
    () =>
      mappings
        .filter((m) => m.enabled)
        .reduce((sum, m) => sum + m.weight, 0),
    [mappings],
  );

  const weightStatus = useMemo(() => {
    if (totalWeight > 1.0) return 'over';
    if (totalWeight < 0.5) return 'under';
    return 'ok';
  }, [totalWeight]);

  const handleToggle = (ploId: string) => {
    const current = mappings.find((m) => m.plo_id === ploId);
    const wasEnabled = current?.enabled ?? false;
    setOverrides((prev) => ({
      ...prev,
      [ploId]: {
        weight: wasEnabled ? 0 : 0.1,
        enabled: !wasEnabled,
      },
    }));
  };

  const handleWeightChange = (ploId: string, value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;
    const clamped = Math.min(1.0, Math.max(0, numValue));
    const current = mappings.find((m) => m.plo_id === ploId);
    setOverrides((prev) => ({
      ...prev,
      [ploId]: {
        weight: clamped,
        enabled: current?.enabled ?? false,
      },
    }));
  };

  const handleSaveMappings = () => {
    const activeMappings = mappings
      .filter((m) => m.enabled && m.weight > 0)
      .map((m) => ({
        parent_outcome_id: m.plo_id,
        weight: m.weight,
      }));

    updateMappingsMutation.mutate(
      { cloId, mappings: activeMappings },
      {
        onSuccess: () => {
          toast.success('PLO mappings saved successfully');
          if (weightStatus === 'under') {
            toast.warning(
              'Total PLO mapping weight is below 0.5. Consider adjusting weights for better outcome coverage.',
            );
          } else if (weightStatus === 'over') {
            toast.warning(
              'Total PLO mapping weight exceeds 1.0. Consider reducing weights.',
            );
          }
        },
        onError: (err) => toast.error(err.message),
      },
    );
  };

  if (!programId) {
    return (
      <Card className="bg-white border-0 shadow-md rounded-xl p-6 max-w-2xl">
        <h2 className="text-lg font-bold tracking-tight mb-2">PLO Mappings</h2>
        <p className="text-sm text-gray-500">
          Unable to determine the program for this course. PLO mappings are unavailable.
        </p>
      </Card>
    );
  }

  if (isLoadingPLOs || isLoadingMappings) {
    return (
      <Card className="bg-white border-0 shadow-md rounded-xl p-6 max-w-2xl">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        </div>
      </Card>
    );
  }

  if (plos.length === 0) {
    return (
      <Card className="bg-white border-0 shadow-md rounded-xl p-6 max-w-2xl">
        <h2 className="text-lg font-bold tracking-tight mb-2">PLO Mappings</h2>
        <p className="text-sm text-gray-500">
          No PLOs have been created for this program yet. Ask your coordinator to create PLOs first.
        </p>
      </Card>
    );
  }

  return (
    <Card className="bg-white border-0 shadow-md rounded-xl p-6 max-w-2xl">
      <div className="flex items-center gap-2 mb-4">
        <Link2 className="h-5 w-5 text-blue-600" />
        <h2 className="text-lg font-bold tracking-tight">PLO Mappings</h2>
      </div>

      <p className="text-sm text-gray-500 mb-4">
        Map this CLO to one or more PLOs and assign weights (0.0–1.0).
      </p>

      <div className="space-y-3">
        {plos.map((plo) => {
          const mapping = mappings.find((m) => m.plo_id === plo.id);
          const isEnabled = mapping?.enabled ?? false;

          return (
            <div
              key={plo.id}
              className={`flex items-center gap-4 p-3 rounded-lg border transition-colors ${
                isEnabled
                  ? 'border-blue-200 bg-blue-50/50'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <button
                type="button"
                onClick={() => handleToggle(plo.id)}
                className={`shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                  isEnabled
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'border-gray-300 bg-white'
                }`}
                aria-label={`Toggle mapping for ${plo.title}`}
              >
                {isEnabled && (
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={3}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </button>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{plo.title}</p>
                {plo.description && (
                  <p className="text-xs text-gray-500 truncate">
                    {plo.description}
                  </p>
                )}
              </div>

              <div className="shrink-0 w-24">
                <Input
                  type="number"
                  min={0}
                  max={1}
                  step={0.1}
                  value={mapping?.weight ?? 0}
                  onChange={(e) => handleWeightChange(plo.id, e.target.value)}
                  disabled={!isEnabled}
                  className="text-center text-sm h-8"
                  aria-label={`Weight for ${plo.title}`}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Weight total indicator */}
      <div className="mt-4 flex items-center gap-2">
        <span className="text-sm font-medium text-gray-600">Total Weight:</span>
        <Badge
          className={
            weightStatus === 'ok'
              ? 'bg-green-100 text-green-700'
              : weightStatus === 'under'
                ? 'bg-amber-100 text-amber-700'
                : 'bg-red-100 text-red-700'
          }
        >
          {totalWeight.toFixed(1)}
        </Badge>
        {weightStatus === 'under' && (
          <span className="flex items-center gap-1 text-xs text-amber-600">
            <AlertTriangle className="h-3 w-3" />
            Sum is below 0.5
          </span>
        )}
        {weightStatus === 'over' && (
          <span className="flex items-center gap-1 text-xs text-red-600">
            <AlertTriangle className="h-3 w-3" />
            Sum exceeds 1.0
          </span>
        )}
      </div>

      <div className="mt-4 pt-4 border-t">
        <Button
          type="button"
          onClick={handleSaveMappings}
          disabled={updateMappingsMutation.isPending}
          className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95 text-white"
        >
          {updateMappingsMutation.isPending && (
            <Loader2 className="h-4 w-4 animate-spin" />
          )}
          Save Mappings
        </Button>
      </div>
    </Card>
  );
};

// ─── Main page component ─────────────────────────────────────────────────────

const CLOForm = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditMode = !!id;

  // In edit mode, fetch the CLO to resolve its course → program for PLO mapping
  const { data: existingCLO } = useCLO(id);
  const { data: courses = [] } = useCourses();

  // Resolve program_id from the CLO's course
  const programId = useMemo(() => {
    if (!existingCLO) return undefined;
    const clo = existingCLO as unknown as LearningOutcome;
    const course = courses.find((c) => c.id === clo.course_id);
    return course?.program_id;
  }, [existingCLO, courses]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/teacher/clos')}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">
          {isEditMode ? 'Edit CLO' : 'Create CLO'}
        </h1>
      </div>

      {isEditMode ? (
        <>
          <EditCLODetailsForm cloId={id} />
          <PLOMappingSection cloId={id} programId={programId} />
        </>
      ) : (
        <CreateCLODetailsForm />
      )}
    </div>
  );
};

export default CLOForm;

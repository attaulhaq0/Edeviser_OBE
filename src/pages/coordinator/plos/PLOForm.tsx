import { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams } from 'react-router-dom';
import { createPLOSchema, type CreatePLOFormData } from '@/lib/schemas/plo';
import {
  useCreatePLO,
  useUpdatePLO,
  usePLO,
  usePLOMappings,
  useUpdatePLOMappings,
} from '@/hooks/usePLOs';
import { useILOs } from '@/hooks/useILOs';
import { usePrograms } from '@/hooks/usePrograms';
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
import type { LearningOutcome } from '@/types/app';

// ─── ILO Mapping types ──────────────────────────────────────────────────────

interface ILOMappingEntry {
  ilo_id: string;
  weight: number;
  enabled: boolean;
}

// ─── PLO Details Form (Create) ──────────────────────────────────────────────

const CreatePLODetailsForm = () => {
  const navigate = useNavigate();
  const createMutation = useCreatePLO();
  const { data: programs = [], isLoading: isLoadingPrograms } = usePrograms();

  const form = useForm<CreatePLOFormData>({
    resolver: zodResolver(createPLOSchema),
    defaultValues: {
      title: '',
      description: '',
      program_id: '' as `${string}-${string}-${string}-${string}-${string}`,
    },
  });

  const onSubmit = (data: CreatePLOFormData) => {
    createMutation.mutate(data, {
      onSuccess: (plo) => {
        toast.success('PLO created successfully');
        // Navigate to edit page so user can add ILO mappings
        navigate(`/coordinator/plos/${plo.id}/edit`);
      },
      onError: (err) => toast.error(err.message),
    });
  };

  return (
    <Card className="bg-white border-0 shadow-md rounded-xl p-6 max-w-2xl">
      <h2 className="text-lg font-bold tracking-tight mb-4">PLO Details</h2>
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
                    placeholder="e.g. Apply engineering principles to solve problems"
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
                    placeholder="Describe this program learning outcome..."
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
            name="program_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Program</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  disabled={isLoadingPrograms}
                >
                  <FormControl>
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Select a program" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {programs.map((program) => (
                      <SelectItem key={program.id} value={program.id}>
                        {program.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex items-center gap-3 pt-2">
            <Button
              type="submit"
              disabled={createMutation.isPending}
              className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95 text-white"
            >
              {createMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Create PLO
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/coordinator/plos')}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Form>
    </Card>
  );
};

// ─── PLO Details Form (Edit) ────────────────────────────────────────────────

const EditPLODetailsForm = ({ ploId }: { ploId: string }) => {
  const navigate = useNavigate();
  const { data: existingPLO, isLoading } = usePLO(ploId);
  const updateMutation = useUpdatePLO(ploId);

  const form = useForm<CreatePLOFormData>({
    resolver: zodResolver(createPLOSchema),
    defaultValues: {
      title: '',
      description: '',
      program_id: '' as `${string}-${string}-${string}-${string}-${string}`,
    },
  });

  useEffect(() => {
    if (existingPLO) {
      const plo = existingPLO as unknown as LearningOutcome;
      form.reset({
        title: plo.title,
        description: plo.description ?? '',
        program_id: (plo.program_id ?? '') as `${string}-${string}-${string}-${string}-${string}`,
      });
    }
  }, [existingPLO, form]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const onSubmit = (data: CreatePLOFormData) => {
    updateMutation.mutate(data, {
      onSuccess: () => {
        toast.success('PLO updated successfully');
      },
      onError: (err) => toast.error(err.message),
    });
  };

  return (
    <Card className="bg-white border-0 shadow-md rounded-xl p-6 max-w-2xl">
      <h2 className="text-lg font-bold tracking-tight mb-4">PLO Details</h2>
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
                    placeholder="e.g. Apply engineering principles to solve problems"
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
                    placeholder="Describe this program learning outcome..."
                    className="min-h-[100px] resize-y"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Program is read-only in edit mode */}
          <div className="grid gap-2">
            <label className="text-sm font-medium">Program</label>
            <Input
              value={
                (existingPLO as unknown as LearningOutcome)?.program_id ?? ''
              }
              disabled
              className="bg-gray-50"
            />
            <p className="text-sm text-muted-foreground">
              Program cannot be changed after creation.
            </p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <Button
              type="submit"
              disabled={updateMutation.isPending}
              className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95 text-white"
            >
              {updateMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Update PLO
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/coordinator/plos')}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Form>
    </Card>
  );
};

// ─── ILO Mapping Section ────────────────────────────────────────────────────

const ILOMappingSection = ({ ploId }: { ploId: string }) => {
  const { data: ilos = [], isLoading: isLoadingILOs } = useILOs();
  const { data: existingMappings = [], isLoading: isLoadingMappings } =
    usePLOMappings(ploId);
  const updateMappingsMutation = useUpdatePLOMappings();

  // Track user overrides keyed by ilo_id
  const [overrides, setOverrides] = useState<
    Record<string, { weight: number; enabled: boolean }>
  >({});

  // Derive display mappings from server data + user overrides
  const mappings = useMemo((): ILOMappingEntry[] => {
    if (ilos.length === 0) return [];
    return ilos.map((ilo) => {
      const override = overrides[ilo.id];
      if (override) {
        return { ilo_id: ilo.id, weight: override.weight, enabled: override.enabled };
      }
      const existing = existingMappings.find(
        (m) => m.parent_outcome_id === ilo.id,
      );
      return {
        ilo_id: ilo.id,
        weight: existing ? existing.weight : 0,
        enabled: !!existing,
      };
    });
  }, [ilos, existingMappings, overrides]);

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

  const handleToggle = (iloId: string) => {
    const current = mappings.find((m) => m.ilo_id === iloId);
    const wasEnabled = current?.enabled ?? false;
    setOverrides((prev) => ({
      ...prev,
      [iloId]: {
        weight: wasEnabled ? 0 : 0.1,
        enabled: !wasEnabled,
      },
    }));
  };

  const handleWeightChange = (iloId: string, value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;
    const clamped = Math.min(1.0, Math.max(0, numValue));
    const current = mappings.find((m) => m.ilo_id === iloId);
    setOverrides((prev) => ({
      ...prev,
      [iloId]: {
        weight: clamped,
        enabled: current?.enabled ?? false,
      },
    }));
  };

  const handleSaveMappings = () => {
    const activeMappings = mappings
      .filter((m) => m.enabled && m.weight > 0)
      .map((m) => ({
        parent_outcome_id: m.ilo_id,
        weight: m.weight,
      }));

    updateMappingsMutation.mutate(
      { ploId, mappings: activeMappings },
      {
        onSuccess: () => {
          toast.success('ILO mappings saved successfully');
          if (weightStatus === 'under') {
            toast.warning(
              'Total ILO mapping weight is below 0.5. Consider adjusting weights for better outcome coverage.',
            );
          } else if (weightStatus === 'over') {
            toast.warning(
              'Total ILO mapping weight exceeds 1.0. Consider reducing weights.',
            );
          }
        },
        onError: (err) => toast.error(err.message),
      },
    );
  };

  if (isLoadingILOs || isLoadingMappings) {
    return (
      <Card className="bg-white border-0 shadow-md rounded-xl p-6 max-w-2xl">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        </div>
      </Card>
    );
  }

  if (ilos.length === 0) {
    return (
      <Card className="bg-white border-0 shadow-md rounded-xl p-6 max-w-2xl">
        <h2 className="text-lg font-bold tracking-tight mb-2">ILO Mappings</h2>
        <p className="text-sm text-gray-500">
          No ILOs have been created yet. Ask your admin to create ILOs first.
        </p>
      </Card>
    );
  }

  return (
    <Card className="bg-white border-0 shadow-md rounded-xl p-6 max-w-2xl">
      <div className="flex items-center gap-2 mb-4">
        <Link2 className="h-5 w-5 text-blue-600" />
        <h2 className="text-lg font-bold tracking-tight">ILO Mappings</h2>
      </div>

      <p className="text-sm text-gray-500 mb-4">
        Map this PLO to one or more ILOs and assign weights (0.0–1.0).
      </p>

      <div className="space-y-3">
        {ilos.map((ilo) => {
          const mapping = mappings.find((m) => m.ilo_id === ilo.id);
          const isEnabled = mapping?.enabled ?? false;

          return (
            <div
              key={ilo.id}
              className={`flex items-center gap-4 p-3 rounded-lg border transition-colors ${
                isEnabled
                  ? 'border-blue-200 bg-blue-50/50'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <button
                type="button"
                onClick={() => handleToggle(ilo.id)}
                className={`shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                  isEnabled
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'border-gray-300 bg-white'
                }`}
                aria-label={`Toggle mapping for ${ilo.title}`}
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
                <p className="text-sm font-medium truncate">{ilo.title}</p>
                {ilo.description && (
                  <p className="text-xs text-gray-500 truncate">
                    {ilo.description}
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
                  onChange={(e) => handleWeightChange(ilo.id, e.target.value)}
                  disabled={!isEnabled}
                  className="text-center text-sm h-8"
                  aria-label={`Weight for ${ilo.title}`}
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

const PLOForm = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditMode = !!id;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/coordinator/plos')}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">
          {isEditMode ? 'Edit PLO' : 'Create PLO'}
        </h1>
      </div>

      {isEditMode ? (
        <>
          <EditPLODetailsForm ploId={id} />
          <ILOMappingSection ploId={id} />
        </>
      ) : (
        <CreatePLODetailsForm />
      )}
    </div>
  );
};

export default PLOForm;

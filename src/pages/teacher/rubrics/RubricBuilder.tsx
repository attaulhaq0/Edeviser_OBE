import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCLOs } from '@/hooks/useCLOs';
import {
  useRubric,
  useCreateRubric,
  useUpdateRubric,
} from '@/hooks/useRubrics';
import RubricPreview from '@/components/shared/RubricPreview';

// ─── Schema for the top-level form fields ───────────────────────────────────

const rubricMetaSchema = z.object({
  title: z.string().min(1, 'Rubric title is required').max(255),
  clo_id: z.string().min(1, 'CLO is required'),
  is_template: z.boolean(),
});

type RubricMetaFormData = z.infer<typeof rubricMetaSchema>;

// ─── Criterion state managed outside React Hook Form ────────────────────────

interface LevelState {
  label: string;
  description: string;
  points: number;
}

interface CriterionState {
  criterion_name: string;
  levels: LevelState[];
}

const DEFAULT_LEVELS: LevelState[] = [
  { label: 'Developing', description: '', points: 1 },
  { label: 'Proficient', description: '', points: 3 },
];

const createDefaultCriterion = (levelCount: number): CriterionState => ({
  criterion_name: '',
  levels: Array.from({ length: levelCount }, (_, i): LevelState => {
    const def = DEFAULT_LEVELS[i];
    if (def) return { label: def.label, description: def.description, points: def.points };
    return { label: `Level ${i + 1}`, description: '', points: 0 };
  }),
});

// ─── Component ──────────────────────────────────────────────────────────────

const RubricBuilder = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const { data: clos } = useCLOs();
  const { data: existingRubric, isLoading: isLoadingRubric } = useRubric(id);

  const createMutation = useCreateRubric();
  const updateMutation = useUpdateRubric(id ?? '');
  const isPending = createMutation.isPending || updateMutation.isPending;

  // Track whether we've already seeded from the existing rubric
  const seededRef = useRef(false);

  // Preview toggle
  const [showPreview, setShowPreview] = useState(false);

  // ─── Criteria state (managed imperatively) ──────────────────────────────

  const [criteria, setCriteria] = useState<CriterionState[]>([
    createDefaultCriterion(2),
    createDefaultCriterion(2),
  ]);

  // ─── React Hook Form for meta fields ────────────────────────────────────

  const form = useForm<RubricMetaFormData>({
    resolver: zodResolver(rubricMetaSchema),
    defaultValues: { title: '', clo_id: '', is_template: false },
  });

  // Seed form + criteria from existing rubric once data arrives
  useEffect(() => {
    if (!existingRubric || seededRef.current) return;
    seededRef.current = true;

    form.reset({
      title: existingRubric.title,
      clo_id: existingRubric.clo_id,
      is_template: existingRubric.is_template,
    });

    if (existingRubric.criteria.length > 0) {
      const mapped: CriterionState[] = existingRubric.criteria.map((c) => ({
        criterion_name: c.criterion_name,
        levels: c.levels.map((l): LevelState => ({
          label: String(l.label ?? ''),
          description: String(l.description ?? ''),
          points: Number(l.points ?? 0),
        })),
      }));
      setCriteria(mapped);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingRubric]);

  // ─── Derived values ─────────────────────────────────────────────────────

  const firstCriterion = criteria[0];
  const levelCount = firstCriterion ? firstCriterion.levels.length : 2;

  const criteriaMaxPoints = useMemo(
    () =>
      criteria.map((c) =>
        c.levels.reduce((max, l) => Math.max(max, l.points), 0),
      ),
    [criteria],
  );

  const totalScore = useMemo(
    () => criteriaMaxPoints.reduce((sum, mp) => sum + mp, 0),
    [criteriaMaxPoints],
  );

  // Build a RubricWithCriteria object for the preview component
  const previewRubric = useMemo(() => ({
    id: id ?? 'preview',
    title: form.getValues('title') || 'Untitled Rubric',
    clo_id: form.getValues('clo_id') || '',
    is_template: form.getValues('is_template') || false,
    created_at: '',
    updated_at: '',
    criteria: criteria.map((c, idx) => ({
      id: `preview-criterion-${idx}`,
      rubric_id: id ?? 'preview',
      criterion_name: c.criterion_name || `Criterion ${idx + 1}`,
      sort_order: idx,
      levels: c.levels,
      max_points: c.levels.reduce((max, l) => Math.max(max, l.points), 0),
    })),
  }), [criteria, id, form]);

  // ─── Grid mutation helpers ──────────────────────────────────────────────

  const updateCriterionName = useCallback(
    (rowIdx: number, name: string) => {
      setCriteria((prev) => {
        const next = prev.map((c) => ({ ...c, levels: c.levels.map((l) => ({ ...l })) }));
        const row = next[rowIdx];
        if (row) row.criterion_name = name;
        return next;
      });
    },
    [],
  );

  const updateLevel = useCallback(
    (rowIdx: number, colIdx: number, field: keyof LevelState, value: string | number) => {
      setCriteria((prev) => {
        const next = prev.map((c) => ({ ...c, levels: c.levels.map((l) => ({ ...l })) }));
        const row = next[rowIdx];
        const level = row?.levels[colIdx];
        if (level) {
          (level as Record<string, unknown>)[field] = value;
        }
        return next;
      });
    },
    [],
  );

  const addCriterion = useCallback(() => {
    setCriteria((prev) => {
      const count = prev[0] ? prev[0].levels.length : 2;
      return [...prev, createDefaultCriterion(count)];
    });
  }, []);

  const removeCriterion = useCallback((idx: number) => {
    setCriteria((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const addLevel = useCallback(() => {
    setCriteria((prev) =>
      prev.map((c) => ({
        ...c,
        levels: [...c.levels, { label: `Level ${c.levels.length + 1}`, description: '', points: 0 }],
      })),
    );
  }, []);

  const removeLevel = useCallback((colIdx: number) => {
    setCriteria((prev) =>
      prev.map((c) => ({
        ...c,
        levels: c.levels.filter((_, i) => i !== colIdx),
      })),
    );
  }, []);

  const updateLevelLabel = useCallback(
    (colIdx: number, label: string) => {
      setCriteria((prev) =>
        prev.map((c) => ({
          ...c,
          levels: c.levels.map((l, i) => (i === colIdx ? { ...l, label } : l)),
        })),
      );
    },
    [],
  );

  // ─── Submit handler ─────────────────────────────────────────────────────

  const onSubmit = (meta: RubricMetaFormData) => {
    if (criteria.length < 2) {
      toast.error('At least 2 criteria are required');
      return;
    }
    if (!firstCriterion || firstCriterion.levels.length < 2) {
      toast.error('At least 2 performance levels are required');
      return;
    }

    const hasEmptyName = criteria.some((c) => !c.criterion_name.trim());
    if (hasEmptyName) {
      toast.error('All criteria must have a name');
      return;
    }

    const hasEmptyLevelLabel = criteria.some((c) =>
      c.levels.some((l) => !l.label.trim()),
    );
    if (hasEmptyLevelLabel) {
      toast.error('All performance levels must have a label');
      return;
    }

    const payload = {
      title: meta.title,
      clo_id: meta.clo_id,
      is_template: meta.is_template,
      criteria: criteria.map((c, idx) => ({
        criterion_name: c.criterion_name,
        sort_order: idx,
        levels: c.levels,
        max_points: c.levels.reduce((max, l) => Math.max(max, l.points), 0),
      })),
    };

    const mutation = isEdit ? updateMutation : createMutation;
    mutation.mutate(payload, {
      onSuccess: () => {
        toast.success(isEdit ? 'Rubric updated' : 'Rubric created');
        navigate('/teacher/rubrics');
      },
      onError: (err) => toast.error(err.message),
    });
  };

  // ─── Render ─────────────────────────────────────────────────────────────

  if (isEdit && isLoadingRubric) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Level labels from the first criterion (shared across all rows)
  const levelLabels = firstCriterion
    ? firstCriterion.levels.map((l) => l.label)
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/teacher/rubrics')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">
          {isEdit ? 'Edit Rubric' : 'Create Rubric'}
        </h1>
        <div className="ml-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowPreview((prev) => !prev)}
          >
            {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showPreview ? 'Hide Preview' : 'Preview'}
          </Button>
        </div>
      </div>

      {/* Meta form */}
      <Card className="bg-white border-0 shadow-md rounded-xl p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rubric Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Essay Rubric" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="clo_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Linked CLO</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a CLO" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(clos ?? []).map((clo) => (
                          <SelectItem key={clo.id} value={clo.id}>
                            {clo.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="is_template"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2">
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={field.onChange}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </FormControl>
                  <FormLabel className="!mt-0 text-sm font-medium">
                    Save as reusable template
                  </FormLabel>
                </FormItem>
              )}
            />

            {/* Criteria / Levels Grid */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold tracking-tight">
                  Criteria &amp; Performance Levels
                </h2>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={addLevel}>
                    <Plus className="h-4 w-4" /> Level
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={addCriterion}>
                    <Plus className="h-4 w-4" /> Criterion
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="p-2 text-left text-xs font-bold uppercase tracking-wider text-gray-500 w-48 min-w-[12rem]">
                        Criterion
                      </th>
                      {levelLabels.map((label, colIdx) => (
                        <th key={colIdx} className="p-2 text-center min-w-[10rem]">
                          <div className="flex items-center justify-center gap-1">
                            <Input
                              value={label}
                              onChange={(e) => updateLevelLabel(colIdx, e.target.value)}
                              className="text-center text-xs font-bold h-8 max-w-[8rem]"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                              disabled={levelCount <= 2}
                              onClick={() => removeLevel(colIdx)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </th>
                      ))}
                      <th className="p-2 text-center text-xs font-bold uppercase tracking-wider text-gray-500 w-20">
                        Max
                      </th>
                      <th className="w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {criteria.map((criterion, rowIdx) => (
                      <tr key={rowIdx} className="border-t border-slate-200">
                        <td className="p-2 align-top">
                          <Input
                            value={criterion.criterion_name}
                            onChange={(e) => updateCriterionName(rowIdx, e.target.value)}
                            placeholder={`Criterion ${rowIdx + 1}`}
                            className="text-sm"
                          />
                        </td>
                        {criterion.levels.map((level, colIdx) => (
                          <td key={colIdx} className="p-2 align-top">
                            <div className="space-y-1">
                              <Textarea
                                value={level.description}
                                onChange={(e) => updateLevel(rowIdx, colIdx, 'description', e.target.value)}
                                placeholder="Description..."
                                className="text-xs min-h-[4rem] resize-none"
                                rows={3}
                              />
                              <Input
                                type="number"
                                min={0}
                                value={level.points}
                                onChange={(e) => updateLevel(rowIdx, colIdx, 'points', Number(e.target.value) || 0)}
                                className="h-8 text-xs text-center w-20"
                                placeholder="Pts"
                              />
                            </div>
                          </td>
                        ))}
                        <td className="p-2 align-top text-center">
                          <span className="text-sm font-bold text-gray-700">
                            {criteriaMaxPoints[rowIdx] ?? 0}
                          </span>
                        </td>
                        <td className="p-2 align-top">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-gray-400 hover:text-red-500"
                            disabled={criteria.length <= 2}
                            onClick={() => removeCriterion(rowIdx)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-300">
                      <td
                        className="p-2 text-right text-sm font-bold text-gray-700"
                        colSpan={levelCount + 1}
                      >
                        Total Score
                      </td>
                      <td className="p-2 text-center">
                        <span className="text-lg font-black text-blue-600">{totalScore}</span>
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Submit */}
            <div className="flex items-center gap-3 pt-4">
              <Button
                type="submit"
                disabled={isPending}
                className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95"
              >
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {isEdit ? 'Update Rubric' : 'Create Rubric'}
              </Button>
              <Button type="button" variant="outline" onClick={() => navigate('/teacher/rubrics')}>
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      </Card>

      {/* Rubric Preview */}
      {showPreview && <RubricPreview rubric={previewRubric} />}
    </div>
  );
};

export default RubricBuilder;

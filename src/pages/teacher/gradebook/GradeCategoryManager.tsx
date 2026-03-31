// =============================================================================
// GradeCategoryManager — Define weighted grade categories for a course
// =============================================================================

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  useGradeCategories,
  useCreateGradeCategory,
  useUpdateGradeCategory,
  useDeleteGradeCategory,
} from '@/hooks/useGradebook';
import type { GradeCategory } from '@/hooks/useGradebook';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Loader2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Schema ─────────────────────────────────────────────────────────────────

const categoryFormSchema = z.object({
  name: z.string().min(1, 'Category name is required').max(100),
  weight_percent: z
    .number()
    .min(1, 'Weight must be at least 1%')
    .max(100, 'Weight cannot exceed 100%'),
});

type CategoryFormValues = z.infer<typeof categoryFormSchema>;

// ─── Props ──────────────────────────────────────────────────────────────────

interface GradeCategoryManagerProps {
  courseId: string;
}

// ─── Component ──────────────────────────────────────────────────────────────

const GradeCategoryManager = ({ courseId }: GradeCategoryManagerProps) => {
  const { data: categories = [], isLoading } = useGradeCategories(courseId);
  const createMutation = useCreateGradeCategory();
  const deleteMutation = useDeleteGradeCategory();
  const [editingCategory, setEditingCategory] = useState<GradeCategory | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const totalWeight = useMemo(
    () => categories.reduce((sum, c) => sum + c.weight_percent, 0),
    [categories],
  );

  const remainingWeight = 100 - totalWeight;
  const isBalanced = totalWeight === 100;

  const createForm = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: { name: '', weight_percent: 0 },
  });

  const openCreateDialog = () => {
    createForm.reset({ name: '', weight_percent: Math.max(remainingWeight, 0) });
    setCreateDialogOpen(true);
  };

  const handleCreate = (values: CategoryFormValues) => {
    if (totalWeight + values.weight_percent > 100) {
      createForm.setError('weight_percent', {
        message: `Weight would exceed 100%. Remaining: ${remainingWeight}%`,
      });
      return;
    }

    createMutation.mutate(
      {
        course_id: courseId,
        name: values.name,
        weight_percent: values.weight_percent,
        sort_order: categories.length,
      },
      { onSuccess: () => { setCreateDialogOpen(false); createForm.reset(); } },
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold tracking-tight">Grade Categories</h3>
          <p className="text-xs text-gray-500 mt-1">
            Define weighted categories. Weights must sum to 100%.
          </p>
        </div>
        <Button
          onClick={openCreateDialog}
          size="sm"
          className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95"
          disabled={isBalanced}
        >
          <Plus className="h-4 w-4" /> Add Category
        </Button>
      </div>

      {/* Create dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Grade Category</DialogTitle>
          </DialogHeader>
          <CategoryForm
            form={createForm}
            onSubmit={handleCreate}
            isPending={createMutation.isPending}
            submitLabel="Create"
          />
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      {editingCategory && (
        <EditCategoryDialog
          category={editingCategory}
          categories={categories}
          onClose={() => setEditingCategory(null)}
        />
      )}

      {/* Weight summary bar */}
      <WeightSummaryBar totalWeight={totalWeight} isBalanced={isBalanced} />

      {/* Category list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        </div>
      ) : categories.length === 0 ? (
        <Card className="bg-white border-0 shadow-md rounded-xl p-6 text-center text-gray-500 text-sm">
          No grade categories defined yet. Add categories to start building the gradebook.
        </Card>
      ) : (
        <div className="space-y-2">
          {categories.map((cat) => (
            <CategoryCard
              key={cat.id}
              category={cat}
              onEdit={() => setEditingCategory(cat)}
              onDelete={() => deleteMutation.mutate(cat.id)}
              isDeleting={deleteMutation.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ─── EditCategoryDialog — owns the update hook with a stable id ─────────────

interface EditCategoryDialogProps {
  category: GradeCategory;
  categories: GradeCategory[];
  onClose: () => void;
}

const EditCategoryDialog = ({ category, categories, onClose }: EditCategoryDialogProps) => {
  const updateMutation = useUpdateGradeCategory(category.id);

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: category.name,
      weight_percent: category.weight_percent,
    },
  });

  const otherWeight = categories
    .filter((c) => c.id !== category.id)
    .reduce((sum, c) => sum + c.weight_percent, 0);

  const handleUpdate = (values: CategoryFormValues) => {
    if (otherWeight + values.weight_percent > 100) {
      form.setError('weight_percent', {
        message: `Weight would exceed 100%. Max allowed: ${100 - otherWeight}%`,
      });
      return;
    }

    updateMutation.mutate(
      { name: values.name, weight_percent: values.weight_percent },
      { onSuccess: () => onClose() },
    );
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Category</DialogTitle>
        </DialogHeader>
        <CategoryForm
          form={form}
          onSubmit={handleUpdate}
          isPending={updateMutation.isPending}
          submitLabel="Update"
        />
      </DialogContent>
    </Dialog>
  );
};

// ─── CategoryForm ───────────────────────────────────────────────────────────

interface CategoryFormProps {
  form: ReturnType<typeof useForm<CategoryFormValues>>;
  onSubmit: (values: CategoryFormValues) => void;
  isPending: boolean;
  submitLabel: string;
}

const CategoryForm = ({ form, onSubmit, isPending, submitLabel }: CategoryFormProps) => (
  <Form {...form}>
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Category Name</FormLabel>
            <FormControl>
              <Input placeholder="e.g., Assignments, Quizzes, Midterm" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="weight_percent"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Weight (%)</FormLabel>
            <FormControl>
              <Input
                type="number"
                min={1}
                max={100}
                {...field}
                onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <Button
        type="submit"
        disabled={isPending}
        className="w-full bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95"
      >
        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        {submitLabel}
      </Button>
    </form>
  </Form>
);

// ─── WeightSummaryBar ───────────────────────────────────────────────────────

const WeightSummaryBar = ({
  totalWeight,
  isBalanced,
}: {
  totalWeight: number;
  isBalanced: boolean;
}) => (
  <div className="space-y-1">
    <div className="flex items-center justify-between text-xs">
      <span className="text-gray-500">Total Weight</span>
      <span className={cn('font-bold', isBalanced ? 'text-green-600' : 'text-amber-600')}>
        {totalWeight}%
      </span>
    </div>
    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
      <div
        className={cn(
          'h-full rounded-full transition-all',
          isBalanced ? 'bg-green-500' : totalWeight > 100 ? 'bg-red-500' : 'bg-amber-500',
        )}
        style={{ width: `${Math.min(totalWeight, 100)}%` }}
      />
    </div>
    {!isBalanced && totalWeight > 0 && (
      <div className="flex items-center gap-1 text-xs text-amber-600">
        <AlertTriangle className="h-3 w-3" />
        {totalWeight > 100
          ? `Exceeds 100% by ${totalWeight - 100}%`
          : `${100 - totalWeight}% remaining`}
      </div>
    )}
  </div>
);

// ─── CategoryCard ───────────────────────────────────────────────────────────

interface CategoryCardProps {
  category: GradeCategory;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}

const CategoryCard = ({ category, onEdit, onDelete, isDeleting }: CategoryCardProps) => (
  <Card className="bg-white border-0 shadow-sm rounded-xl p-4 flex items-center justify-between">
    <div className="flex items-center gap-3">
      <Badge variant="secondary" className="text-xs font-bold">
        {category.weight_percent}%
      </Badge>
      <span className="text-sm font-medium">{category.name}</span>
    </div>
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="sm" onClick={onEdit}>
        <Pencil className="h-4 w-4 text-gray-500" />
      </Button>
      <Button variant="ghost" size="sm" onClick={onDelete} disabled={isDeleting}>
        <Trash2 className="h-4 w-4 text-red-500" />
      </Button>
    </div>
  </Card>
);

export default GradeCategoryManager;

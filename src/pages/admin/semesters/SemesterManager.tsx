import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useSemesters,
  useCreateSemester,
  useUpdateSemester,
  useDeleteSemester,
  useToggleSemesterActive,
} from "@/hooks/useSemesters";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import Shimmer from "@/components/shared/Shimmer";
import { NoSemesters } from "@/components/shared/EmptyState";
import { Plus, Pencil, Trash2, Calendar, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Semester } from "@/types/app";

// ─── Schema ──────────────────────────────────────────────────────────────────

const semesterFormSchema = z
  .object({
    name: z.string().min(1, "Semester name is required").max(255),
    code: z.string().min(1, "Semester code is required").max(50),
    start_date: z.string().min(1, "Start date is required"),
    end_date: z.string().min(1, "End date is required"),
    is_active: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (new Date(data.end_date) <= new Date(data.start_date)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End date must be after start date",
        path: ["end_date"],
      });
    }
  });

type SemesterFormData = z.infer<typeof semesterFormSchema>;

// ─── Semester Form Dialog ────────────────────────────────────────────────────

interface SemesterFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  semester?: Semester | null;
  institutionId: string;
}

const SemesterFormDialog = ({
  open,
  onOpenChange,
  semester,
  institutionId,
}: SemesterFormDialogProps) => {
  const isEdit = !!semester;
  const createMutation = useCreateSemester();
  const updateMutation = useUpdateSemester(semester?.id ?? "");

  const form = useForm<SemesterFormData>({
    resolver: zodResolver(semesterFormSchema),
    defaultValues: {
      name: semester?.name ?? "",
      code: isEdit ? semester?.code ?? "" : "",
      start_date: semester?.start_date ?? "",
      end_date: semester?.end_date ?? "",
      is_active: semester?.is_active ?? false,
    },
  });

  const onSubmit = (data: SemesterFormData) => {
    if (isEdit) {
      updateMutation.mutate(data, {
        onSuccess: () => {
          onOpenChange(false);
          form.reset();
        },
      });
    } else {
      createMutation.mutate(
        { ...data, institution_id: institutionId },
        {
          onSuccess: () => {
            onOpenChange(false);
            form.reset();
          },
        }
      );
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Semester" : "Create Semester"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Fall 2025" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Code</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. F25"
                      {...field}
                      disabled={isEdit}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="end_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <FormLabel className="text-sm font-medium">
                    Active Semester
                  </FormLabel>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95 text-white"
              >
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {isEdit ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

// ─── Semester Row ────────────────────────────────────────────────────────────

interface SemesterRowProps {
  semester: Semester;
  onEdit: (semester: Semester) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, is_active: boolean) => void;
  isToggling: boolean;
}

const SemesterRow = ({
  semester,
  onEdit,
  onDelete,
  onToggleActive,
  isToggling,
}: SemesterRowProps) => (
  <Card className="bg-white border-0 shadow-md rounded-xl p-4">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4 min-w-0">
        <div className="p-2 rounded-lg bg-blue-50">
          <Calendar className="h-5 w-5 text-blue-600" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold truncate">{semester.name}</p>
            <Badge variant="outline" className="text-xs">
              {semester.code ?? ""}
            </Badge>
            {semester.is_active && (
              <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">
                Active
              </Badge>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {semester.start_date} — {semester.end_date}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Switch
          checked={semester.is_active}
          onCheckedChange={(checked) => onToggleActive(semester.id, checked)}
          disabled={isToggling}
          aria-label={`Toggle ${semester.name} active status`}
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(semester)}
          aria-label={`Edit ${semester.name}`}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(semester.id)}
          disabled={semester.is_active}
          aria-label={`Delete ${semester.name}`}
        >
          <Trash2 className="h-4 w-4 text-red-500" />
        </Button>
      </div>
    </div>
  </Card>
);

// ─── Semester Manager Page ───────────────────────────────────────────────────

const SemesterManager = () => {
  const { institutionId } = useAuth();
  const { data: semesters, isLoading } = useSemesters();
  const deleteMutation = useDeleteSemester();
  const toggleMutation = useToggleSemesterActive();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSemester, setEditingSemester] = useState<Semester | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const handleEdit = (semester: Semester) => {
    setEditingSemester(semester);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingSemester(null);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setDeleteTarget(id);
  };

  const confirmDelete = () => {
    if (deleteTarget) {
      deleteMutation.mutate(deleteTarget, {
        onSuccess: () => setDeleteTarget(null),
      });
    }
  };

  const handleToggleActive = (id: string, is_active: boolean) => {
    if (!is_active) {
      toast.info("Deactivated semester data preserved as read-only");
    }
    toggleMutation.mutate({ id, is_active });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Semesters</h1>
        <Button
          onClick={handleCreate}
          className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95 text-white"
        >
          <Plus className="h-4 w-4" /> Add Semester
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Shimmer key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : (semesters ?? []).length === 0 ? (
        <NoSemesters />
      ) : (
        <div className="space-y-3">
          {(semesters ?? []).map((semester) => (
            <SemesterRow
              key={semester.id}
              semester={semester}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggleActive={handleToggleActive}
              isToggling={toggleMutation.isPending}
            />
          ))}
        </div>
      )}

      <SemesterFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        semester={editingSemester}
        institutionId={institutionId ?? ""}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open: boolean) => !open && setDeleteTarget(null)}
        title="Delete Semester"
        description="Are you sure you want to delete this semester? This action cannot be undone."
        onConfirm={confirmDelete}
        isPending={deleteMutation.isPending}
      />
    </div>
  );
};

export default SemesterManager;

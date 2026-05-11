import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Trash2, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  useCourseSections,
  useCreateCourseSection,
  useUpdateCourseSection,
  useDeleteCourseSection,
  type CourseSectionWithTeacher,
} from "@/hooks/useCourseSections";
import { useTeachers } from "@/hooks/useCourses";

// ─── Zod Schema ─────────────────────────────────────────────────────────────

const sectionFormSchema = z.object({
  section_code: z
    .string()
    .min(1, "Section code is required")
    .max(10, "Section code must be 10 characters or less"),
  teacher_id: z.string().min(1, "Teacher is required"),
  capacity: z
    .number()
    .int("Capacity must be a whole number")
    .min(1, "Capacity must be at least 1")
    .max(500, "Capacity cannot exceed 500"),
  is_active: z.boolean(),
});

type SectionFormValues = z.infer<typeof sectionFormSchema>;

// ─── Props ──────────────────────────────────────────────────────────────────

interface SectionManagerProps {
  courseId: string;
  courseName?: string;
}

// ─── Component ──────────────────────────────────────────────────────────────

const SectionManager = ({ courseId, courseName }: SectionManagerProps) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSection, setEditingSection] =
    useState<CourseSectionWithTeacher | null>(null);
  const [deleteTarget, setDeleteTarget] =
    useState<CourseSectionWithTeacher | null>(null);

  const { data: sections, isLoading } = useCourseSections(courseId);
  const { data: teachers } = useTeachers();
  const createMutation = useCreateCourseSection();
  const deleteMutation = useDeleteCourseSection();

  const form = useForm<SectionFormValues>({
    resolver: zodResolver(sectionFormSchema),
    defaultValues: {
      section_code: "",
      teacher_id: "",
      capacity: 40,
      is_active: true,
    },
  });

  const openCreateDialog = () => {
    setEditingSection(null);
    form.reset({
      section_code: "",
      teacher_id: "",
      capacity: 40,
      is_active: true,
    });
    setDialogOpen(true);
  };

  const openEditDialog = (section: CourseSectionWithTeacher) => {
    setEditingSection(section);
    form.reset({
      section_code: section.section_code,
      teacher_id: section.teacher_id,
      capacity: section.capacity,
      is_active: section.is_active,
    });
    setDialogOpen(true);
  };

  const handleSubmit = (values: SectionFormValues) => {
    if (editingSection) {
      // Update is handled inside SectionFormDialog — this branch is a no-op
      return;
    } else {
      createMutation.mutate(
        { ...values, course_id: courseId },
        {
          onSuccess: () => {
            toast.success("Section created");
            setDialogOpen(false);
            form.reset();
          },
          onError: (err) => toast.error(err.message),
        }
      );
    }
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success(`Section ${deleteTarget.section_code} deactivated`);
        setDeleteTarget(null);
      },
      onError: (err) => toast.error(err.message),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold tracking-tight">
          Sections{courseName ? ` — ${courseName}` : ""}
        </h3>
        <Button
          size="sm"
          className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95 text-white"
          onClick={openCreateDialog}
        >
          <Plus className="h-4 w-4" /> Add Section
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Shimmer key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : !sections || sections.length === 0 ? (
        <Card className="bg-white border-0 shadow-md rounded-xl p-8 text-center">
          <Users className="h-8 w-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No sections created yet.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {sections.map((section) => (
            <SectionCard
              key={section.id}
              section={section}
              onEdit={() => openEditDialog(section)}
              onDelete={() => setDeleteTarget(section)}
            />
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <SectionFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        form={form}
        teachers={teachers ?? []}
        isEditing={!!editingSection}
        editingSectionId={editingSection?.id}
        courseId={courseId}
        isPending={createMutation.isPending}
        onSubmit={handleSubmit}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        title="Deactivate Section"
        description={`Are you sure you want to deactivate Section ${
          deleteTarget?.section_code ?? ""
        }? Students will remain enrolled but the section will be marked inactive.`}
        variant="destructive"
        confirmLabel="Deactivate"
        isPending={deleteMutation.isPending}
        onConfirm={handleDelete}
      />
    </div>
  );
};

// ─── Section Card ───────────────────────────────────────────────────────────

interface SectionCardProps {
  section: CourseSectionWithTeacher;
  onEdit: () => void;
  onDelete: () => void;
}

const SectionCard = ({ section, onEdit, onDelete }: SectionCardProps) => (
  <Card className="bg-white border-0 shadow-md rounded-xl p-4">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-50 text-blue-600 font-bold text-sm">
          {section.section_code}
        </div>
        <div>
          <p className="text-sm font-medium">
            {section.profiles?.full_name ?? "Unassigned"}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-gray-500">
              Capacity: {section.capacity}
            </span>
            <Badge
              variant="outline"
              className={
                section.is_active
                  ? "bg-green-50 text-green-600 border-green-200 text-xs"
                  : "bg-gray-50 text-gray-500 border-gray-200 text-xs"
              }
            >
              {section.is_active ? "Active" : "Inactive"}
            </Badge>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onEdit}
          aria-label="Edit section"
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          aria-label="Delete section"
        >
          <Trash2 className="h-4 w-4 text-red-500" />
        </Button>
      </div>
    </div>
  </Card>
);

// ─── Section Form Dialog ────────────────────────────────────────────────────

interface SectionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: ReturnType<typeof useForm<SectionFormValues>>;
  teachers: Array<{ id: string; full_name: string }>;
  isEditing: boolean;
  editingSectionId?: string;
  courseId?: string;
  isPending: boolean;
  onSubmit: (values: SectionFormValues) => void;
}

const SectionFormDialog = ({
  open,
  onOpenChange,
  form,
  teachers,
  isEditing,
  editingSectionId,
  courseId: _courseId,
  isPending,
  onSubmit,
}: SectionFormDialogProps) => {
  // For edit mode, we need a separate update mutation
  const updateMutation = useUpdateCourseSection(editingSectionId ?? "");
  const pending = isPending || updateMutation.isPending;

  const handleFormSubmit = (values: SectionFormValues) => {
    if (isEditing && editingSectionId) {
      updateMutation.mutate(values, {
        onSuccess: () => {
          toast.success("Section updated");
          onOpenChange(false);
        },
        onError: (err) => toast.error(err.message),
      });
    } else {
      onSubmit(values);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Section" : "Add Section"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleFormSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="section_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Section Code</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. A, B, C" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="teacher_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teacher</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Select a teacher" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {teachers.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.full_name}
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
              name="capacity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Capacity</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={500}
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.valueAsNumber)}
                      onBlur={field.onBlur}
                      ref={field.ref}
                      name={field.name}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                variant="outline"
                type="button"
                onClick={() => onOpenChange(false)}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={pending}
                className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95 text-white"
              >
                {pending && <Loader2 className="h-4 w-4 animate-spin" />}
                {isEditing ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default SectionManager;
export type { SectionManagerProps };

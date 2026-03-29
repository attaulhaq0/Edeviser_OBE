import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  useDepartments,
  useCreateDepartment,
  useUpdateDepartment,
  useDeleteDepartment,
  type Department,
} from '@/hooks/useDepartments';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import Shimmer from '@/components/shared/Shimmer';
import { Plus, Pencil, Trash2, Building2, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import type { Profile } from '@/types/app';

// ─── Schema ──────────────────────────────────────────────────────────────────

const departmentFormSchema = z.object({
  name: z.string().min(1, 'Department name is required').max(255),
  code: z.string().min(1, 'Department code is required').max(50),
  head_of_department_id: z.string().optional(),
});

type DepartmentFormData = z.infer<typeof departmentFormSchema>;

// ─── Hook: fetch teachers/coordinators for HoD dropdown ──────────────────────

const useStaffMembers = () => {
  return useQuery({
    queryKey: queryKeys.users.list({ role: 'staff_for_hod' }),
    queryFn: async (): Promise<Profile[]> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .in('role', ['teacher', 'coordinator', 'admin'])
        .eq('is_active', true)
        .order('full_name', { ascending: true });
      if (error) throw error;
      return data as Profile[];
    },
    staleTime: 30_000,
  });
};

// ─── Department Form Dialog ──────────────────────────────────────────────────

interface DepartmentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  department?: Department | null;
  institutionId: string;
}

const DepartmentFormDialog = ({ open, onOpenChange, department, institutionId }: DepartmentFormDialogProps) => {
  const isEdit = !!department;
  const createMutation = useCreateDepartment();
  const updateMutation = useUpdateDepartment(department?.id ?? '');
  const { data: staff = [], isLoading: isLoadingStaff } = useStaffMembers();

  const form = useForm<DepartmentFormData>({
    resolver: zodResolver(departmentFormSchema),
    defaultValues: {
      name: department?.name ?? '',
      code: department?.code ?? '',
      head_of_department_id: department?.head_of_department_id ?? undefined,
    },
  });

  const onSubmit = (data: DepartmentFormData) => {
    if (isEdit) {
      updateMutation.mutate(
        {
          name: data.name,
          code: data.code,
          head_of_department_id: data.head_of_department_id || null,
        },
        {
          onSuccess: () => {
            onOpenChange(false);
            form.reset();
          },
        },
      );
    } else {
      createMutation.mutate(
        {
          name: data.name,
          code: data.code,
          institution_id: institutionId,
          head_of_department_id: data.head_of_department_id,
        },
        {
          onSuccess: () => {
            onOpenChange(false);
            form.reset();
          },
        },
      );
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Department' : 'Create Department'}</DialogTitle>
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
                    <Input placeholder="e.g. Computer Science" {...field} />
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
                    <Input placeholder="e.g. CS" {...field} disabled={isEdit} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="head_of_department_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Head of Department</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(value === '__none__' ? undefined : value)}
                    value={field.value ?? '__none__'}
                    disabled={isLoadingStaff}
                  >
                    <FormControl>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Select head of department" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {staff.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95 text-white"
              >
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {isEdit ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

// ─── Department Row ──────────────────────────────────────────────────────────

interface DepartmentRowProps {
  department: Department;
  onEdit: (department: Department) => void;
  onDelete: (id: string) => void;
}

const DepartmentRow = ({ department, onEdit, onDelete }: DepartmentRowProps) => (
  <Card className="bg-white border-0 shadow-md rounded-xl p-4">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4 min-w-0">
        <div className="p-2 rounded-lg bg-blue-50">
          <Building2 className="h-5 w-5 text-blue-600" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold truncate">{department.name}</p>
            <Badge variant="outline" className="text-xs">{department.code}</Badge>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {department.head_of_department_id ? 'HoD assigned' : 'No HoD assigned'}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => onEdit(department)} aria-label={`Edit ${department.name}`}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onDelete(department.id)} aria-label={`Delete ${department.name}`}>
          <Trash2 className="h-4 w-4 text-red-500" />
        </Button>
      </div>
    </div>
  </Card>
);

// ─── Department Manager Page ─────────────────────────────────────────────────

const DepartmentManager = () => {
  const { institutionId } = useAuth();
  const { data: departments, isLoading } = useDepartments();
  const deleteMutation = useDeleteDepartment();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const handleEdit = (department: Department) => {
    setEditingDepartment(department);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingDepartment(null);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Departments</h1>
        <Button
          onClick={handleCreate}
          className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95 text-white"
        >
          <Plus className="h-4 w-4" /> Add Department
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Shimmer key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : (departments ?? []).length === 0 ? (
        <Card className="bg-white border-0 shadow-md rounded-xl p-8 text-center">
          <Building2 className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No departments yet. Create your first department to get started.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {(departments ?? []).map((dept) => (
            <DepartmentRow
              key={dept.id}
              department={dept}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <DepartmentFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        department={editingDepartment}
        institutionId={institutionId ?? ''}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open: boolean) => !open && setDeleteTarget(null)}
        title="Delete Department"
        description="Are you sure you want to delete this department? Deletion is blocked if active programs exist."
        onConfirm={confirmDelete}
        isPending={deleteMutation.isPending}
      />
    </div>
  );
};

export default DepartmentManager;

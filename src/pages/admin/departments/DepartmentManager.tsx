import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Pencil, Plus, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AdminStatCard,
  AdminStatusPill,
  adminCardClass,
  adminPageClass,
} from "@/components/shared/AdminPrototypePrimitives";
import { useCourses } from "@/hooks/useCourses";
import {
  useDepartments,
  useCreateDepartment,
  useDeleteDepartment,
  useUpdateDepartment,
  type Department,
} from "@/hooks/useDepartments";
import { usePrograms } from "@/hooks/usePrograms";
import { useSemesters } from "@/hooks/useSemesters";
import { useAuth } from "@/hooks/useAuth";
import {
  createDepartmentSchema,
  type CreateDepartmentFormData,
} from "@/lib/schemas/department";

const DepartmentManager = () => {
  const navigate = useNavigate();
  const { institutionId } = useAuth();
  const departmentsQuery = useDepartments();
  const programsQuery = usePrograms({ pageSize: 100 });
  const coursesQuery = useCourses({ pageSize: 100 });
  const semestersQuery = useSemesters();
  const createDepartment = useCreateDepartment();
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(
    null
  );
  const [departmentDialogOpen, setDepartmentDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Department | null>(null);
  const updateDepartment = useUpdateDepartment(editingDepartment?.id ?? "");
  const deleteDepartment = useDeleteDepartment();
  const departmentForm = useForm<CreateDepartmentFormData>({
    resolver: zodResolver(createDepartmentSchema),
    defaultValues: { name: "", code: "" },
  });

  const departments = departmentsQuery.data ?? [];
  const programs = useMemo(
    () => programsQuery.data?.data ?? [],
    [programsQuery.data?.data]
  );
  const courses = coursesQuery.data?.data ?? [];
  const semesters = semestersQuery.data ?? [];
  const activeSemester = semesters.find((semester) => semester.is_active);
  const programsByDepartment = useMemo(() => {
    const grouped = new Map<string, typeof programs>();
    for (const program of programs) {
      const key = program.department_id ?? "unassigned";
      grouped.set(key, [...(grouped.get(key) ?? []), program]);
    }
    return grouped;
  }, [programs]);

  const openNewDepartment = () => {
    setEditingDepartment(null);
    departmentForm.reset({ name: "", code: "" });
    setDepartmentDialogOpen(true);
  };

  const openEditDepartment = (department: Department) => {
    setEditingDepartment(department);
    departmentForm.reset({ name: department.name, code: department.code });
    setDepartmentDialogOpen(true);
  };

  const submitDepartment = (values: CreateDepartmentFormData) => {
    if (editingDepartment) {
      updateDepartment.mutate(values, {
        onSuccess: () => setDepartmentDialogOpen(false),
        onError: (error) => toast.error(error.message),
      });
      return;
    }
    if (!institutionId) {
      toast.error("Institution context is not ready");
      return;
    }
    createDepartment.mutate(
      { ...values, institution_id: institutionId },
      {
        onSuccess: () => {
          setDepartmentDialogOpen(false);
          departmentForm.reset({ name: "", code: "" });
        },
      }
    );
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteDepartment.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
    });
  };

  return (
    <div className={adminPageClass}>
      <div>
        <h1 className="text-xl font-black tracking-tight text-slate-900">
          Institution Structure
        </h1>
        <p className="mt-0.5 text-xs text-slate-500">
          Departments, programs, courses &amp; semesters in your institution.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <AdminStatCard label="Departments" value={departments.length} />
        <AdminStatCard
          label="Programs"
          value={programsQuery.data?.count ?? programs.length}
        />
        <AdminStatCard
          label="Active courses"
          value={courses.filter((course) => course.is_active).length}
        />
        <AdminStatCard
          label="Current semester"
          value={activeSemester?.name ?? "—"}
          tone="teal"
        />
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
        <section>
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-black uppercase tracking-widest text-slate-500">
              Departments &amp; programs
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={openNewDepartment}
            >
              <Plus className="size-4" /> Add Department
            </Button>
          </div>
          <div className="space-y-3">
            {departments.map((department) => {
              const departmentPrograms =
                programsByDepartment.get(department.id) ?? [];
              return (
                <div key={department.id} className={`${adminCardClass} p-3.5`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className="inline-flex size-8 items-center justify-center rounded-xl border border-slate-200/60 bg-white/80 text-base shadow-sm backdrop-blur-xs"
                        aria-hidden="true"
                      >
                        <Building2 className="size-4 text-sky-600" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-slate-900">
                          {department.name}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          <span className="font-bold text-slate-700">
                            {department.code}
                          </span>{" "}
                          · {departmentPrograms.length} programs
                        </p>
                        <p className="text-[11px] font-semibold text-slate-400">
                          {department.head_of_department_id
                            ? "HoD assigned"
                            : "No HoD assigned"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          navigate(
                            `/admin/programs/new?departmentId=${department.id}`
                          )
                        }
                      >
                        {" "}
                        <Plus className="size-4" /> Program
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Edit ${department.name}`}
                        onClick={() => openEditDepartment(department)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`Delete ${department.name}`}
                        onClick={() => setDeleteTarget(department)}
                      >
                        <Trash2 className="size-4 text-slate-400" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-2 divide-y divide-slate-100">
                    {departmentPrograms.map((program) => {
                      const programCourses = courses.filter(
                        (course) => course.program_id === program.id
                      );
                      return (
                        <div
                          key={program.id}
                          className="flex items-center gap-3 py-2"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-slate-900">
                              {program.name}
                            </p>
                            <p className="text-[11px] text-slate-500">
                              {program.code} · {programCourses.length} courses
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="link"
                            size="sm"
                            className="h-auto p-0 text-xs font-bold text-blue-600"
                            onClick={() =>
                              navigate(`/admin/courses?programId=${program.id}`)
                            }
                          >
                            Manage courses →
                          </Button>
                        </div>
                      );
                    })}
                    {departmentPrograms.length === 0 ? (
                      <p className="py-3 text-xs text-slate-500">
                        No programs assigned yet.
                      </p>
                    ) : null}
                  </div>
                </div>
              );
            })}
            {departments.length === 0 && !departmentsQuery.isLoading ? (
              <div
                className={`${adminCardClass} p-8 text-center text-sm text-slate-500`}
              >
                No departments yet. Create your first department to get started.
              </div>
            ) : null}
          </div>
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-black uppercase tracking-widest text-slate-500">
              Semesters
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => navigate("/admin/semesters")}
            >
              {" "}
              <Plus className="size-4" /> New semester
            </Button>
          </div>
          <div
            className={`${adminCardClass} divide-y divide-slate-100 overflow-hidden`}
          >
            {semesters.map((semester) => {
              const now = new Date();
              const isUpcoming = new Date(semester.start_date) > now;
              const isPast = new Date(semester.end_date) < now;
              return (
                <div
                  key={semester.id}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      {semester.name}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {semester.start_date} – {semester.end_date}
                    </p>
                  </div>
                  <AdminStatusPill
                    tone={
                      semester.is_active
                        ? "green"
                        : isUpcoming
                        ? "blue"
                        : isPast
                        ? "slate"
                        : "amber"
                    }
                  >
                    {semester.is_active
                      ? "Active"
                      : isUpcoming
                      ? "Upcoming"
                      : isPast
                      ? "Past"
                      : "Current"}
                  </AdminStatusPill>
                </div>
              );
            })}
            {semesters.length === 0 && !semestersQuery.isLoading ? (
              <p className="px-4 py-8 text-sm text-slate-500">
                No semesters yet.
              </p>
            ) : null}
          </div>
        </section>
      </div>

      <Dialog
        open={departmentDialogOpen}
        onOpenChange={setDepartmentDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingDepartment ? "Edit department" : "New department"}
            </DialogTitle>
          </DialogHeader>
          <form
            onSubmit={departmentForm.handleSubmit(submitDepartment)}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="department-name">Name</Label>
              <Input
                id="department-name"
                {...departmentForm.register("name")}
                placeholder="Computer Science"
              />
              {departmentForm.formState.errors.name ? (
                <p className="text-xs text-red-600">
                  {departmentForm.formState.errors.name.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="department-code">Code</Label>
              <Input
                id="department-code"
                {...departmentForm.register("code")}
                placeholder="CS"
              />
              {departmentForm.formState.errors.code ? (
                <p className="text-xs text-red-600">
                  {departmentForm.formState.errors.code.message}
                </p>
              ) : null}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDepartmentDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="tactile"
                disabled={
                  createDepartment.isPending || updateDepartment.isPending
                }
              >
                {editingDepartment ? "Save changes" : "Create department"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete department?"
        description="This is allowed only when no programs are assigned to the department."
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        isPending={deleteDepartment.isPending}
        variant="destructive"
      />
    </div>
  );
};

export default DepartmentManager;

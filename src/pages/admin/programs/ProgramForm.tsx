import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, useParams } from "react-router-dom";
import {
  createProgramSchema,
  updateProgramSchema,
  type CreateProgramFormData,
  type UpdateProgramFormData,
} from "@/lib/schemas/program";
import {
  useCreateProgram,
  useUpdateProgram,
  useProgram,
} from "@/hooks/usePrograms";
import { useCoordinators } from "@/hooks/useUsers";
import { useDepartments } from "@/hooks/useDepartments";
import { useAuth } from "@/hooks/useAuth";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { PCard } from "@/design-system";
import { ArrowLeft, Building2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import type { Profile, Program } from "@/types/app";
import type { Department } from "@/hooks/useDepartments";

// ─── Create mode form ────────────────────────────────────────────────────────

const CreateProgramForm = ({ institutionId }: { institutionId: string }) => {
  const navigate = useNavigate();
  const createMutation = useCreateProgram();
  const { data: coordinators = [], isLoading: isLoadingCoordinators } =
    useCoordinators();
  const { data: departments = [], isLoading: isLoadingDepartments } =
    useDepartments();

  const form = useForm<CreateProgramFormData>({
    resolver: zodResolver(createProgramSchema),
    defaultValues: {
      name: "",
      code: "",
      description: "",
      institution_id: institutionId,
    },
  });

  const onSubmit = (data: CreateProgramFormData) => {
    createMutation.mutate(
      { ...data, institution_id: institutionId },
      {
        onSuccess: () => {
          toast.success("Program created successfully");
          navigate("/admin/programs");
        },
        onError: (err) => toast.error(err.message),
      }
    );
  };

  return (
    <ProgramFormFields
      form={form}
      onSubmit={onSubmit}
      isPending={createMutation.isPending}
      isEditMode={false}
      coordinators={coordinators}
      isLoadingCoordinators={isLoadingCoordinators}
      departments={departments}
      isLoadingDepartments={isLoadingDepartments}
    />
  );
};

// ─── Edit mode form ──────────────────────────────────────────────────────────

const EditProgramForm = ({ programId }: { programId: string }) => {
  const navigate = useNavigate();
  const { data: existingProgram, isLoading } = useProgram(programId);
  const updateMutation = useUpdateProgram(programId);
  const { data: coordinators = [], isLoading: isLoadingCoordinators } =
    useCoordinators();
  const { data: departments = [], isLoading: isLoadingDepartments } =
    useDepartments();

  const form = useForm<UpdateProgramFormData>({
    resolver: zodResolver(updateProgramSchema),
    defaultValues: {
      name: "",
      code: "",
      description: "",
    },
  });

  useEffect(() => {
    if (existingProgram) {
      const program = existingProgram as unknown as Program;
      form.reset({
        name: program.name,
        code: program.code,
        description: program.description ?? "",
        coordinator_id: program.coordinator_id ?? undefined,
        department_id: program.department_id ?? undefined,
      });
    }
  }, [existingProgram, form]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const existingCode = (existingProgram as unknown as Program | null)?.code;

  const onSubmit = (data: UpdateProgramFormData) => {
    updateMutation.mutate(data, {
      onSuccess: () => {
        toast.success("Program updated successfully");
        navigate("/admin/programs");
      },
      onError: (err) => toast.error(err.message),
    });
  };

  return (
    <ProgramFormFields
      form={form}
      onSubmit={onSubmit}
      isPending={updateMutation.isPending}
      isEditMode
      existingCode={existingCode}
      coordinators={coordinators}
      isLoadingCoordinators={isLoadingCoordinators}
      departments={departments}
      isLoadingDepartments={isLoadingDepartments}
    />
  );
};

// ─── Shared form fields ──────────────────────────────────────────────────────

interface ProgramFormFieldsProps<
  T extends CreateProgramFormData | UpdateProgramFormData
> {
  form: ReturnType<typeof useForm<T>>;
  onSubmit: (data: T) => void;
  isPending: boolean;
  isEditMode: boolean;
  existingCode?: string;
  coordinators: Profile[];
  isLoadingCoordinators: boolean;
  departments: Department[];
  isLoadingDepartments: boolean;
}

const ProgramFormFields = <
  T extends CreateProgramFormData | UpdateProgramFormData
>({
  form,
  onSubmit,
  isPending,
  isEditMode,
  existingCode,
  coordinators,
  isLoadingCoordinators,
  departments,
  isLoadingDepartments,
}: ProgramFormFieldsProps<T>) => {
  const navigate = useNavigate();
  const { t } = useTranslation("admin");

  return (
    <PCard className="max-w-2xl p-6">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(
            onSubmit as Parameters<typeof form.handleSubmit>[0]
          )}
          className="space-y-6"
        >
          <FormField
            control={form.control}
            name={"name" as never}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Program Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g. Bachelor of Computer Science"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name={"name_ar" as never}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("bilingual.arabicName")}</FormLabel>
                <FormControl>
                  <Input
                    placeholder={t("bilingual.arabicNamePlaceholder")}
                    dir="rtl"
                    {...field}
                    value={(field.value as string) ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {isEditMode ? (
            <div className="grid gap-2">
              {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
              <label className="text-sm font-medium">Program Code</label>
              <Input
                value={existingCode ?? ""}
                disabled
                className="bg-gray-50"
              />
              <p className="text-sm text-muted-foreground">
                Program code cannot be changed after creation.
              </p>
            </div>
          ) : (
            <FormField
              control={form.control}
              name={"code" as never}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Program Code</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. BSCS" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name={"description" as never}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Brief description of the program..."
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
            name={"coordinator_id" as never}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Coordinator</FormLabel>
                <Select
                  onValueChange={(value) =>
                    field.onChange(value === "__none__" ? undefined : value)
                  }
                  value={(field.value as string) ?? "__none__"}
                  disabled={isLoadingCoordinators}
                >
                  <FormControl>
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Select a coordinator" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="__none__">No coordinator</SelectItem>
                    {coordinators.map((coord) => (
                      <SelectItem key={coord.id} value={coord.id}>
                        {coord.full_name}
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
            name={"department_id" as never}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Department</FormLabel>
                <Select
                  onValueChange={(value) =>
                    field.onChange(value === "__none__" ? undefined : value)
                  }
                  value={(field.value as string) ?? "__none__"}
                  disabled={isLoadingDepartments}
                >
                  <FormControl>
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Select a department" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="__none__">No department</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" disabled={isPending} variant="tactile">
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEditMode ? "Update Program" : "Create Program"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/admin/programs")}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Form>
    </PCard>
  );
};

// ─── Main page component ─────────────────────────────────────────────────────

const ProgramForm = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { institutionId } = useAuth();
  const isEditMode = !!id;

  // Guard: institution_id is required for program creation. If the profile
  // hasn't loaded yet or the admin's institution_id is missing, show a
  // loading / error state instead of a form that will silently fail zod
  // validation (zod.uuid() rejects empty strings).
  if (!isEditMode && !institutionId) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/admin/programs")}
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Create Program</h1>
        </div>
        <PCard>
          <div className="py-12 text-center space-y-3">
            <Building2 className="mx-auto h-12 w-12 text-muted-foreground/40" />
            <p className="text-lg font-semibold text-muted-foreground">
              Institution not loaded
            </p>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Your institution profile is still loading or your account is not
              linked to an institution. Please wait a moment or contact your
              administrator.
            </p>
            <Button
              variant="outline"
              onClick={() => navigate("/admin/dashboard")}
            >
              Return to Dashboard
            </Button>
          </div>
        </PCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/admin/programs")}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">
          {isEditMode ? "Edit Program" : "Create Program"}
        </h1>
      </div>

      {isEditMode ? (
        <EditProgramForm programId={id} />
      ) : (
        <CreateProgramForm institutionId={institutionId ?? ""} />
      )}
    </div>
  );
};

export default ProgramForm;

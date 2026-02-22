import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams } from 'react-router-dom';
import {
  createProgramSchema,
  updateProgramSchema,
  type CreateProgramFormData,
  type UpdateProgramFormData,
} from '@/lib/schemas/program';
import { useCreateProgram, useUpdateProgram, useProgram } from '@/hooks/usePrograms';
import { useCoordinators } from '@/hooks/useUsers';
import { useAuth } from '@/providers/AuthProvider';
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
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Profile, Program } from '@/types/app';

// ─── Create mode form ────────────────────────────────────────────────────────

const CreateProgramForm = ({ institutionId }: { institutionId: string }) => {
  const navigate = useNavigate();
  const createMutation = useCreateProgram();
  const { data: coordinators = [], isLoading: isLoadingCoordinators } = useCoordinators();

  const form = useForm<CreateProgramFormData>({
    resolver: zodResolver(createProgramSchema),
    defaultValues: {
      name: '',
      code: '',
      description: '',
      institution_id: institutionId,
    },
  });

  const onSubmit = (data: CreateProgramFormData) => {
    createMutation.mutate(
      { ...data, institution_id: institutionId },
      {
        onSuccess: () => {
          toast.success('Program created successfully');
          navigate('/admin/programs');
        },
        onError: (err) => toast.error(err.message),
      },
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
    />
  );
};

// ─── Edit mode form ──────────────────────────────────────────────────────────

const EditProgramForm = ({ programId }: { programId: string }) => {
  const navigate = useNavigate();
  const { data: existingProgram, isLoading } = useProgram(programId);
  const updateMutation = useUpdateProgram(programId);
  const { data: coordinators = [], isLoading: isLoadingCoordinators } = useCoordinators();

  const form = useForm<UpdateProgramFormData>({
    resolver: zodResolver(updateProgramSchema),
    defaultValues: {
      name: '',
      code: '',
      description: '',
    },
  });

  useEffect(() => {
    if (existingProgram) {
      const program = existingProgram as unknown as Program;
      form.reset({
        name: program.name,
        code: program.code,
        description: program.description ?? '',
        coordinator_id: program.coordinator_id ?? undefined,
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
        toast.success('Program updated successfully');
        navigate('/admin/programs');
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
    />
  );
};

// ─── Shared form fields ──────────────────────────────────────────────────────

interface ProgramFormFieldsProps<T extends CreateProgramFormData | UpdateProgramFormData> {
  form: ReturnType<typeof useForm<T>>;
  onSubmit: (data: T) => void;
  isPending: boolean;
  isEditMode: boolean;
  existingCode?: string;
  coordinators: Profile[];
  isLoadingCoordinators: boolean;
}

const ProgramFormFields = <T extends CreateProgramFormData | UpdateProgramFormData>({
  form,
  onSubmit,
  isPending,
  isEditMode,
  existingCode,
  coordinators,
  isLoadingCoordinators,
}: ProgramFormFieldsProps<T>) => {
  const navigate = useNavigate();

  return (
    <Card className="bg-white border-0 shadow-md rounded-xl p-6 max-w-2xl">
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit as Parameters<typeof form.handleSubmit>[0])}
          className="space-y-6"
        >
          <FormField
            control={form.control}
            name={'name' as never}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Program Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Bachelor of Computer Science" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {isEditMode ? (
            <div className="grid gap-2">
              <label className="text-sm font-medium">Program Code</label>
              <Input
                value={existingCode ?? ''}
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
              name={'code' as never}
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
            name={'description' as never}
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
            name={'coordinator_id' as never}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Coordinator</FormLabel>
                <Select
                  onValueChange={(value) => field.onChange(value === '__none__' ? undefined : value)}
                  value={(field.value as string) ?? '__none__'}
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

          <div className="flex items-center gap-3 pt-2">
            <Button
              type="submit"
              disabled={isPending}
              className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95 text-white"
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEditMode ? 'Update Program' : 'Create Program'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/admin/programs')}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Form>
    </Card>
  );
};

// ─── Main page component ─────────────────────────────────────────────────────

const ProgramForm = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { institutionId } = useAuth();
  const isEditMode = !!id;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/admin/programs')}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">
          {isEditMode ? 'Edit Program' : 'Create Program'}
        </h1>
      </div>

      {isEditMode ? (
        <EditProgramForm programId={id} />
      ) : (
        <CreateProgramForm institutionId={institutionId ?? ''} />
      )}
    </div>
  );
};

export default ProgramForm;

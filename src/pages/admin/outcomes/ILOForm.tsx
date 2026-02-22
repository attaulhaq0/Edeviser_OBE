import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams } from 'react-router-dom';
import {
  createILOSchema,
  updateILOSchema,
  type CreateILOFormData,
  type UpdateILOFormData,
} from '@/lib/schemas/ilo';
import { useCreateILO, useUpdateILO, useILO } from '@/hooks/useILOs';
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
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { LearningOutcome } from '@/types/app';

// ─── Create mode form ────────────────────────────────────────────────────────

const CreateILOForm = ({ institutionId }: { institutionId: string }) => {
  const navigate = useNavigate();
  const createMutation = useCreateILO();

  const form = useForm<CreateILOFormData>({
    resolver: zodResolver(createILOSchema),
    defaultValues: {
      title: '',
      description: '',
      institution_id: institutionId,
    },
  });

  const onSubmit = (data: CreateILOFormData) => {
    createMutation.mutate(
      { ...data, institution_id: institutionId },
      {
        onSuccess: () => {
          toast.success('ILO created successfully');
          navigate('/admin/outcomes');
        },
        onError: (err) => toast.error(err.message),
      },
    );
  };

  return (
    <ILOFormFields
      form={form}
      onSubmit={onSubmit}
      isPending={createMutation.isPending}
      isEditMode={false}
    />
  );
};

// ─── Edit mode form ──────────────────────────────────────────────────────────

const EditILOForm = ({ iloId }: { iloId: string }) => {
  const navigate = useNavigate();
  const { data: existingILO, isLoading } = useILO(iloId);
  const updateMutation = useUpdateILO(iloId);

  const form = useForm<UpdateILOFormData>({
    resolver: zodResolver(updateILOSchema),
    defaultValues: {
      title: '',
      description: '',
    },
  });

  useEffect(() => {
    if (existingILO) {
      const ilo = existingILO as unknown as LearningOutcome;
      form.reset({
        title: ilo.title,
        description: ilo.description ?? '',
      });
    }
  }, [existingILO, form]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const onSubmit = (data: UpdateILOFormData) => {
    updateMutation.mutate(data, {
      onSuccess: () => {
        toast.success('ILO updated successfully');
        navigate('/admin/outcomes');
      },
      onError: (err) => toast.error(err.message),
    });
  };

  return (
    <ILOFormFields
      form={form}
      onSubmit={onSubmit}
      isPending={updateMutation.isPending}
      isEditMode
    />
  );
};

// ─── Shared form fields ──────────────────────────────────────────────────────

interface ILOFormFieldsProps<T extends CreateILOFormData | UpdateILOFormData> {
  form: ReturnType<typeof useForm<T>>;
  onSubmit: (data: T) => void;
  isPending: boolean;
  isEditMode: boolean;
}

const ILOFormFields = <T extends CreateILOFormData | UpdateILOFormData>({
  form,
  onSubmit,
  isPending,
  isEditMode,
}: ILOFormFieldsProps<T>) => {
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
            name={'title' as never}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g. Demonstrate critical thinking skills"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name={'description' as never}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Describe this institutional learning outcome..."
                    className="min-h-[100px] resize-y"
                    {...field}
                  />
                </FormControl>
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
              {isEditMode ? 'Update ILO' : 'Create ILO'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/admin/outcomes')}
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

const ILOForm = () => {
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
          onClick={() => navigate('/admin/outcomes')}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">
          {isEditMode ? 'Edit ILO' : 'Create ILO'}
        </h1>
      </div>

      {isEditMode ? (
        <EditILOForm iloId={id} />
      ) : (
        <CreateILOForm institutionId={institutionId ?? ''} />
      )}
    </div>
  );
};

export default ILOForm;

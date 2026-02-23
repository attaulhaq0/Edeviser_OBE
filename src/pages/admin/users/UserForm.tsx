import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams } from 'react-router-dom';
import {
  createUserSchema,
  updateUserSchema,
  type CreateUserFormData,
  type UpdateUserFormData,
} from '@/lib/schemas/user';
import { useCreateUser, useUpdateUser, useUser } from '@/hooks/useUsers';
import { useAuth } from '@/hooks/useAuth';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
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
import type { Profile } from '@/types/app';

const ROLE_OPTIONS = [
  { label: 'Admin', value: 'admin' },
  { label: 'Coordinator', value: 'coordinator' },
  { label: 'Teacher', value: 'teacher' },
  { label: 'Student', value: 'student' },
  { label: 'Parent', value: 'parent' },
] as const;

// ─── Create mode form ────────────────────────────────────────────────────────

const CreateUserForm = ({ institutionId }: { institutionId: string }) => {
  const navigate = useNavigate();
  const createMutation = useCreateUser();

  const form = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      full_name: '',
      email: '',
      role: 'student',
      institution_id: institutionId,
    },
  });

  const onSubmit = (data: CreateUserFormData) => {
    createMutation.mutate(
      { ...data, institution_id: institutionId },
      {
        onSuccess: () => {
          toast.success('User created successfully');
          navigate('/admin/users');
        },
        onError: (err) => toast.error(err.message),
      },
    );
  };

  return (
    <UserFormFields
      form={form}
      onSubmit={onSubmit}
      isPending={createMutation.isPending}
      isEditMode={false}
    />
  );
};

// ─── Edit mode form ──────────────────────────────────────────────────────────

const EditUserForm = ({ userId }: { userId: string }) => {
  const navigate = useNavigate();
  const { data: existingUser, isLoading } = useUser(userId);
  const updateMutation = useUpdateUser(userId);

  const form = useForm<UpdateUserFormData>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: {
      full_name: '',
      role: 'student',
    },
  });

  useEffect(() => {
    if (existingUser) {
      const profile = existingUser as unknown as Profile;
      form.reset({
        full_name: profile.full_name,
        role: profile.role,
      });
    }
  }, [existingUser, form]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const existingProfile = existingUser as unknown as Profile | null;

  const onSubmit = (data: UpdateUserFormData) => {
    updateMutation.mutate(data, {
      onSuccess: () => {
        toast.success('User updated successfully');
        navigate('/admin/users');
      },
      onError: (err) => toast.error(err.message),
    });
  };

  return (
    <UserFormFields
      form={form}
      onSubmit={onSubmit}
      isPending={updateMutation.isPending}
      isEditMode
      existingEmail={existingProfile?.email}
    />
  );
};

// ─── Shared form fields ──────────────────────────────────────────────────────

interface UserFormFieldsProps<T extends CreateUserFormData | UpdateUserFormData> {
  form: ReturnType<typeof useForm<T>>;
  onSubmit: (data: T) => void;
  isPending: boolean;
  isEditMode: boolean;
  existingEmail?: string;
}

const UserFormFields = <T extends CreateUserFormData | UpdateUserFormData>({
  form,
  onSubmit,
  isPending,
  isEditMode,
  existingEmail,
}: UserFormFieldsProps<T>) => {
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
            name={'full_name' as never}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter full name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {isEditMode ? (
            <div className="grid gap-2">
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                value={existingEmail ?? ''}
                disabled
                className="bg-gray-50"
              />
              <p className="text-sm text-muted-foreground">
                Email cannot be changed after creation.
              </p>
            </div>
          ) : (
            <FormField
              control={form.control}
              name={'email' as never}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="user@institution.edu"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name={'role' as never}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Role</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value as string}
                >
                  <FormControl>
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {ROLE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
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
              {isEditMode ? 'Update User' : 'Create User'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/admin/users')}
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

const UserForm = () => {
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
          onClick={() => navigate('/admin/users')}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">
          {isEditMode ? 'Edit User' : 'Create User'}
        </h1>
      </div>

      {isEditMode ? (
        <EditUserForm userId={id} />
      ) : (
        <CreateUserForm institutionId={institutionId ?? ''} />
      )}
    </div>
  );
};

export default UserForm;

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams } from 'react-router-dom';
import {
  createCourseSchema,
  updateCourseSchema,
  type CreateCourseFormData,
  type UpdateCourseFormData,
} from '@/lib/schemas/course';
import {
  useCreateCourse,
  useUpdateCourse,
  useCourse,
  useTeachers,
} from '@/hooks/useCourses';
import { usePrograms } from '@/hooks/usePrograms';
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
import type { Profile, Program } from '@/types/app';

// ─── Create mode form ────────────────────────────────────────────────────────

const CreateCourseForm = ({ institutionId }: { institutionId: string }) => {
  const navigate = useNavigate();
  const createMutation = useCreateCourse();
  const { data: programs = [], isLoading: isLoadingPrograms } = usePrograms();
  const { data: teachers = [], isLoading: isLoadingTeachers } = useTeachers();

  const form = useForm<CreateCourseFormData>({
    resolver: zodResolver(createCourseSchema),
    defaultValues: {
      name: '',
      code: '',
      program_id: '' as `${string}-${string}-${string}-${string}-${string}`,
      semester_id: '' as `${string}-${string}-${string}-${string}-${string}`,
      teacher_id: '' as `${string}-${string}-${string}-${string}-${string}`,
      is_active: true,
    },
  });

  const onSubmit = (data: CreateCourseFormData) => {
    createMutation.mutate(data, {
      onSuccess: () => {
        toast.success('Course created successfully');
        navigate('/admin/courses');
      },
      onError: (err) => toast.error(err.message),
    });
  };

  return (
    <CourseFormFields
      form={form}
      onSubmit={onSubmit}
      isPending={createMutation.isPending}
      isEditMode={false}
      programs={programs}
      isLoadingPrograms={isLoadingPrograms}
      teachers={teachers}
      isLoadingTeachers={isLoadingTeachers}
      institutionId={institutionId}
    />
  );
};

// ─── Edit mode form ──────────────────────────────────────────────────────────

const EditCourseForm = ({ courseId }: { courseId: string }) => {
  const navigate = useNavigate();
  const { data: existingCourse, isLoading } = useCourse(courseId);
  const updateMutation = useUpdateCourse(courseId);
  const { data: teachers = [], isLoading: isLoadingTeachers } = useTeachers();

  const form = useForm<UpdateCourseFormData>({
    resolver: zodResolver(updateCourseSchema),
    defaultValues: {
      name: '',
      code: '',
    },
  });

  useEffect(() => {
    if (existingCourse) {
      form.reset({
        name: existingCourse.name,
        code: existingCourse.code,
        teacher_id: (existingCourse.teacher_id ?? undefined) as `${string}-${string}-${string}-${string}-${string}` | undefined,
        semester_id: (existingCourse.semester_id ?? undefined) as `${string}-${string}-${string}-${string}-${string}` | undefined,
        is_active: existingCourse.is_active,
      });
    }
  }, [existingCourse, form]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const onSubmit = (data: UpdateCourseFormData) => {
    updateMutation.mutate(data, {
      onSuccess: () => {
        toast.success('Course updated successfully');
        navigate('/admin/courses');
      },
      onError: (err) => toast.error(err.message),
    });
  };

  return (
    <CourseFormFields
      form={form}
      onSubmit={onSubmit}
      isPending={updateMutation.isPending}
      isEditMode
      existingCode={existingCourse?.code}
      existingProgram={existingCourse?.program_id}
      programs={[]}
      isLoadingPrograms={false}
      teachers={teachers}
      isLoadingTeachers={isLoadingTeachers}
    />
  );
};

// ─── Shared form fields ──────────────────────────────────────────────────────

interface CourseFormFieldsProps<T extends CreateCourseFormData | UpdateCourseFormData> {
  form: ReturnType<typeof useForm<T>>;
  onSubmit: (data: T) => void;
  isPending: boolean;
  isEditMode: boolean;
  existingCode?: string;
  existingProgram?: string;
  programs: Program[];
  isLoadingPrograms: boolean;
  teachers: Profile[];
  isLoadingTeachers: boolean;
  institutionId?: string;
}

const CourseFormFields = <T extends CreateCourseFormData | UpdateCourseFormData>({
  form,
  onSubmit,
  isPending,
  isEditMode,
  existingCode,
  existingProgram,
  programs,
  isLoadingPrograms,
  teachers,
  isLoadingTeachers,
}: CourseFormFieldsProps<T>) => {
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
                <FormLabel>Course Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Data Structures and Algorithms" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {isEditMode ? (
            <div className="grid gap-2">
              <label className="text-sm font-medium">Course Code</label>
              <Input
                value={existingCode ?? ''}
                disabled
                className="bg-gray-50"
              />
              <p className="text-sm text-muted-foreground">
                Course code cannot be changed after creation.
              </p>
            </div>
          ) : (
            <FormField
              control={form.control}
              name={'code' as never}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Course Code</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. CS201" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {isEditMode ? (
            <div className="grid gap-2">
              <label className="text-sm font-medium">Program</label>
              <Input
                value={existingProgram ?? ''}
                disabled
                className="bg-gray-50"
              />
              <p className="text-sm text-muted-foreground">
                Program cannot be changed after creation.
              </p>
            </div>
          ) : (
            <FormField
              control={form.control}
              name={'program_id' as never}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Program</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value as string}
                    disabled={isLoadingPrograms}
                  >
                    <FormControl>
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Select a program" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {programs.map((program) => (
                        <SelectItem key={program.id} value={program.id}>
                          {program.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name={'teacher_id' as never}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Teacher</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value as string}
                  disabled={isLoadingTeachers}
                >
                  <FormControl>
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Select a teacher" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {teachers.map((teacher) => (
                      <SelectItem key={teacher.id} value={teacher.id}>
                        {teacher.full_name}
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
            name={'semester_id' as never}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Semester</FormLabel>
                <FormControl>
                  <Input placeholder="Semester ID" {...field} />
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
              {isEditMode ? 'Update Course' : 'Create Course'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/admin/courses')}
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

const CourseForm = () => {
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
          onClick={() => navigate('/admin/courses')}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">
          {isEditMode ? 'Edit Course' : 'Create Course'}
        </h1>
      </div>

      {isEditMode ? (
        <EditCourseForm courseId={id} />
      ) : (
        <CreateCourseForm institutionId={institutionId ?? ''} />
      )}
    </div>
  );
};

export default CourseForm;

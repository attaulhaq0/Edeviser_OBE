// Task 66.2: Announcement Editor — Create/edit announcements with markdown content and pin toggle
// Requirements: 75.1, 75.4
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import {
  useAnnouncements,
  useCreateAnnouncement,
  useUpdateAnnouncement,
  useDeleteAnnouncement,
  type Announcement,
} from '@/hooks/useAnnouncements';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Megaphone, Pin, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import Shimmer from '@/components/shared/Shimmer';

// ─── Schema ─────────────────────────────────────────────────────────────────

const announcementSchema = z.object({
  course_id: z.string().min(1, 'Course is required'),
  title: z.string().min(1, 'Title is required').max(255),
  content: z.string().min(1, 'Content is required'),
  is_pinned: z.boolean(),
});

type AnnouncementFormData = z.infer<typeof announcementSchema>;

// ─── Teacher courses hook ───────────────────────────────────────────────────

interface TeacherCourse {
  id: string;
  name: string;
  code: string;
}

const useTeacherCourses = (teacherId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.courses.list({ teacherId }),
    queryFn: async () => {
      if (!teacherId) return [];
      const { data, error } = await supabase
        .from('courses')
        .select('id, name, code')
        .eq('teacher_id', teacherId)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return (data ?? []) as TeacherCourse[];
    },
    enabled: !!teacherId,
  });
};

// ─── Component ──────────────────────────────────────────────────────────────

const AnnouncementEditor = () => {
  const { user } = useAuth();
  const teacherId = user?.id;

  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null);

  const { data: courses, isLoading: coursesLoading } = useTeacherCourses(teacherId);
  // Derive selected course — default to first course if none selected
  const effectiveCourseId = selectedCourseId || (courses && courses.length > 0 ? courses[0]?.id ?? '' : '');

  const { data: announcements, isLoading: announcementsLoading } = useAnnouncements(effectiveCourseId || undefined);

  const createMutation = useCreateAnnouncement();
  const updateMutation = useUpdateAnnouncement();
  const deleteMutation = useDeleteAnnouncement();

  const form = useForm<AnnouncementFormData>({
    resolver: zodResolver(announcementSchema),
    defaultValues: {
      course_id: '',
      title: '',
      content: '',
      is_pinned: false,
    },
  });

  const openCreateForm = () => {
    setEditingAnnouncement(null);
    form.reset({
      course_id: effectiveCourseId,
      title: '',
      content: '',
      is_pinned: false,
    });
    setShowForm(true);
  };

  const openEditForm = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    form.reset({
      course_id: announcement.course_id,
      title: announcement.title,
      content: announcement.content,
      is_pinned: announcement.is_pinned,
    });
    setShowForm(true);
  };

  const onSubmit = (data: AnnouncementFormData) => {
    if (!teacherId) return;

    if (editingAnnouncement) {
      updateMutation.mutate(
        {
          id: editingAnnouncement.id,
          title: data.title,
          content: data.content,
          is_pinned: data.is_pinned,
          performedBy: teacherId,
        },
        {
          onSuccess: () => {
            toast.success('Announcement updated');
            setShowForm(false);
            setEditingAnnouncement(null);
          },
          onError: (err) => toast.error(err.message),
        },
      );
    } else {
      createMutation.mutate(
        {
          course_id: data.course_id,
          author_id: teacherId,
          title: data.title,
          content: data.content,
          is_pinned: data.is_pinned,
          performedBy: teacherId,
        },
        {
          onSuccess: () => {
            toast.success('Announcement posted');
            setShowForm(false);
          },
          onError: (err) => toast.error(err.message),
        },
      );
    }
  };

  const handleDelete = () => {
    if (!deleteTarget || !teacherId) return;
    deleteMutation.mutate(
      { id: deleteTarget.id, performedBy: teacherId },
      {
        onSuccess: () => {
          toast.success('Announcement deleted');
          setDeleteTarget(null);
        },
        onError: (err) => toast.error(err.message),
      },
    );
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Announcements</h1>
        <Button
          onClick={openCreateForm}
          disabled={!effectiveCourseId}
          className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95 transition-transform duration-100"
        >
          <Plus className="h-4 w-4" /> New Announcement
        </Button>
      </div>

      {/* Course Selector */}
      <div className="max-w-xs">
        {coursesLoading ? (
          <Shimmer className="h-10 rounded-lg" />
        ) : (
          <Select value={effectiveCourseId} onValueChange={setSelectedCourseId}>
            <SelectTrigger className="bg-white">
              <SelectValue placeholder="Select a course" />
            </SelectTrigger>
            <SelectContent>
              {(courses ?? []).map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.code} — {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <Card className="bg-white border-0 shadow-md rounded-xl p-6 max-w-2xl">
          <h2 className="text-lg font-bold tracking-tight mb-4">
            {editingAnnouncement ? 'Edit Announcement' : 'New Announcement'}
          </h2>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Announcement title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Content (Markdown supported)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Write your announcement content here..."
                        rows={6}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="is_pinned"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-3">
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="!mt-0">Pin this announcement</FormLabel>
                  </FormItem>
                )}
              />
              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={isPending}
                  className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95 transition-transform duration-100"
                >
                  {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingAnnouncement ? 'Update' : 'Post'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setEditingAnnouncement(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </Card>
      )}

      {/* Announcements List */}
      {announcementsLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Shimmer key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : (announcements ?? []).length === 0 ? (
        <Card className="bg-white border-0 shadow-md rounded-xl p-8 text-center">
          <Megaphone className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No announcements yet. Post one to get started.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {(announcements ?? []).map((a) => (
            <Card
              key={a.id}
              className={`bg-white border-0 shadow-md rounded-xl p-4 ${a.is_pinned ? 'ring-1 ring-amber-200' : ''}`}
            >
              <div className="flex items-start gap-3">
                <Megaphone
                  className={`h-5 w-5 mt-0.5 shrink-0 ${a.is_pinned ? 'text-amber-500' : 'text-gray-400'}`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-bold truncate">{a.title}</h3>
                    {a.is_pinned && (
                      <Badge variant="outline" className="text-xs text-amber-600 border-amber-200">
                        <Pin className="h-3 w-3 mr-1" /> Pinned
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap line-clamp-4">
                    {a.content}
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    {format(new Date(a.created_at), 'MMM d, yyyy · h:mm a')}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditForm(a)}
                    className="h-8 w-8 p-0"
                  >
                    <Pencil className="h-4 w-4 text-gray-400" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteTarget(a)}
                    className="h-8 w-8 p-0"
                  >
                    <Trash2 className="h-4 w-4 text-red-400" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open: boolean) => { if (!open) setDeleteTarget(null); }}
        title="Delete Announcement"
        description={`Are you sure you want to delete "${deleteTarget?.title}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        confirmLabel="Delete"
        variant="destructive"
        isPending={deleteMutation.isPending}
      />
    </div>
  );
};

export default AnnouncementEditor;

import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Megaphone, Pin, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useAuth } from "@/hooks/useAuth";
import { useCourses } from "@/hooks/useCourses";
import {
  useAdminAnnouncements,
  useCreateAnnouncement,
  useDeleteAnnouncement,
} from "@/hooks/useAnnouncements";
import {
  AdminSectionHeader,
  AdminStatusPill,
  adminCardClass,
  adminPageClass,
} from "@/design-system";

const schema = z.object({
  course_id: z.string().uuid("Select a course"),
  title: z.string().trim().min(3, "Title is required"),
  content: z.string().trim().min(1, "Message is required"),
  is_pinned: z.boolean(),
});

type AnnouncementForm = z.infer<typeof schema>;

const AdminAnnouncementsPage = () => {
  const { profile } = useAuth();
  const coursesQuery = useCourses({ pageSize: 100 });
  const courses = useMemo(
    () => coursesQuery.data?.data ?? [],
    [coursesQuery.data?.data]
  );
  const courseIds = useMemo(
    () => courses.map((course) => course.id),
    [courses]
  );
  const announcementsQuery = useAdminAnnouncements(courseIds);
  const createMutation = useCreateAnnouncement();
  const deleteMutation = useDeleteAnnouncement();
  const form = useForm<AnnouncementForm>({
    resolver: zodResolver(schema),
    defaultValues: { course_id: "", title: "", content: "", is_pinned: false },
  });
  const courseNames = useMemo(
    () =>
      new Map(
        courses.map((course) => [course.id, `${course.code} · ${course.name}`])
      ),
    [courses]
  );

  const submit = (values: AnnouncementForm) => {
    if (!profile?.id) {
      toast.error("Your admin session is not ready");
      return;
    }
    createMutation.mutate(
      { ...values, author_id: profile.id, performedBy: profile.id },
      {
        onSuccess: () => {
          toast.success("Announcement posted");
          form.reset({ ...values, title: "", content: "" });
        },
        onError: (error) => toast.error(error.message),
      }
    );
  };

  const remove = (id: string) => {
    if (!profile?.id) return;
    deleteMutation.mutate(
      { id, performedBy: profile.id },
      {
        onSuccess: () => toast.success("Announcement removed"),
        onError: (error) => toast.error(error.message),
      }
    );
  };

  return (
    <div className={adminPageClass}>
      <div>
        <h1 className="text-xl font-black tracking-tight text-slate-900">
          Announcements
        </h1>
        <p className="mt-0.5 text-xs text-slate-500">
          Publish institution-managed updates to live course communities.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
        <div className={`${adminCardClass} p-4 md:p-5`}>
          <AdminSectionHeader emoji="📣" title="Post announcement" />
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(submit)}
              className="mt-4 space-y-4"
            >
              <FormField
                control={form.control}
                name="course_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Course audience</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a course" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {courses.map((course) => (
                          <SelectItem key={course.id} value={course.id}>
                            {course.code} · {course.name}
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
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Announcement title" />
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
                    <FormLabel>Message</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        rows={5}
                        placeholder="Write the update for learners and staff…"
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
                  <FormItem className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
                    <div>
                      <FormLabel>Pin announcement</FormLabel>
                      <p className="text-xs text-slate-500">
                        Keep it at the top of the course feed.
                      </p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                variant="tactile"
                disabled={createMutation.isPending || courses.length === 0}
              >
                <Megaphone className="size-4" />
                {createMutation.isPending ? "Posting…" : "Post announcement"}
              </Button>
              {courses.length === 0 && !coursesQuery.isLoading ? (
                <p className="text-xs text-amber-700">
                  Create a course before posting an announcement.
                </p>
              ) : null}
            </form>
          </Form>
        </div>

        <div className={`${adminCardClass} overflow-hidden p-4 md:p-5`}>
          <AdminSectionHeader
            emoji="🕒"
            title="Recent announcements"
            action={
              <AdminStatusPill tone="blue">
                {announcementsQuery.data?.length ?? 0} live
              </AdminStatusPill>
            }
          />
          <div className="mt-3 divide-y divide-slate-100">
            {(announcementsQuery.data ?? [])
              .slice(0, 12)
              .map((announcement) => (
                <article key={announcement.id} className="py-3 first:pt-0">
                  <div className="flex items-start gap-3">
                    <span
                      className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-600"
                      aria-hidden="true"
                    >
                      {announcement.is_pinned ? (
                        <Pin className="size-4" />
                      ) : (
                        <Megaphone className="size-4" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900">
                          {announcement.title}
                        </h3>
                        {announcement.is_pinned ? (
                          <AdminStatusPill tone="amber">Pinned</AdminStatusPill>
                        ) : null}
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                        {announcement.content}
                      </p>
                      <p className="mt-2 text-[10px] font-semibold text-slate-400">
                        {courseNames.get(announcement.course_id) ?? "Course"} ·{" "}
                        {new Date(announcement.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete ${announcement.title}`}
                      onClick={() => remove(announcement.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="size-4 text-slate-400" />
                    </Button>
                  </div>
                </article>
              ))}
            {!announcementsQuery.isLoading &&
            (announcementsQuery.data ?? []).length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">
                No announcements have been posted.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAnnouncementsPage;

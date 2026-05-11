import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import Shimmer from "@/components/shared/Shimmer";
import { Plus, Loader2, Trash2, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import {
  useAcademicCalendarEvents,
  useCreateAcademicEvent,
  useDeleteAcademicEvent,
} from "@/hooks/useAcademicCalendar";

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  event_type: z.string().min(1, "Type is required"),
  start_date: z.string().min(1, "Start date is required"),
  end_date: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const EVENT_TYPES = [
  "semester_start",
  "semester_end",
  "exam_period",
  "holiday",
  "registration",
  "other",
];

const AcademicCalendarManager = () => {
  const { data: events = [], isLoading } = useAcademicCalendarEvents();
  const createMutation = useCreateAcademicEvent();
  const deleteMutation = useDeleteAcademicEvent();
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { title: "", event_type: "", start_date: "", end_date: "" },
  });

  const onSubmit = (data: FormData) => {
    createMutation.mutate(data, {
      onSuccess: () => {
        toast.success("Event created");
        form.reset();
      },
      onError: (err) => toast.error(err.message),
    });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Academic Calendar</h1>

      <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
        <div
          className="px-6 py-4 flex items-center gap-2"
          style={{
            background:
              "linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)",
          }}
        >
          <CalendarDays className="h-5 w-5 text-white" />
          <h2 className="text-lg font-bold tracking-tight text-white">
            Events
          </h2>
        </div>
        <div className="p-6">
          {isLoading ? (
            <Shimmer className="h-32 rounded-lg" />
          ) : events.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">
              No events yet.
            </p>
          ) : (
            <div className="space-y-2">
              {events.map((e) => (
                <div
                  key={e.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50"
                >
                  <div>
                    <span className="text-sm font-medium">{e.title}</span>
                    <Badge variant="outline" className="ms-2 text-xs">
                      {e.event_type}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-400">
                      {e.start_date}
                      {e.end_date ? ` → ${e.end_date}` : ""}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteTarget(e.id)}
                      className="h-7 w-7 p-0 text-slate-400 hover:text-red-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      <Card className="bg-white border-0 shadow-md rounded-xl p-6 max-w-2xl">
        <h2 className="text-lg font-bold tracking-tight mb-4">Add Event</h2>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="event_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger className="bg-white">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {EVENT_TYPES.map((t) => (
                            <SelectItem key={t} value={t}>
                              {t.replace(/_/g, " ")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="end_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End (optional)</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Button
              type="submit"
              disabled={createMutation.isPending}
              className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95"
            >
              {createMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}{" "}
              Add Event
            </Button>
          </form>
        </Form>
      </Card>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o: boolean) => !o && setDeleteTarget(null)}
        title="Delete event?"
        description="This will permanently remove this calendar event."
        onConfirm={() => {
          if (deleteTarget)
            deleteMutation.mutate(deleteTarget, {
              onSuccess: () => {
                toast.success("Deleted");
                setDeleteTarget(null);
              },
            });
        }}
        isPending={deleteMutation.isPending}
      />
    </div>
  );
};

export default AcademicCalendarManager;

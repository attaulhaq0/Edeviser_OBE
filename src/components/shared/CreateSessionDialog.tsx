// =============================================================================
// CreateSessionDialog — Shadcn Dialog with React Hook Form + Zod for creating
// a new study session: title, date, start time, duration (15-min increments),
// course select, CLO multi-select, description
// =============================================================================

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createStudySessionSchema,
  type CreateStudySessionInput,
} from "@/lib/schemas/planner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2, CalendarDays } from "lucide-react";

interface CourseOption {
  id: string;
  name: string;
  clos?: Array<{ id: string; title: string }>;
}

interface CreateSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: string;
  courses: CourseOption[];
  onSubmit: (data: CreateStudySessionInput) => void;
  isPending?: boolean;
}

const DURATION_OPTIONS = Array.from({ length: 16 }, (_, i) => (i + 1) * 15);

const CreateSessionDialog = ({
  open,
  onOpenChange,
  defaultDate,
  courses,
  onSubmit,
  isPending = false,
}: CreateSessionDialogProps) => {
  const form = useForm<CreateStudySessionInput>({
    resolver: zodResolver(createStudySessionSchema),
    defaultValues: {
      title: "",
      plannedDate: defaultDate ?? "",
      plannedStartTime: "09:00",
      plannedDurationMinutes: 25,
      courseId: "",
      timerMode: "pomodoro",
      description: null,
      cloIds: null,
    },
  });

   
  const selectedCourseId = form.watch("courseId");
  const selectedCourse = courses.find((c) => c.id === selectedCourseId);
  const availableCLOs = selectedCourse?.clos ?? [];
  const selectedCloIds = form.watch("cloIds") ?? [];

  const handleSubmit = (data: CreateStudySessionInput) => {
    onSubmit(data);
    form.reset();
  };

  const handleCLOToggle = (cloId: string, checked: boolean) => {
    const current = form.getValues("cloIds") ?? [];
    if (checked) {
      form.setValue("cloIds", [...current, cloId]);
    } else {
      form.setValue(
        "cloIds",
        current.filter((id) => id !== cloId)
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-blue-600" />
            Create Study Session
          </DialogTitle>
          <DialogDescription>
            Schedule a focused study block for a specific course.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Review Chapter 5" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date + Start Time */}
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="plannedDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="plannedStartTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Duration + Timer Mode */}
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="plannedDurationMinutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration</FormLabel>
                    <Select
                      value={String(field.value)}
                      onValueChange={(v) => field.onChange(Number(v))}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select duration" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {DURATION_OPTIONS.map((mins) => (
                          <SelectItem key={mins} value={String(mins)}>
                            {mins < 60
                              ? `${mins} min`
                              : `${Math.floor(mins / 60)}h${
                                  mins % 60 > 0 ? ` ${mins % 60}m` : ""
                                }`}
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
                name="timerMode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Timer Mode</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pomodoro">Pomodoro</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Course */}
            <FormField
              control={form.control}
              name="courseId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Course</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a course" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {courses.map((course) => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* CLO Multi-Select */}
            {availableCLOs.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  CLOs <span className="text-gray-400">(optional)</span>
                </Label>
                <div className="max-h-32 space-y-2 overflow-y-auto rounded-md border p-3">
                  {availableCLOs.map((clo) => {
                    const isChecked = selectedCloIds.includes(clo.id);
                    return (
                      <div key={clo.id} className="flex items-center gap-2">
                        <Checkbox
                          id={`clo-${clo.id}`}
                          checked={isChecked}
                          onCheckedChange={(checked) =>
                            handleCLOToggle(clo.id, checked === true)
                          }
                        />
                        <Label
                          htmlFor={`clo-${clo.id}`}
                          className="text-xs font-normal text-gray-700 cursor-pointer"
                        >
                          {clo.title}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Description{" "}
                    <span className="text-gray-400">(optional)</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="What will you focus on?"
                      rows={3}
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value || null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95"
              >
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Create Session
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateSessionDialog;
export type { CreateSessionDialogProps, CourseOption };

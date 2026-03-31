import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Clock, Plus, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import Shimmer from '@/components/shared/Shimmer';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import {
  useSectionTimetableSlots,
  useCreateTimetableSlot,
  useDeleteTimetableSlot,
} from '@/hooks/useTimetable';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const SLOT_TYPE_STYLES: Record<string, string> = {
  lecture: 'bg-blue-100 text-blue-700',
  lab: 'bg-green-100 text-green-700',
  tutorial: 'bg-purple-100 text-purple-700',
};

const timetableSlotSchema = z.object({
  section_id: z.string().min(1, 'Section is required'),
  day_of_week: z.number().min(0).max(6),
  start_time: z.string().min(1, 'Start time is required'),
  end_time: z.string().min(1, 'End time is required'),
  room: z.string().optional(),
  slot_type: z.enum(['lecture', 'lab', 'tutorial']),
});

type TimetableSlotFormData = z.infer<typeof timetableSlotSchema>;

/** Fetch all sections with course info for the dropdown. */
const useSectionsWithCourses = () => {
  return useQuery({
    queryKey: queryKeys.courseSections.lists(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('course_sections')
        .select('id, section_code, course_id, courses(name)')
        .order('section_code');
      if (error) throw error;
      return (data ?? []).map((s) => ({
        id: s.id,
        label: `${(s.courses as { name: string } | null)?.name ?? 'Course'} — Section ${s.section_code}`,
        course_name: (s.courses as { name: string } | null)?.name ?? '',
        section_code: s.section_code,
      }));
    },
    staleTime: 5 * 60_000,
  });
};

const TimetableManager = () => {
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const { data: sections = [], isLoading: sectionsLoading } = useSectionsWithCourses();
  const { data: slots = [], isLoading: slotsLoading } = useSectionTimetableSlots(
    selectedSection || undefined,
  );
  const createSlot = useCreateTimetableSlot();
  const deleteSlot = useDeleteTimetableSlot();

  const form = useForm<TimetableSlotFormData>({
    resolver: zodResolver(timetableSlotSchema),
    defaultValues: {
      section_id: '',
      day_of_week: 1,
      start_time: '09:00',
      end_time: '10:00',
      room: '',
      slot_type: 'lecture',
    },
  });

  const onSubmit = (data: TimetableSlotFormData) => {
    createSlot.mutate(
      {
        section_id: data.section_id,
        day_of_week: data.day_of_week,
        start_time: data.start_time,
        end_time: data.end_time,
        room: data.room || undefined,
        slot_type: data.slot_type,
      },
      {
        onSuccess: () => {
          toast.success('Timetable slot created');
          setDialogOpen(false);
          form.reset();
        },
        onError: (err) => toast.error(err.message),
      },
    );
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteSlot.mutate(deleteTarget, {
      onSuccess: () => {
        toast.success('Slot deleted');
        setDeleteTarget(null);
      },
      onError: (err) => toast.error(err.message),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Timetable Management</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95">
              <Plus className="h-4 w-4" /> Add Slot
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Timetable Slot</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="section_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Section</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue placeholder="Select section" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {sections.map((s) => (
                            <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="day_of_week"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Day</FormLabel>
                      <Select onValueChange={(v) => field.onChange(Number(v))} value={String(field.value)}>
                        <FormControl>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {DAYS.map((d, i) => (
                            <SelectItem key={i} value={String(i)}>{d}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="start_time"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Time</FormLabel>
                        <FormControl><Input type="time" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="end_time"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Time</FormLabel>
                        <FormControl><Input type="time" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="room"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Room (optional)</FormLabel>
                      <FormControl><Input placeholder="e.g. Room 301" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="slot_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Slot Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="lecture">Lecture</SelectItem>
                          <SelectItem value="lab">Lab</SelectItem>
                          <SelectItem value="tutorial">Tutorial</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button
                  type="submit"
                  disabled={createSlot.isPending}
                  className="w-full bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95"
                >
                  {createSlot.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Create Slot
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Section filter */}
      <Card className="bg-white border-0 shadow-md rounded-xl p-4">
        <div className="flex items-center gap-4">
          <label htmlFor="section-filter" className="text-sm font-medium text-gray-600">Filter by Section:</label>
          {sectionsLoading ? (
            <Shimmer className="h-9 w-64 rounded-lg" />
          ) : (
            <Select value={selectedSection} onValueChange={setSelectedSection}>
              <SelectTrigger className="w-72">
                <SelectValue placeholder="All sections" />
              </SelectTrigger>
              <SelectContent>
                {sections.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </Card>

      {/* Slots list */}
      <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
        <div
          className="px-6 py-4 flex items-center gap-2"
          style={{ background: 'linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)' }}
        >
          <Clock className="h-5 w-5 text-white" />
          <h2 className="text-lg font-bold tracking-tight text-white">Timetable Slots</h2>
        </div>
        <div className="p-6">
          {slotsLoading ? (
            <Shimmer className="h-40 rounded-lg" />
          ) : !selectedSection ? (
            <p className="text-sm text-gray-500 text-center py-8">
              Select a section to view and manage its timetable slots.
            </p>
          ) : slots.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">
              No timetable slots for this section yet.
            </p>
          ) : (
            <div className="space-y-2">
              {slots.map((slot) => (
                <div
                  key={slot.id}
                  className="flex items-center justify-between py-3 px-4 border border-slate-100 rounded-lg hover:bg-slate-50"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-slate-700 w-24">
                      {DAYS[slot.day_of_week]}
                    </span>
                    <span className="text-sm text-slate-600 font-mono">
                      {slot.start_time?.slice(0, 5)} – {slot.end_time?.slice(0, 5)}
                    </span>
                    <Badge className={`text-[10px] ${SLOT_TYPE_STYLES[slot.slot_type] ?? 'bg-gray-100 text-gray-700'}`}>
                      {slot.slot_type}
                    </Badge>
                    {slot.room && (
                      <span className="text-xs text-slate-400">{slot.room}</span>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteTarget(slot.id)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open: boolean) => { if (!open) setDeleteTarget(null); }}
        title="Delete Timetable Slot"
        description="Are you sure you want to delete this timetable slot? This action cannot be undone."
        onConfirm={handleDelete}
        confirmLabel="Delete"
        variant="destructive"
      />
    </div>
  );
};

export default TimetableManager;

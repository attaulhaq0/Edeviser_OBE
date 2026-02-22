import { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { parseAsString, useQueryState } from 'nuqs';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { z } from 'zod';
import { createColumns } from './bonus-events/columns';
import { DataTable } from '@/components/shared/DataTable';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import {
  useBonusEvents,
  useCreateBonusEvent,
  useUpdateBonusEvent,
  useDeleteBonusEvent,
  type BonusXPEvent,
} from '@/hooks/useBonusEvents';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Plus, Search, Loader2, Sparkles } from 'lucide-react';

// ─── Form schema (all fields required — avoids .default() type mismatch) ────

const bonusEventFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  multiplier: z.number().positive(),
  starts_at: z.string().min(1, 'Start date is required'),
  ends_at: z.string().min(1, 'End date is required'),
  is_active: z.boolean(),
});

type BonusEventFormValues = z.infer<typeof bonusEventFormSchema>;



// ─── Helpers ────────────────────────────────────────────────────────────────

/** Convert ISO datetime to datetime-local input value (YYYY-MM-DDTHH:mm) */
const isoToDatetimeLocal = (iso: string): string => {
  return format(new Date(iso), "yyyy-MM-dd'T'HH:mm");
};

/** Convert datetime-local input value to full ISO string */
const datetimeLocalToISO = (value: string): string => {
  return new Date(value).toISOString();
};

/** Check if two date ranges overlap */
const rangesOverlap = (
  startA: string,
  endA: string,
  startB: string,
  endB: string,
): boolean => {
  return startA < endB && endA > startB;
};

// ─── Form Dialog ────────────────────────────────────────────────────────────

interface BonusEventFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingEvent: BonusXPEvent | null;
  existingEvents: BonusXPEvent[];
}

const BonusEventFormDialog = ({
  open,
  onOpenChange,
  editingEvent,
  existingEvents,
}: BonusEventFormDialogProps) => {
  const isEditMode = !!editingEvent;
  const createMutation = useCreateBonusEvent();
  const updateMutation = useUpdateBonusEvent(editingEvent?.id ?? '');
  const isPending = createMutation.isPending || updateMutation.isPending;

  const form = useForm<BonusEventFormValues>({
    resolver: zodResolver(bonusEventFormSchema),
    defaultValues: {
      title: '',
      multiplier: 2,
      starts_at: '',
      ends_at: '',
      is_active: true,
    },
  });

  // Reset form when dialog opens with edit data or fresh defaults
  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (isOpen && editingEvent) {
        form.reset({
          title: editingEvent.title,
          multiplier: editingEvent.multiplier,
          starts_at: editingEvent.starts_at,
          ends_at: editingEvent.ends_at,
          is_active: editingEvent.is_active,
        });
      } else if (isOpen) {
        form.reset({
          title: '',
          multiplier: 2,
          starts_at: '',
          ends_at: '',
          is_active: true,
        });
      }
      onOpenChange(isOpen);
    },
    [editingEvent, form, onOpenChange],
  );

  const onSubmit = (data: BonusEventFormValues) => {
    // Overlap validation: check against active events (exclude current if editing)
    if (data.is_active) {
      const overlapping = existingEvents.find(
        (ev) =>
          ev.is_active &&
          ev.id !== editingEvent?.id &&
          rangesOverlap(data.starts_at, data.ends_at, ev.starts_at, ev.ends_at),
      );
      if (overlapping) {
        toast.error(
          `Date range overlaps with "${overlapping.title}". Only one active event allowed per time period.`,
        );
        return;
      }
    }

    if (isEditMode) {
      updateMutation.mutate(data, {
        onSuccess: () => {
          toast.success('Bonus event updated');
          onOpenChange(false);
        },
        onError: (err) => toast.error(err.message),
      });
    } else {
      createMutation.mutate(data, {
        onSuccess: () => {
          toast.success('Bonus event created');
          onOpenChange(false);
        },
        onError: (err) => toast.error(err.message),
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? 'Edit Bonus XP Event' : 'Create Bonus XP Event'}
          </DialogTitle>
          <DialogDescription>
            {isEditMode
              ? 'Update the bonus XP event details.'
              : 'Create a time-bounded XP multiplier event for students.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Double XP Weekend" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="multiplier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Multiplier</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      step={0.5}
                      placeholder="2"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="starts_at"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start Date & Time</FormLabel>
                  <FormControl>
                    <Input
                      type="datetime-local"
                      value={field.value ? isoToDatetimeLocal(field.value) : ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        field.onChange(val ? datetimeLocalToISO(val) : '');
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="ends_at"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>End Date & Time</FormLabel>
                  <FormControl>
                    <Input
                      type="datetime-local"
                      value={field.value ? isoToDatetimeLocal(field.value) : ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        field.onChange(val ? datetimeLocalToISO(val) : '');
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex items-center gap-3">
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={field.onChange}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </FormControl>
                  <FormLabel className="!mt-0">Active</FormLabel>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95 text-white"
              >
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {isEditMode ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

// ─── Main Page ──────────────────────────────────────────────────────────────

const BonusXPEventManager = () => {
  const [search, setSearch] = useQueryState('q', parseAsString.withDefault(''));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<BonusXPEvent | null>(null);
  const [eventToDeactivate, setEventToDeactivate] = useState<BonusXPEvent | null>(null);

  const { data, isLoading } = useBonusEvents({ search: search || undefined });
  const deleteMutation = useDeleteBonusEvent();

  const handleEdit = useCallback((event: BonusXPEvent) => {
    setEditingEvent(event);
    setDialogOpen(true);
  }, []);

  const handleCreate = useCallback(() => {
    setEditingEvent(null);
    setDialogOpen(true);
  }, []);

  const handleDialogClose = useCallback((open: boolean) => {
    setDialogOpen(open);
    if (!open) setEditingEvent(null);
  }, []);

  const columns = createColumns(handleEdit, setEventToDeactivate);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-amber-500" />
          <h1 className="text-2xl font-bold tracking-tight">Bonus XP Events</h1>
        </div>
        <Button
          className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95 text-white"
          onClick={handleCreate}
        >
          <Plus className="h-4 w-4" /> Add Event
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search events..."
            value={search}
            onChange={(e) => setSearch(e.target.value || null)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Data Table */}
      <DataTable columns={columns} data={data ?? []} isLoading={isLoading} />

      {/* Create/Edit Dialog */}
      <BonusEventFormDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        editingEvent={editingEvent}
        existingEvents={data ?? []}
      />

      {/* Deactivate Confirmation Dialog */}
      <ConfirmDialog
        open={!!eventToDeactivate}
        onOpenChange={() => setEventToDeactivate(null)}
        title="Deactivate Bonus Event"
        description={`Are you sure you want to deactivate "${eventToDeactivate?.title}"? The XP multiplier will no longer apply.`}
        variant="destructive"
        confirmLabel="Deactivate"
        isPending={deleteMutation.isPending}
        onConfirm={() => {
          if (!eventToDeactivate) return;
          deleteMutation.mutate(eventToDeactivate.id, {
            onSuccess: () => {
              toast.success(`"${eventToDeactivate.title}" has been deactivated`);
              setEventToDeactivate(null);
            },
            onError: (err) => {
              toast.error(err.message);
              setEventToDeactivate(null);
            },
          });
        }}
      />
    </div>
  );
};

export default BonusXPEventManager;

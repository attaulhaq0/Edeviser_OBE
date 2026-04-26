import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { createSaleEventSchema, type CreateSaleEventInput } from '@/lib/marketplaceSchemas';
import { useCreateSaleEvent } from '@/hooks/useSaleEvents';
import { useAdminMarketplaceItems } from '@/hooks/useMarketplaceAdmin';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface SaleEventFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SaleEventForm = ({ open, onOpenChange }: SaleEventFormProps) => {
  const { user, profile } = useAuth();
  const institutionId = ((profile as unknown as Record<string, unknown>)?.institution_id as string) ?? '';
  const { data: items } = useAdminMarketplaceItems();
  const createMutation = useCreateSaleEvent();

  const [defaultDates] = useState(() => ({
    start: new Date().toISOString(),
    end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  }));

  const form = useForm<CreateSaleEventInput>({
    resolver: zodResolver(createSaleEventSchema) as never,
    defaultValues: {
      name: '',
      discount_percentage: 10,
      start_date: defaultDates.start,
      end_date: defaultDates.end,
      item_ids: [],
    },
  });

  const onSubmit = (data: CreateSaleEventInput) => {
    createMutation.mutate(
      { ...data, institution_id: institutionId, created_by: user?.id ?? '' },
      {
        onSuccess: () => { toast.success('Sale event created'); onOpenChange(false); },
        onError: (err) => toast.error(err.message),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Sale Event</DialogTitle>
          <DialogDescription>Set up a time-limited discount on marketplace items.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem><FormLabel>Sale Name</FormLabel><FormControl><Input {...field} placeholder="Weekend Sale" /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="discount_percentage" render={({ field }) => (
              <FormItem><FormLabel>Discount (%)</FormLabel><FormControl>
                <Input type="number" min={5} max={90} {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
              </FormControl><FormMessage /></FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="start_date" render={({ field }) => (
                <FormItem><FormLabel>Start Date</FormLabel><FormControl>
                  <Input type="datetime-local" value={field.value.slice(0, 16)} onChange={(e) => field.onChange(new Date(e.target.value).toISOString())} />
                </FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="end_date" render={({ field }) => (
                <FormItem><FormLabel>End Date</FormLabel><FormControl>
                  <Input type="datetime-local" value={field.value.slice(0, 16)} onChange={(e) => field.onChange(new Date(e.target.value).toISOString())} />
                </FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <FormField control={form.control} name="item_ids" render={({ field }) => (
              <FormItem>
                <FormLabel>Items ({field.value.length} selected)</FormLabel>
                <div className="max-h-40 overflow-y-auto border rounded-lg p-2 space-y-1">
                  {(items ?? []).filter((i: Record<string, unknown>) => i.is_active).map((i: Record<string, unknown>) => (
                    <label key={i.id as string} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-50 px-2 py-1 rounded">
                      <input
                        type="checkbox"
                        checked={field.value.includes(i.id as string)}
                        onChange={(e) => {
                          const id = i.id as string;
                          field.onChange(e.target.checked ? [...field.value, id] : field.value.filter((v) => v !== id));
                        }}
                      />
                      {i.name as string} — {i.xp_price as number} XP
                    </label>
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )} />
            <Button type="submit" disabled={createMutation.isPending} className="w-full bg-gradient-to-r from-teal-500 to-blue-600 text-white active:scale-95">
              {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin me-1" />}
              Create Sale
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default SaleEventForm;

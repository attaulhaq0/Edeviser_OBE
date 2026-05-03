// =============================================================================
// SaleEventForm — Create/edit sale event with item multi-select
// =============================================================================

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createSaleEventSchema, type CreateSaleEventInput } from '@/lib/marketplaceSchemas';
import { useCreateSaleEvent } from '@/hooks/useSaleEvents';
import { useAdminMarketplaceItems } from '@/hooks/useMarketplaceAdmin';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface SaleEventFormProps {
  onClose: () => void;
}

const SaleEventForm = ({ onClose }: SaleEventFormProps) => {
  const createSale = useCreateSaleEvent();
  const { data: items } = useAdminMarketplaceItems();
  const activeItems = (items ?? []).filter((i) => i.is_active);

  const form = useForm<CreateSaleEventInput>({
    resolver: zodResolver(createSaleEventSchema) as never,
    defaultValues: {
      name: '',
      discount_percentage: 20,
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      item_ids: [],
    },
  });

  const selectedItemIds = form.watch('item_ids');

  const onSubmit = (data: CreateSaleEventInput) => {
    createSale.mutate(data, {
      onSuccess: () => {
        toast.success('Sale event created');
        onClose();
      },
      onError: (err) => toast.error(err.message),
    });
  };

  const toggleItem = (itemId: string) => {
    const current = form.getValues('item_ids');
    if (current.includes(itemId)) {
      form.setValue(
        'item_ids',
        current.filter((id) => id !== itemId),
        { shouldValidate: true },
      );
    } else {
      form.setValue('item_ids', [...current, itemId], { shouldValidate: true });
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onClose}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Create Sale Event</h1>
      </div>

      <Card className="bg-white border-0 shadow-md rounded-xl p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Weekend Flash Sale" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="discount_percentage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Discount Percentage (5–90%)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={5}
                      max={90}
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        value={field.value ? field.value.slice(0, 16) : ''}
                        onChange={(e) => field.onChange(new Date(e.target.value).toISOString())}
                      />
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
                    <FormLabel>End Date</FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        value={field.value ? field.value.slice(0, 16) : ''}
                        onChange={(e) => field.onChange(new Date(e.target.value).toISOString())}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="item_ids"
              render={() => (
                <FormItem>
                  <FormLabel>Select Items ({selectedItemIds.length} selected)</FormLabel>
                  <div className="border border-slate-200 rounded-lg max-h-60 overflow-y-auto p-3 space-y-2">
                    {activeItems.length === 0 ? (
                      <p className="text-sm text-gray-500">No active items available.</p>
                    ) : (
                      activeItems.map((item) => (
                        <label
                          key={item.id}
                          htmlFor={`sale-item-${item.id}`}
                          className="flex items-center gap-3 py-1.5 px-2 rounded-lg hover:bg-slate-50 cursor-pointer"
                        >
                          <Checkbox
                            id={`sale-item-${item.id}`}
                            checked={selectedItemIds.includes(item.id)}
                            onCheckedChange={() => toggleItem(item.id)}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{item.name}</p>
                            <p className="text-xs text-gray-500">{item.xp_price} XP · {item.category}</p>
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-center gap-3 pt-2">
              <Button
                type="submit"
                disabled={createSale.isPending}
                className="bg-gradient-to-r from-teal-500 to-blue-600 text-white active:scale-95 transition-transform duration-100"
              >
                {createSale.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Create Sale Event
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      </Card>
    </div>
  );
};

export default SaleEventForm;

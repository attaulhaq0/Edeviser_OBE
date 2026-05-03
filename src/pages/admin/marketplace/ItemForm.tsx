// =============================================================================
// ItemForm — Create/edit marketplace item form with React Hook Form + Zod
// =============================================================================

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  createMarketplaceItemSchema,
  type CreateMarketplaceItemInput,
} from '@/lib/marketplaceSchemas';
import {
  useCreateMarketplaceItem,
  useUpdateMarketplaceItem,
} from '@/hooks/useMarketplaceAdmin';
import type { AdminMarketplaceItem } from '@/hooks/useMarketplaceAdmin';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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

interface ItemFormProps {
  item: AdminMarketplaceItem | null;
  onClose: () => void;
}

const subCategoryOptions: Record<string, Array<{ value: string; label: string }>> = {
  cosmetic: [
    { value: 'profile_theme', label: 'Profile Theme' },
    { value: 'avatar_frame', label: 'Avatar Frame' },
    { value: 'display_title', label: 'Display Title' },
  ],
  educational_perk: [
    { value: 'extra_quiz_attempt', label: 'Extra Quiz Attempt' },
    { value: 'deadline_extension', label: 'Deadline Extension' },
    { value: 'hint_token', label: 'Hint Token Pack' },
  ],
  power_up: [
    { value: 'xp_boost', label: 'XP Boost' },
    { value: 'streak_shield', label: 'Streak Shield' },
  ],
};

const ItemForm = ({ item, onClose }: ItemFormProps) => {
  const isEditing = !!item;
  const createItem = useCreateMarketplaceItem();
  const updateItem = useUpdateMarketplaceItem();

  const form = useForm<CreateMarketplaceItemInput>({
    resolver: zodResolver(createMarketplaceItemSchema) as never,
    defaultValues: item
      ? {
          name: item.name,
          description: item.description,
          category: item.category as CreateMarketplaceItemInput['category'],
          sub_category: item.sub_category as CreateMarketplaceItemInput['sub_category'],
          xp_price: item.xp_price,
          level_requirement: item.level_requirement,
          stock_type: item.stock_type as CreateMarketplaceItemInput['stock_type'],
          stock_quantity: item.stock_quantity,
          icon_identifier: item.icon_identifier,
          metadata: item.metadata,
        }
      : {
          name: '',
          description: '',
          category: 'cosmetic',
          sub_category: 'profile_theme',
          xp_price: 100,
          level_requirement: 0,
          stock_type: 'unlimited',
          stock_quantity: null,
          icon_identifier: 'sparkles',
        },
  });

  const watchCategory = form.watch('category');
  const watchStockType = form.watch('stock_type');

  const onSubmit = (data: CreateMarketplaceItemInput) => {
    if (isEditing && item) {
      updateItem.mutate(
        { itemId: item.id, data },
        {
          onSuccess: () => {
            toast.success('Item updated');
            onClose();
          },
          onError: (err) => toast.error(err.message),
        },
      );
    } else {
      createItem.mutate(data, {
        onSuccess: () => {
          toast.success('Item created');
          onClose();
        },
        onError: (err) => toast.error(err.message),
      });
    }
  };

  const isPending = createItem.isPending || updateItem.isPending;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onClose}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">
          {isEditing ? 'Edit Item' : 'Create Item'}
        </h1>
      </div>

      <Card className="bg-white border-0 shadow-md rounded-xl p-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Ocean Blue Theme" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Describe the item..." rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="cosmetic">Cosmetic</SelectItem>
                        <SelectItem value="educational_perk">Educational Perk</SelectItem>
                        <SelectItem value="power_up">Power-up</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sub_category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sub-Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select sub-category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(subCategoryOptions[watchCategory] ?? []).map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="xp_price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>XP Price</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="level_requirement"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Level Requirement</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="stock_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stock Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select stock type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="unlimited">Unlimited</SelectItem>
                        <SelectItem value="limited">Limited</SelectItem>
                        <SelectItem value="one_per_student">One per Student</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {watchStockType === 'limited' && (
                <FormField
                  control={form.control}
                  name="stock_quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stock Quantity</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : null)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <FormField
              control={form.control}
              name="icon_identifier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Icon Identifier</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. sparkles, shield, zap" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-center gap-3 pt-2">
              <Button
                type="submit"
                disabled={isPending}
                className="bg-gradient-to-r from-teal-500 to-blue-600 text-white active:scale-95 transition-transform duration-100"
              >
                {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {isEditing ? 'Update Item' : 'Create Item'}
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

export default ItemForm;

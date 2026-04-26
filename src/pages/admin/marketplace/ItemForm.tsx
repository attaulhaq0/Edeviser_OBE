import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { createMarketplaceItemSchema, type CreateMarketplaceItemInput } from '@/lib/marketplaceSchemas';
import { useCreateMarketplaceItem, useUpdateMarketplaceItem } from '@/hooks/useMarketplaceAdmin';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface ItemFormProps {
  item: Record<string, unknown> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ItemForm = ({ item, open, onOpenChange }: ItemFormProps) => {
  const { profile } = useAuth();
  const institutionId = ((profile as unknown as Record<string, unknown>)?.institution_id as string) ?? '';
  const isEditing = !!item;

  const form = useForm<CreateMarketplaceItemInput>({
    resolver: zodResolver(createMarketplaceItemSchema) as never,
    defaultValues: {
      name: (item?.name as string) ?? '',
      description: (item?.description as string) ?? '',
      category: (item?.category as CreateMarketplaceItemInput['category']) ?? 'cosmetic',
      sub_category: (item?.sub_category as CreateMarketplaceItemInput['sub_category']) ?? 'profile_theme',
      xp_price: (item?.xp_price as number) ?? 100,
      level_requirement: (item?.level_requirement as number) ?? 0,
      stock_type: (item?.stock_type as CreateMarketplaceItemInput['stock_type']) ?? 'unlimited',
      stock_quantity: (item?.stock_quantity as number) ?? null,
      icon_identifier: (item?.icon_identifier as string) ?? 'gift',
    },
  });

  const createMutation = useCreateMarketplaceItem();
  const updateMutation = useUpdateMarketplaceItem();

  const onSubmit = (data: CreateMarketplaceItemInput) => {
    if (isEditing) {
      updateMutation.mutate(
        { id: item.id as string, ...data },
        {
          onSuccess: () => { toast.success('Item updated'); onOpenChange(false); },
          onError: (err) => toast.error(err.message),
        },
      );
    } else {
      createMutation.mutate(
        { ...data, institution_id: institutionId },
        {
          onSuccess: () => { toast.success('Item created'); onOpenChange(false); },
          onError: (err) => toast.error(err.message),
        },
      );
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Item' : 'Create Item'}</DialogTitle>
          <DialogDescription>Fill in the marketplace item details.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem><FormLabel>Description</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem><FormLabel>Category</FormLabel><FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cosmetic">Cosmetic</SelectItem>
                      <SelectItem value="educational_perk">Educational Perk</SelectItem>
                      <SelectItem value="power_up">Power-up</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="sub_category" render={({ field }) => (
                <FormItem><FormLabel>Sub-category</FormLabel><FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="profile_theme">Profile Theme</SelectItem>
                      <SelectItem value="avatar_frame">Avatar Frame</SelectItem>
                      <SelectItem value="display_title">Display Title</SelectItem>
                      <SelectItem value="extra_quiz_attempt">Extra Quiz Attempt</SelectItem>
                      <SelectItem value="deadline_extension">Deadline Extension</SelectItem>
                      <SelectItem value="hint_token">Hint Token</SelectItem>
                      <SelectItem value="xp_boost">XP Boost</SelectItem>
                      <SelectItem value="streak_shield">Streak Shield</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="xp_price" render={({ field }) => (
                <FormItem><FormLabel>XP Price</FormLabel><FormControl>
                  <Input type="number" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                </FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="level_requirement" render={({ field }) => (
                <FormItem><FormLabel>Level Requirement</FormLabel><FormControl>
                  <Input type="number" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                </FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="stock_type" render={({ field }) => (
                <FormItem><FormLabel>Stock Type</FormLabel><FormControl>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unlimited">Unlimited</SelectItem>
                      <SelectItem value="limited">Limited</SelectItem>
                      <SelectItem value="one_per_student">One per Student</SelectItem>
                    </SelectContent>
                  </Select>
                </FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="icon_identifier" render={({ field }) => (
                <FormItem><FormLabel>Icon</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <Button type="submit" disabled={isPending} className="w-full bg-gradient-to-r from-teal-500 to-blue-600 text-white active:scale-95">
              {isPending && <Loader2 className="h-4 w-4 animate-spin me-1" />}
              {isEditing ? 'Update' : 'Create'}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default ItemForm;

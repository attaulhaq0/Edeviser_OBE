// Task 113.1: Graduate Attribute Manager page

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import Shimmer from '@/components/shared/Shimmer';
import { Plus, Loader2, Trash2, Award } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import {
  useGraduateAttributes,
  useCreateGraduateAttribute,
  useDeleteGraduateAttribute,
} from '@/hooks/useGraduateAttributes';

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  code: z.string().min(1, 'Code is required'),
  description: z.string().optional(),
});

const GraduateAttributeManager = () => {
  const { profile } = useAuth();
  const institutionId = profile?.institution_id;
  const { data: attributes = [], isLoading } = useGraduateAttributes(institutionId);
  const createMutation = useCreateGraduateAttribute();
  const deleteMutation = useDeleteGraduateAttribute();
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { title: '', code: '', description: '' },
  });

  const onSubmit = (data: z.infer<typeof schema>) => {
    createMutation.mutate(data, {
      onSuccess: () => { toast.success('Graduate attribute created'); form.reset(); },
      onError: (err) => toast.error(err.message),
    });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Graduate Attributes</h1>

      <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
        <div className="px-6 py-4 flex items-center gap-2" style={{ background: 'linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)' }}>
          <Award className="h-5 w-5 text-white" />
          <h2 className="text-lg font-bold tracking-tight text-white">Attributes</h2>
        </div>
        <div className="p-6">
          {isLoading ? <Shimmer className="h-32 rounded-lg" /> : attributes.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No graduate attributes defined yet.</p>
          ) : (
            <div className="space-y-2">
              {attributes.map((attr) => (
                <div key={attr.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50">
                  <div>
                    <span className="text-xs font-mono text-slate-400 me-2">{attr.code}</span>
                    <span className="text-sm font-medium">{attr.title}</span>
                    {attr.description && <p className="text-xs text-slate-500 mt-0.5">{attr.description}</p>}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(attr.id)} className="text-slate-400 hover:text-red-500">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      <Card className="bg-white border-0 shadow-md rounded-xl p-6 max-w-2xl">
        <h2 className="text-lg font-bold tracking-tight mb-4">Add Graduate Attribute</h2>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="code" render={({ field }) => (
                <FormItem><FormLabel>Code</FormLabel><FormControl><Input placeholder="GA1" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem><FormLabel>Description (optional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <Button type="submit" disabled={createMutation.isPending} className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95">
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add
            </Button>
          </form>
        </Form>
      </Card>

      <ConfirmDialog open={!!deleteTarget} onOpenChange={(o: boolean) => !o && setDeleteTarget(null)} title="Delete attribute?" description="This will permanently remove this graduate attribute and its mappings." onConfirm={() => { if (deleteTarget) deleteMutation.mutate(deleteTarget, { onSuccess: () => { toast.success('Deleted'); setDeleteTarget(null); } }); }} isPending={deleteMutation.isPending} />
    </div>
  );
};

export default GraduateAttributeManager;

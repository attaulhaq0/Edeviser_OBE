import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import Shimmer from '@/components/shared/Shimmer';
import { Plus, Loader2, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import { useFeeStructures, useCreateFeeStructure, type FeeStructure } from '@/hooks/useFees';

const schema = z.object({
  program_id: z.string().min(1),
  semester_id: z.string().min(1),
  fee_type: z.string().min(1, 'Fee type is required'),
  amount: z.number().min(0),
  currency: z.string().min(1),
  due_date: z.string().min(1),
});

type FeeFormData = z.infer<typeof schema>;

const FeeManager = () => {
  const { data: fees = [], isLoading } = useFeeStructures();
  const createMutation = useCreateFeeStructure();
  const form = useForm<FeeFormData>({ resolver: zodResolver(schema), defaultValues: { program_id: '', semester_id: '', fee_type: '', amount: 0, currency: 'USD', due_date: '' } });

  const onSubmit = (data: FeeFormData) => {
    createMutation.mutate(data as Omit<FeeStructure, 'id' | 'created_at'>, {
      onSuccess: () => { toast.success('Fee structure created'); form.reset(); },
      onError: (err) => toast.error(err.message),
    });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Fee Management</h1>

      <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
        <div className="px-6 py-4 flex items-center gap-2" style={{ background: 'linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)' }}>
          <DollarSign className="h-5 w-5 text-white" />
          <h2 className="text-lg font-bold tracking-tight text-white">Fee Structures</h2>
        </div>
        <div className="p-6">
          {isLoading ? <Shimmer className="h-32 rounded-lg" /> : fees.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No fee structures yet.</p>
          ) : (
            <div className="space-y-2">
              {fees.map((f) => (
                <div key={f.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100">
                  <div>
                    <span className="text-sm font-medium">{f.fee_type}</span>
                    <Badge variant="outline" className="ms-2 text-xs">${f.amount} {f.currency}</Badge>
                  </div>
                  <span className="text-xs text-slate-400">Due: {f.due_date}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      <Card className="bg-white border-0 shadow-md rounded-xl p-6 max-w-2xl">
        <h2 className="text-lg font-bold tracking-tight mb-4">Add Fee Structure</h2>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="fee_type" render={({ field }) => (
              <FormItem><FormLabel>Fee Type</FormLabel><FormControl><Input {...field} placeholder="e.g. tuition, lab, library, exam" /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="grid grid-cols-3 gap-4">
              <FormField control={form.control} name="amount" render={({ field }) => (
                <FormItem><FormLabel>Amount</FormLabel><FormControl><Input type="number" {...field} onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="due_date" render={({ field }) => (
                <FormItem><FormLabel>Due Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="program_id" render={({ field }) => (
                <FormItem><FormLabel>Program ID</FormLabel><FormControl><Input {...field} placeholder="UUID" /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <FormField control={form.control} name="semester_id" render={({ field }) => (
              <FormItem><FormLabel>Semester ID</FormLabel><FormControl><Input {...field} placeholder="UUID" /></FormControl><FormMessage /></FormItem>
            )} />
            <Button type="submit" disabled={createMutation.isPending} className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95">
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Create
            </Button>
          </form>
        </Form>
      </Card>
    </div>
  );
};

export default FeeManager;

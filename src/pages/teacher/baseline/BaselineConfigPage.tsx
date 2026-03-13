import { useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import Shimmer from '@/components/shared/Shimmer';
import { useBaselineTestConfig, useUpdateBaselineConfig } from '@/hooks/useBaselineTests';
import { Settings, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const configSchema = z.object({
  time_limit_minutes: z.coerce.number().int().min(5).max(60),
  is_active: z.boolean(),
});

type ConfigFormData = z.infer<typeof configSchema>;

const BaselineConfigPage = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const { data: config, isLoading } = useBaselineTestConfig(courseId ?? '');
  const updateConfig = useUpdateBaselineConfig();

  const form = useForm<ConfigFormData>({
    resolver: zodResolver(configSchema),
    values: {
      time_limit_minutes: config?.time_limit_minutes ?? 15,
      is_active: config?.is_active ?? false,
    },
  });

  const onSubmit = (data: ConfigFormData) => {
    if (!courseId) return;
    updateConfig.mutate(
      { course_id: courseId, ...data },
      {
        onSuccess: () => toast.success('Baseline test configuration saved'),
        onError: (err) => toast.error(err.message),
      },
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Shimmer className="h-8 w-64 rounded-lg" />
        <Shimmer className="h-48 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="h-5 w-5 text-gray-600" />
        <h1 className="text-2xl font-bold tracking-tight">Baseline Test Configuration</h1>
      </div>

      <Card className="bg-white border-0 shadow-md rounded-xl p-6 max-w-2xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="time_limit_minutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Time Limit (minutes)</FormLabel>
                  <FormControl>
                    <Input type="number" min={5} max={60} {...field} />
                  </FormControl>
                  <FormDescription>
                    Students will have this many minutes to complete the baseline test (5–60).
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Active</FormLabel>
                    <FormDescription>
                      When active, the baseline test appears in the student onboarding flow.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <Button
              type="submit"
              disabled={updateConfig.isPending}
              className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95"
            >
              {updateConfig.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Configuration
            </Button>
          </form>
        </Form>
      </Card>
    </div>
  );
};

export default BaselineConfigPage;

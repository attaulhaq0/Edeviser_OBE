import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { smartGoalTemplateSchema, type SmartGoalTemplate } from '@/lib/onboardingSchemas';
import { composeGoalText } from '@/lib/goalTemplates';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

export interface CourseOption {
  id: string;
  name: string;
}

export interface SmartGoalFormProps {
  courses: CourseOption[];
  /** Pre-fill the Relevant field with a course name */
  defaultRelevant?: string;
  /** Pre-fill the Time-bound field with an ISO date */
  defaultTimebound?: string;
  onSubmit: (data: SmartGoalTemplate & { composedText: string }) => void;
  isPending?: boolean;
}

const SmartGoalForm = ({
  courses,
  defaultRelevant = '',
  defaultTimebound = '',
  onSubmit,
  isPending = false,
}: SmartGoalFormProps) => {
  const form = useForm<SmartGoalTemplate>({
    resolver: zodResolver(smartGoalTemplateSchema),
    defaultValues: {
      specific: '',
      measurable: '',
      achievable: '',
      relevant: defaultRelevant,
      timebound: defaultTimebound,
    },
  });

  const handleSubmit = (data: SmartGoalTemplate) => {
    const composedText = composeGoalText(data);
    onSubmit({ ...data, composedText });
  };

  return (
    <Card className="bg-white border-0 shadow-md rounded-xl p-6">
      <h3 className="text-sm font-bold text-gray-900 mb-4">SMART Goal Template</h3>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="specific"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-bold text-gray-700">
                  Specific — What will you accomplish?
                </FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Complete all practice problems for Chapter 3" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="measurable"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-bold text-gray-700">
                  Measurable — How will you track progress?
                </FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Score at least 80% on the practice quiz" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="achievable"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-bold text-gray-700">
                  Achievable — Why is this realistic?
                </FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Based on my current progress and available study time" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="relevant"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-bold text-gray-700">
                  Relevant — Which course or outcome?
                </FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Select a course" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {courses.map((course) => (
                      <SelectItem key={course.id} value={course.name}>
                        {course.name}
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
            name="timebound"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-bold text-gray-700">
                  Time-bound — By when?
                </FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type="submit"
            disabled={isPending}
            className="w-full bg-gradient-to-r from-teal-500 to-blue-600 text-white font-semibold active:scale-95 transition-transform duration-100"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Create Goal
          </Button>
        </form>
      </Form>
    </Card>
  );
};

export default SmartGoalForm;

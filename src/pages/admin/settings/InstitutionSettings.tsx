import { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { institutionSettingsSchema, type InstitutionSettingsFormData } from '@/lib/schemas/institutionSettings';
import { useInstitutionSettings, useUpsertInstitutionSettings } from '@/hooks/useInstitutionSettings';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import Shimmer from '@/components/shared/Shimmer';
import ProgramAccreditationManager from '@/components/shared/ProgramAccreditationManager';
import { Loader2, Settings, GraduationCap, Plus, Trash2 } from 'lucide-react';
import { DEFAULT_GRADE_SCALES, type AccreditationBody } from '@/types/app';

const ACCREDITATION_BODIES: Array<{ value: AccreditationBody; label: string }> = [
  { value: 'HEC', label: 'HEC — Higher Education Commission' },
  { value: 'QQA', label: 'QQA — Quality Assurance Authority' },
  { value: 'ABET', label: 'ABET — Accreditation Board for Engineering & Technology' },
  { value: 'NCAAA', label: 'NCAAA — National Commission for Academic Accreditation' },
  { value: 'AACSB', label: 'AACSB — Association to Advance Collegiate Schools of Business' },
  { value: 'Generic', label: 'Generic — General Format' },
];

const InstitutionSettings = () => {
  const { data: settings, isLoading } = useInstitutionSettings();
  const mutation = useUpsertInstitutionSettings();

  const form = useForm<InstitutionSettingsFormData>({
    resolver: zodResolver(institutionSettingsSchema),
    defaultValues: {
      attainment_thresholds: { excellent: 85, satisfactory: 70, developing: 50 },
      success_threshold: 70,
      accreditation_body: 'Generic',
      grade_scales: DEFAULT_GRADE_SCALES,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'grade_scales',
  });

  useEffect(() => {
    if (settings) {
      form.reset({
        attainment_thresholds: settings.attainment_thresholds,
        success_threshold: settings.success_threshold,
        accreditation_body: settings.accreditation_body,
        grade_scales: settings.grade_scales,
      });
    }
  }, [settings, form]);

  const onSubmit = (data: InstitutionSettingsFormData) => {
    // Validate threshold ordering: developing < satisfactory < excellent
    const { excellent, satisfactory, developing } = data.attainment_thresholds;
    if (developing >= satisfactory || satisfactory >= excellent) {
      form.setError('attainment_thresholds.developing', {
        message: 'Thresholds must satisfy: developing < satisfactory < excellent',
      });
      return;
    }

    mutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Shimmer className="h-8 w-64 rounded-lg" />
        <Shimmer className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Institution Settings</h1>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Attainment Thresholds Card */}
          <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
            <div
              className="px-6 py-4 flex items-center gap-2"
              style={{ background: 'linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)' }}
            >
              <Settings className="h-5 w-5 text-white" />
              <h2 className="text-lg font-bold tracking-tight text-white">
                Attainment Thresholds
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-500">
                Configure the percentage thresholds for attainment level classification across all dashboards, reports, and AI predictions.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="attainment_thresholds.excellent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Excellent (≥)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                          data-testid="threshold-excellent"
                        />
                      </FormControl>
                      <FormDescription>Default: 85%</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="attainment_thresholds.satisfactory"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Satisfactory (≥)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                          data-testid="threshold-satisfactory"
                        />
                      </FormControl>
                      <FormDescription>Default: 70%</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="attainment_thresholds.developing"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Developing (≥)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                          data-testid="threshold-developing"
                        />
                      </FormControl>
                      <FormDescription>Default: 50%</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="success_threshold"
                render={({ field }) => (
                  <FormItem className="max-w-xs">
                    <FormLabel>Success Threshold (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        data-testid="success-threshold"
                      />
                    </FormControl>
                    <FormDescription>
                      Percentage of students who must achieve Satisfactory or above for a PLO to be considered &quot;met&quot;. Default: 70%
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </Card>

          {/* Accreditation Body Card */}
          <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
            <div
              className="px-6 py-4 flex items-center gap-2"
              style={{ background: 'linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)' }}
            >
              <GraduationCap className="h-5 w-5 text-white" />
              <h2 className="text-lg font-bold tracking-tight text-white">
                Accreditation Body
              </h2>
            </div>
            <div className="p-6">
              <FormField
                control={form.control}
                name="accreditation_body"
                render={({ field }) => (
                  <FormItem className="max-w-md">
                    <FormLabel>Primary Accreditation Body</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-white" data-testid="accreditation-body-select">
                          <SelectValue placeholder="Select accreditation body" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ACCREDITATION_BODIES.map((body) => (
                          <SelectItem key={body.value} value={body.value}>
                            {body.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Determines the default report template and PLO naming conventions.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </Card>

          {/* Grade Scales Card */}
          <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
            <div
              className="px-6 py-4 flex items-center gap-2"
              style={{ background: 'linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)' }}
            >
              <GraduationCap className="h-5 w-5 text-white" />
              <h2 className="text-lg font-bold tracking-tight text-white">
                Grade Scales
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-500">
                Configure letter grade mapping for the gradebook. Each row defines a letter grade with its percentage range and GPA points.
              </p>

              <div className="space-y-3">
                {fields.map((field, index) => (
                  <div key={field.id} className="grid grid-cols-5 gap-3 items-end">
                    <FormField
                      control={form.control}
                      name={`grade_scales.${index}.letter`}
                      render={({ field: f }) => (
                        <FormItem>
                          {index === 0 && <FormLabel>Letter</FormLabel>}
                          <FormControl>
                            <Input {...f} placeholder="A" data-testid={`grade-letter-${index}`} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`grade_scales.${index}.min_percent`}
                      render={({ field: f }) => (
                        <FormItem>
                          {index === 0 && <FormLabel>Min %</FormLabel>}
                          <FormControl>
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              {...f}
                              onChange={(e) => f.onChange(Number(e.target.value))}
                              data-testid={`grade-min-${index}`}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`grade_scales.${index}.max_percent`}
                      render={({ field: f }) => (
                        <FormItem>
                          {index === 0 && <FormLabel>Max %</FormLabel>}
                          <FormControl>
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              {...f}
                              onChange={(e) => f.onChange(Number(e.target.value))}
                              data-testid={`grade-max-${index}`}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`grade_scales.${index}.gpa_points`}
                      render={({ field: f }) => (
                        <FormItem>
                          {index === 0 && <FormLabel>GPA</FormLabel>}
                          <FormControl>
                            <Input
                              type="number"
                              min={0}
                              max={4}
                              step={0.1}
                              {...f}
                              onChange={(e) => f.onChange(Number(e.target.value))}
                              data-testid={`grade-gpa-${index}`}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(index)}
                      disabled={fields.length <= 1}
                      className="text-red-500 hover:text-red-700"
                      data-testid={`grade-remove-${index}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ letter: '', min_percent: 0, max_percent: 0, gpa_points: 0 })}
                data-testid="add-grade-scale"
              >
                <Plus className="h-4 w-4" />
                Add Grade
              </Button>
            </div>
          </Card>

          {/* Submit */}
          <Button
            type="submit"
            disabled={mutation.isPending}
            className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95"
            data-testid="save-settings"
          >
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Settings
          </Button>
        </form>
      </Form>

      {/* Program Accreditations Section */}
      <ProgramAccreditationManager />
    </div>
  );
};

export default InstitutionSettings;

import { useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  institutionSettingsSchema,
  type InstitutionSettingsFormData,
} from "@/lib/schemas/institutionSettings";
import {
  useInstitutionSettings,
  useUpsertInstitutionSettings,
} from "@/hooks/useInstitutionSettings";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Shimmer from "@/components/shared/Shimmer";
import ProgramAccreditationManager from "@/components/shared/ProgramAccreditationManager";
import { Switch } from "@/components/ui/switch";
import { useTranslation } from "react-i18next";
import {
  Loader2,
  Settings,
  GraduationCap,
  Plus,
  Trash2,
  Flame,
  Trophy,
  Globe,
} from "lucide-react";
import { DEFAULT_GRADE_SCALES, type AccreditationBody } from "@/types/app";
import { DEFAULT_LEAGUE_THRESHOLDS } from "@/lib/leagueTier";

const ACCREDITATION_BODIES: Array<{ value: AccreditationBody; label: string }> =
  [
    { value: "HEC", label: "HEC — Higher Education Commission" },
    { value: "QQA", label: "QQA — Quality Assurance Authority" },
    {
      value: "ABET",
      label: "ABET — Accreditation Board for Engineering & Technology",
    },
    {
      value: "NCAAA",
      label: "NCAAA — National Commission for Academic Accreditation",
    },
    {
      value: "AACSB",
      label: "AACSB — Association to Advance Collegiate Schools of Business",
    },
    { value: "Generic", label: "Generic — General Format" },
  ];

const InstitutionSettings = () => {
  const { t } = useTranslation("admin");
  const { data: settings, isLoading } = useInstitutionSettings();
  const mutation = useUpsertInstitutionSettings();

  const form = useForm<InstitutionSettingsFormData>({
    resolver: zodResolver(institutionSettingsSchema),
    defaultValues: {
      attainment_thresholds: {
        excellent: 85,
        satisfactory: 70,
        developing: 50,
      },
      success_threshold: 70,
      accreditation_body: "Generic",
      grade_scales: DEFAULT_GRADE_SCALES,
      streak_sabbatical_enabled: false,
      league_thresholds: DEFAULT_LEAGUE_THRESHOLDS,
      default_language: "en",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "grade_scales",
  });

  useEffect(() => {
    if (settings) {
      form.reset({
        attainment_thresholds: settings.attainment_thresholds,
        success_threshold: settings.success_threshold,
        accreditation_body: settings.accreditation_body,
        grade_scales: settings.grade_scales,
        streak_sabbatical_enabled: settings.streak_sabbatical_enabled ?? false,
        league_thresholds:
          settings.league_thresholds ?? DEFAULT_LEAGUE_THRESHOLDS,
        default_language: (settings.default_language === "ar" ? "ar" : "en") as
          | "en"
          | "ar",
      });
    }
  }, [settings, form]);

  const onSubmit = (data: InstitutionSettingsFormData) => {
    // Validate threshold ordering: developing < satisfactory < excellent
    const { excellent, satisfactory, developing } = data.attainment_thresholds;
    if (developing >= satisfactory || satisfactory >= excellent) {
      form.setError("attainment_thresholds.developing", {
        message:
          "Thresholds must satisfy: developing < satisfactory < excellent",
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
      <h1 className="text-2xl font-bold tracking-tight">
        Institution Settings
      </h1>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Attainment Thresholds Card */}
          <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
            <div
              className="px-6 py-4 flex items-center gap-2"
              style={{
                background:
                  "linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)",
              }}
            >
              <Settings className="h-5 w-5 text-white" />
              <h2 className="text-lg font-bold tracking-tight text-white">
                Attainment Thresholds
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-500">
                Configure the percentage thresholds for attainment level
                classification across all dashboards, reports, and AI
                predictions.
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
                          onChange={(e) =>
                            field.onChange(Number(e.target.value))
                          }
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
                          onChange={(e) =>
                            field.onChange(Number(e.target.value))
                          }
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
                          onChange={(e) =>
                            field.onChange(Number(e.target.value))
                          }
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
                      Percentage of students who must achieve Satisfactory or
                      above for a PLO to be considered &quot;met&quot;. Default:
                      70%
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
              style={{
                background:
                  "linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)",
              }}
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
                        <SelectTrigger
                          className="bg-white"
                          data-testid="accreditation-body-select"
                        >
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
                      Determines the default report template and PLO naming
                      conventions.
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
              style={{
                background:
                  "linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)",
              }}
            >
              <GraduationCap className="h-5 w-5 text-white" />
              <h2 className="text-lg font-bold tracking-tight text-white">
                Grade Scales
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-500">
                Configure letter grade mapping for the gradebook. Each row
                defines a letter grade with its percentage range and GPA points.
              </p>

              <div className="space-y-3">
                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="grid grid-cols-5 gap-3 items-end"
                  >
                    <FormField
                      control={form.control}
                      name={`grade_scales.${index}.letter`}
                      render={({ field: f }) => (
                        <FormItem>
                          {index === 0 && <FormLabel>Letter</FormLabel>}
                          <FormControl>
                            <Input
                              {...f}
                              placeholder="A"
                              data-testid={`grade-letter-${index}`}
                            />
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
                              onChange={(e) =>
                                f.onChange(Number(e.target.value))
                              }
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
                              onChange={(e) =>
                                f.onChange(Number(e.target.value))
                              }
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
                              onChange={(e) =>
                                f.onChange(Number(e.target.value))
                              }
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
                onClick={() =>
                  append({
                    letter: "",
                    min_percent: 0,
                    max_percent: 0,
                    gpa_points: 0,
                  })
                }
                data-testid="add-grade-scale"
              >
                <Plus className="h-4 w-4" />
                Add Grade
              </Button>
            </div>
          </Card>

          {/* Streak Sabbatical Card — Requirement 125.3, 125.4 */}
          <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
            <div
              className="px-6 py-4 flex items-center gap-2"
              style={{
                background:
                  "linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)",
              }}
            >
              <Flame className="h-5 w-5 text-white" />
              <h2 className="text-lg font-bold tracking-tight text-white">
                Streak Sabbatical
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <FormField
                control={form.control}
                name="streak_sabbatical_enabled"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border border-slate-200 p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm font-medium">
                        Enable Streak Sabbatical
                      </FormLabel>
                      <FormDescription className="text-xs text-gray-500">
                        When enabled, weekends (Saturday &amp; Sunday) will not
                        count toward streak requirements. Changes apply from the
                        next calendar day.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="streak-sabbatical-toggle"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </Card>

          {/* League Tier Thresholds Card — Requirement 132.5 */}
          <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
            <div
              className="px-6 py-4 flex items-center gap-2"
              style={{
                background:
                  "linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)",
              }}
            >
              <Trophy className="h-5 w-5 text-white" />
              <h2 className="text-lg font-bold tracking-tight text-white">
                League Tier Thresholds
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-500">
                Configure the cumulative XP thresholds for each League Tier.
                Students are assigned to tiers based on their total XP.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <FormField
                  control={form.control}
                  name="league_thresholds.bronze"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bronze (≥ XP)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          {...field}
                          onChange={(e) =>
                            field.onChange(Number(e.target.value))
                          }
                          data-testid="league-bronze"
                        />
                      </FormControl>
                      <FormDescription>Default: 0</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="league_thresholds.silver"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Silver (≥ XP)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          {...field}
                          onChange={(e) =>
                            field.onChange(Number(e.target.value))
                          }
                          data-testid="league-silver"
                        />
                      </FormControl>
                      <FormDescription>Default: 500</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="league_thresholds.gold"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gold (≥ XP)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          {...field}
                          onChange={(e) =>
                            field.onChange(Number(e.target.value))
                          }
                          data-testid="league-gold"
                        />
                      </FormControl>
                      <FormDescription>Default: 1500</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="league_thresholds.diamond"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Diamond (≥ XP)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          {...field}
                          onChange={(e) =>
                            field.onChange(Number(e.target.value))
                          }
                          data-testid="league-diamond"
                        />
                      </FormControl>
                      <FormDescription>Default: 4000</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </Card>

          {/* Default Language Card */}
          <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
            <div
              className="px-6 py-4 flex items-center gap-2"
              style={{
                background:
                  "linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)",
              }}
            >
              <Globe className="h-5 w-5 text-white" />
              <h2 className="text-lg font-bold tracking-tight text-white">
                {t("settings.defaultLanguage")}
              </h2>
            </div>
            <div className="p-6">
              <FormField
                control={form.control}
                name="default_language"
                render={({ field }) => (
                  <FormItem className="max-w-md">
                    <FormLabel>{t("settings.defaultLanguage")}</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ?? "en"}
                    >
                      <FormControl>
                        <SelectTrigger
                          className="bg-white"
                          data-testid="default-language-select"
                        >
                          <SelectValue
                            placeholder={t("settings.defaultLanguage")}
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="en">
                          {t("settings.english")}
                        </SelectItem>
                        <SelectItem value="ar">
                          {t("settings.arabic")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {t("settings.defaultLanguageDesc")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
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

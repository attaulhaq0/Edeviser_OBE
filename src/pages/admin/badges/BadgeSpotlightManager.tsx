// Task 151.3: Badge Spotlight Manager page
// Requirement 134.2: Admin configures spotlight schedule

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Calendar, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import MondayWeekPicker from "@/components/shared/MondayWeekPicker";
import {
  badgeSpotlightScheduleSchema,
  type BadgeSpotlightSchedule,
} from "@/lib/schemas/badgeSpotlight";
import { z } from "zod";
import {
  useBadgeSpotlightSchedule,
  useUpdateBadgeSpotlightSchedule,
} from "@/hooks/useTieredBadges";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader, SectionCard } from "@/design-system";

const BADGE_CATEGORIES = [
  "streak",
  "academic",
  "engagement",
  "habit",
  "blooms",
  "team",
];

const BadgeSpotlightManager = () => {
  const { institutionId } = useAuth();

  const { data: schedule, isLoading } = useBadgeSpotlightSchedule(
    institutionId ?? undefined
  );
  const updateMutation = useUpdateBadgeSpotlightSchedule();

  const form = useForm<
    z.input<typeof badgeSpotlightScheduleSchema>,
    unknown,
    BadgeSpotlightSchedule
  >({
    resolver: zodResolver(badgeSpotlightScheduleSchema),
    defaultValues: {
      week_start: "",
      category: "",
      is_manual: true,
    },
  });

  const handleSchedule = (data: BadgeSpotlightSchedule) => {
    if (!institutionId) return;
    updateMutation.mutate(
      { institutionId, ...data },
      {
        onSuccess: () => {
          form.reset();
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Badge Spotlight" />

      {/* Schedule Form */}
      <SectionCard icon={Sparkles} title="Schedule Spotlight">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSchedule)}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="week_start"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Week Start (Monday)</FormLabel>
                    <FormControl>
                      <MondayWeekPicker
                        value={field.value ? new Date(field.value) : null}
                        onChange={(date: Date) => {
                          const dateStr = date.toISOString().split("T")[0];
                          field.onChange(dateStr);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Badge Category</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category..." />
                        </SelectTrigger>
                        <SelectContent>
                          {BADGE_CATEGORIES.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {cat.charAt(0).toUpperCase() + cat.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Button
              type="submit"
              disabled={updateMutation.isPending}
              variant="tactile"
            >
              {updateMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Schedule
            </Button>
          </form>
        </Form>
      </SectionCard>

      {/* Category Preview */}
      <SectionCard icon={Sparkles} title="Badge Categories & Tier Thresholds">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {BADGE_CATEGORIES.map((cat) => (
            <div
              key={cat}
              className="p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              <p className="text-sm font-semibold capitalize">{cat}</p>
              <div className="flex gap-1 mt-2">
                <Badge className="text-[10px] bg-amber-100 text-amber-700 border-amber-300">
                  Bronze
                </Badge>
                <Badge className="text-[10px] bg-gray-100 text-gray-700 border-gray-300">
                  Silver
                </Badge>
                <Badge className="text-[10px] bg-yellow-100 text-yellow-700 border-yellow-300">
                  Gold
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Schedule Calendar View */}
      <SectionCard icon={Calendar} title="Upcoming Schedule">
        {isLoading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
          </div>
        ) : !schedule || schedule.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">
            No spotlight schedule yet. Auto-rotation will apply.
          </p>
        ) : (
          <div className="space-y-2">
            {schedule.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50"
              >
                <div>
                  <p className="text-sm font-semibold capitalize">
                    {entry.category}
                  </p>
                  <p className="text-xs text-gray-500">
                    Week of {entry.week_start}
                  </p>
                </div>
                <Badge variant="outline" className="text-xs">
                  {entry.is_manual ? "Manual" : "Auto"}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
};

export default BadgeSpotlightManager;

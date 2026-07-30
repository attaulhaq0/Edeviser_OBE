import { useCallback } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { useEmailPreferences } from "@/hooks/useEmailPreferences";
import { PCard, SectionHeader } from "@/design-system";
import type { EmailPreferencesFormData } from "@/lib/schemas/emailPrefs";

export interface EmailPreferenceItem {
  key: keyof EmailPreferencesFormData;
  label: string;
  description: string;
}

const PREFERENCE_ITEMS: EmailPreferenceItem[] = [
  {
    key: "streak_risk",
    label: "Streak Risk Alerts",
    description: "Daily reminder at 8 PM if your streak is at risk",
  },
  {
    key: "weekly_summary",
    label: "Weekly Summary",
    description: "Monday morning recap of your XP, badges, and progress",
  },
  {
    key: "new_assignment",
    label: "New Assignments",
    description: "Notification when a new assignment is posted",
  },
  {
    key: "grade_released",
    label: "Grade Released",
    description: "Notification when your grade is ready to view",
  },
  {
    key: "notification_digest",
    label: "Daily Digest",
    description:
      "Receive a single daily summary at 8 PM instead of individual notifications",
  },
];

interface EmailPreferencesSectionProps {
  title?: string;
  description?: string;
  items?: EmailPreferenceItem[];
}

const EmailPreferencesSection = ({
  title = "Email Notifications",
  description = "Choose which email notifications you'd like to receive.",
  items = PREFERENCE_ITEMS,
}: EmailPreferencesSectionProps) => {
  const { preferences, isLoading, isUpdating, updatePreferencesAsync } =
    useEmailPreferences();

  const handleToggle = useCallback(
    async (key: keyof EmailPreferencesFormData, checked: boolean) => {
      try {
        await updatePreferencesAsync({ ...preferences, [key]: checked });
        toast.success(
          checked ? "Notification enabled" : "Notification disabled"
        );
      } catch {
        toast.error("Failed to update preference");
      }
    },
    [preferences, updatePreferencesAsync]
  );

  if (isLoading) {
    return (
      <PCard className="overflow-hidden gap-0 py-0">
        <SectionHeader icon={Mail} title={title} />
        <div className="flex items-center justify-center p-6">
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
        </div>
      </PCard>
    );
  }

  return (
    <PCard className="overflow-hidden gap-0 py-0">
      <SectionHeader icon={Mail} title={title} />
      <div className="p-6 space-y-4">
        <p className="text-sm text-slate-500">{description}</p>
        {items.map((item) => (
          <div
            key={item.key}
            className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0"
          >
            <div className="space-y-0.5">
              <Label
                htmlFor={`email-pref-${item.key}`}
                className="text-sm font-medium"
              >
                {item.label}
              </Label>
              <p className="text-xs text-slate-500">{item.description}</p>
            </div>
            <Switch
              id={`email-pref-${item.key}`}
              checked={preferences[item.key] ?? false}
              onCheckedChange={(checked) => handleToggle(item.key, checked)}
              disabled={isUpdating}
              aria-label={`Toggle ${item.label} email notifications`}
            />
          </div>
        ))}
      </div>
    </PCard>
  );
};

export default EmailPreferencesSection;

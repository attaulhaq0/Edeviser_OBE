// Task 94.2: Notification preferences page
// Per-course mute toggles + quiet hours configuration

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
  type NotificationPreferences as NotifPrefs,
} from '@/hooks/useNotificationPreferences';
import { useCourses } from '@/hooks/useCourses';
import { toast } from 'sonner';
import { Loader2, Bell, Moon } from 'lucide-react';

const NotificationPreferences = () => {
  const { user } = useAuth();
  const { data: prefs, isLoading: prefsLoading } = useNotificationPreferences(user?.id);
  const { data: coursesData, isLoading: coursesLoading } = useCourses();
  const updateMutation = useUpdateNotificationPreferences();

  const [localPrefs, setLocalPrefs] = useState<NotifPrefs | null>(null);

  // Sync from server on first load (derived initial state)
  const effectivePrefs = localPrefs ?? prefs ?? null;

  const isLoading = prefsLoading || coursesLoading;
  const courses = coursesData?.data ?? [];

  const handleToggleMute = (courseId: string) => {
    if (!effectivePrefs) return;
    const muted = effectivePrefs.muted_courses.includes(courseId)
      ? effectivePrefs.muted_courses.filter((id) => id !== courseId)
      : [...effectivePrefs.muted_courses, courseId];
    setLocalPrefs({ ...effectivePrefs, muted_courses: muted });
  };

  const handleSave = () => {
    if (!user?.id || !effectivePrefs) return;
    updateMutation.mutate(
      { userId: user.id, preferences: effectivePrefs },
      {
        onSuccess: () => toast.success('Preferences saved'),
        onError: (err) => toast.error(err.message),
      },
    );
  };

  if (isLoading || !effectivePrefs) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold tracking-tight">Notification Preferences</h1>

      {/* Per-course mute toggles */}
      <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
        <CardHeader className="flex flex-row items-center gap-2">
          <Bell className="h-5 w-5 text-blue-600" />
          <CardTitle>Course Notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {courses.length === 0 && (
            <p className="text-sm text-gray-500">No courses enrolled</p>
          )}
          {courses.map((course) => (
            <div key={course.id} className="flex items-center justify-between py-1">
              <span className="text-sm font-medium text-gray-700">{course.name}</span>
              <Switch
                checked={!effectivePrefs.muted_courses.includes(course.id)}
                onCheckedChange={() => handleToggleMute(course.id)}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Quiet hours */}
      <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
        <CardHeader className="flex flex-row items-center gap-2">
          <Moon className="h-5 w-5 text-blue-600" />
          <CardTitle>Quiet Hours</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Enable quiet hours</span>
            <Switch
              checked={effectivePrefs.quiet_hours.enabled}
              onCheckedChange={(checked) =>
                setLocalPrefs({
                  ...effectivePrefs,
                  quiet_hours: { ...effectivePrefs.quiet_hours, enabled: checked },
                })
              }
            />
          </div>

          {effectivePrefs.quiet_hours.enabled && (
            <div className="flex items-center gap-4">
              <div className="space-y-1">
                <label htmlFor="quiet-start" className="text-xs text-gray-500">Start</label>
                <Input
                  id="quiet-start"
                  type="time"
                  value={effectivePrefs.quiet_hours.start}
                  onChange={(e) =>
                    setLocalPrefs({
                      ...effectivePrefs,
                      quiet_hours: { ...effectivePrefs.quiet_hours, start: e.target.value },
                    })
                  }
                  className="w-32"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="quiet-end" className="text-xs text-gray-500">End</label>
                <Input
                  id="quiet-end"
                  type="time"
                  value={effectivePrefs.quiet_hours.end}
                  onChange={(e) =>
                    setLocalPrefs({
                      ...effectivePrefs,
                      quiet_hours: { ...effectivePrefs.quiet_hours, end: e.target.value },
                    })
                  }
                  className="w-32"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Button
        onClick={handleSave}
        disabled={updateMutation.isPending}
        className="bg-gradient-to-r from-teal-500 to-blue-600 text-white active:scale-95"
      >
        {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        Save Preferences
      </Button>
    </div>
  );
};

export default NotificationPreferences;

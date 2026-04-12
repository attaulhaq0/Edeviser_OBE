// Task 151.3: Badge Spotlight Manager page
// Requirement 134.2: Admin configures spotlight schedule

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Calendar, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import {
  useBadgeSpotlightSchedule,
  useUpdateBadgeSpotlightSchedule,
} from '@/hooks/useTieredBadges';

const BADGE_CATEGORIES = [
  'streak',
  'academic',
  'engagement',
  'habit',
  'blooms',
  'team',
];

const BadgeSpotlightManager = () => {
  const { institutionId } = useAuth();
  const [newCategory, setNewCategory] = useState('');
  const [newWeekStart, setNewWeekStart] = useState('');

  const { data: schedule, isLoading } = useBadgeSpotlightSchedule(
    institutionId ?? undefined,
  );
  const updateMutation = useUpdateBadgeSpotlightSchedule();

  const handleSchedule = () => {
    if (!institutionId || !newWeekStart || !newCategory) return;
    updateMutation.mutate(
      { institutionId, week_start: newWeekStart, category: newCategory },
      {
        onSuccess: () => {
          setNewCategory('');
          setNewWeekStart('');
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-purple-500" />
        <h1 className="text-2xl font-bold tracking-tight">Badge Spotlight</h1>
      </div>

      {/* Schedule Form */}
      <Card className="bg-white border-0 shadow-md rounded-xl p-6">
        <h2 className="text-sm font-bold mb-4">Schedule Spotlight</h2>
        <div className="flex gap-3 items-end flex-wrap">
          <div>
            <label htmlFor="spotlight-week-start" className="text-xs text-gray-500">
              Week Start (Monday)
            </label>
            <Input
              id="spotlight-week-start"
              type="date"
              value={newWeekStart}
              onChange={(e) => setNewWeekStart(e.target.value)}
              className="mt-1"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label htmlFor="spotlight-category" className="text-xs text-gray-500">
              Badge Category
            </label>
            <select
              id="spotlight-category"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
            >
              <option value="">Select category...</option>
              {BADGE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <Button
            onClick={handleSchedule}
            disabled={!newWeekStart || !newCategory || updateMutation.isPending}
            className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95"
          >
            {updateMutation.isPending && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            Schedule
          </Button>
        </div>
      </Card>

      {/* Category Preview */}
      <Card className="bg-white border-0 shadow-md rounded-xl p-6">
        <h2 className="text-sm font-bold mb-4">Badge Categories & Tier Thresholds</h2>
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
      </Card>

      {/* Schedule Calendar View */}
      <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
        <div
          className="px-6 py-4"
          style={{
            background:
              'linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)',
          }}
        >
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-white" />
            <h2 className="text-lg font-bold tracking-tight text-white">
              Upcoming Schedule
            </h2>
          </div>
        </div>
        <div className="p-4">
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
                    {entry.is_manual ? 'Manual' : 'Auto'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default BadgeSpotlightManager;

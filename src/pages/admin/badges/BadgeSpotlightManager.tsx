// Task 151.3: Badge Spotlight Manager page

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Calendar, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface SpotlightEntry {
  id: string;
  week_start: string;
  category: string;
  is_manual: boolean;
}

const BadgeSpotlightManager = () => {
  const { institutionId } = useAuth();
  const qc = useQueryClient();
  const [newCategory, setNewCategory] = useState('');
  const [newWeekStart, setNewWeekStart] = useState('');

  const { data: schedule, isLoading } = useQuery({
    queryKey: queryKeys.badgeSpotlightSchedule.list({ institutionId }),
    queryFn: async (): Promise<SpotlightEntry[]> => {
      const { data, error } = await supabase
        .from('badge_spotlight_schedule' as never)
        .select('*')
        .eq('institution_id', institutionId!)
        .order('week_start', { ascending: false })
        .limit(12);
      if (error) throw error;
      return (data ?? []) as SpotlightEntry[];
    },
    enabled: !!institutionId,
  });

  const createMutation = useMutation({
    mutationFn: async (input: { week_start: string; category: string }) => {
      const { error } = await supabase
        .from('badge_spotlight_schedule' as never)
        .insert({
          institution_id: institutionId,
          week_start: input.week_start,
          category: input.category,
          is_manual: true,
        } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.badgeSpotlightSchedule.lists() });
      toast.success('Spotlight scheduled');
      setNewCategory('');
      setNewWeekStart('');
    },
    onError: (err) => toast.error((err as Error).message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-purple-500" />
        <h1 className="text-2xl font-bold tracking-tight">Badge Spotlight</h1>
      </div>

      <Card className="bg-white border-0 shadow-md rounded-xl p-6">
        <h2 className="text-sm font-bold mb-4">Schedule Spotlight</h2>
        <div className="flex gap-3 items-end">
          <div>
            <label htmlFor="spotlight-week-start" className="text-xs text-gray-500">Week Start (Monday)</label>
            <Input
              id="spotlight-week-start"
              type="date"
              value={newWeekStart}
              onChange={(e) => setNewWeekStart(e.target.value)}
              className="mt-1"
            />
          </div>
          <div className="flex-1">
            <label htmlFor="spotlight-category" className="text-xs text-gray-500">Badge Category</label>
            <Input
              id="spotlight-category"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="e.g., Academic, Engagement"
              className="mt-1"
            />
          </div>
          <Button
            onClick={() => createMutation.mutate({ week_start: newWeekStart, category: newCategory })}
            disabled={!newWeekStart || !newCategory || createMutation.isPending}
            className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95"
          >
            {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Schedule
          </Button>
        </div>
      </Card>

      <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
        <div className="px-6 py-4" style={{ background: 'linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)' }}>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-white" />
            <h2 className="text-lg font-bold tracking-tight text-white">Schedule</h2>
          </div>
        </div>
        <div className="p-4">
          {isLoading ? (
            <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-blue-500" /></div>
          ) : !schedule || schedule.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-8">No spotlight schedule yet. Auto-rotation will apply.</p>
          ) : (
            <div className="space-y-2">
              {schedule.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50">
                  <div>
                    <p className="text-sm font-semibold capitalize">{entry.category}</p>
                    <p className="text-xs text-gray-500">Week of {entry.week_start}</p>
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

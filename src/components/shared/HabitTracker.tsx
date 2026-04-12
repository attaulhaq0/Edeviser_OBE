// Task 127.5 + 141.3: Daily Habit Tracker — 8 habits in 7-day grid

import { Card } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryKeys';
import Shimmer from '@/components/shared/Shimmer';
import {
  LogIn,
  Send,
  BookOpen,
  Eye,
  MessageSquare,
  Brain,
  HandHelping,
  CheckCircle2,
  type LucideIcon,
} from 'lucide-react';
import { format, subDays } from 'date-fns';

type HabitType =
  | 'login'
  | 'submit'
  | 'journal'
  | 'read'
  | 'collaborate'
  | 'practice'
  | 'review'
  | 'mentor';

interface HabitConfig {
  type: HabitType;
  label: string;
  icon: LucideIcon;
  color: string;
}

const HABITS: HabitConfig[] = [
  { type: 'login', label: 'Login', icon: LogIn, color: 'text-blue-500' },
  { type: 'submit', label: 'Submit', icon: Send, color: 'text-green-500' },
  { type: 'journal', label: 'Journal', icon: BookOpen, color: 'text-purple-500' },
  { type: 'read', label: 'Read', icon: Eye, color: 'text-amber-500' },
  { type: 'collaborate', label: 'Collaborate', icon: MessageSquare, color: 'text-teal-500' },
  { type: 'practice', label: 'Practice', icon: Brain, color: 'text-red-500' },
  { type: 'review', label: 'Review', icon: CheckCircle2, color: 'text-indigo-500' },
  { type: 'mentor', label: 'Mentor', icon: HandHelping, color: 'text-orange-500' },
];

interface HabitTrackerProps {
  studentId: string;
  days?: number;
}

const useHabitLogs = (studentId: string, days: number) => {
  const today = new Date();
  const startDate = format(subDays(today, days - 1), 'yyyy-MM-dd');
  const endDate = format(today, 'yyyy-MM-dd');

  return useQuery({
    queryKey: queryKeys.habitLogs.list({ studentId, startDate, endDate }),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('habit_logs' as never)
        .select('habit_type, date, completed_at')
        .eq('student_id', studentId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Array<{ habit_type: string; date: string; completed_at: string | null }>;
    },
    enabled: !!studentId,
  });
};

const HabitTracker = ({ studentId, days = 7 }: HabitTrackerProps) => {
  const { data: logs, isLoading } = useHabitLogs(studentId, days);

  const today = new Date();
  const dateColumns = Array.from({ length: days }, (_, i) => {
    const d = subDays(today, days - 1 - i);
    return { date: format(d, 'yyyy-MM-dd'), label: format(d, 'EEE') };
  });

  const completedSet = new Set(
    (logs ?? [])
      .filter((l) => l.completed_at !== null)
      .map((l) => `${l.habit_type}:${l.date}`),
  );

  if (isLoading) return <Shimmer className="h-48 rounded-xl" />;

  return (
    <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
      <div
        className="px-6 py-4 flex items-center gap-2"
        style={{ background: 'linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)' }}
      >
        <CheckCircle2 className="h-5 w-5 text-white" />
        <h2 className="text-lg font-bold tracking-tight text-white">Daily Habits</h2>
      </div>
      <div className="p-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-start py-1 px-2 text-xs font-semibold text-gray-500 w-28">Habit</th>
              {dateColumns.map((col) => (
                <th key={col.date} className="py-1 px-1 text-xs font-semibold text-gray-500 text-center w-10">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {HABITS.map((habit) => {
              const Icon = habit.icon;
              return (
                <tr key={habit.type} className="border-t border-slate-100">
                  <td className="py-1.5 px-2">
                    <div className="flex items-center gap-1.5">
                      <Icon className={`h-3.5 w-3.5 ${habit.color}`} />
                      <span className="text-xs font-medium text-gray-700">{habit.label}</span>
                    </div>
                  </td>
                  {dateColumns.map((col) => {
                    const done = completedSet.has(`${habit.type}:${col.date}`);
                    return (
                      <td key={col.date} className="py-1.5 px-1 text-center">
                        <div
                          className={`w-6 h-6 mx-auto rounded-md ${
                            done ? 'bg-green-500' : 'bg-gray-200'
                          }`}
                          title={`${habit.label} — ${col.date}: ${done ? 'Done' : 'Missed'}`}
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

export default HabitTracker;

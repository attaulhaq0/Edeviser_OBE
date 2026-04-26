import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Sun, Cloud, Moon, ListTodo } from 'lucide-react';
import { groupByTimeOfDay } from '@/lib/plannerUtils';
import StudySessionCard from '@/components/shared/StudySessionCard';
import PlannerTaskItem from '@/components/shared/PlannerTaskItem';
import DeadlineItem from '@/components/shared/DeadlineItem';
import type { TimelineItem, StudySession, PlannerTask, UpcomingDeadline, HabitStatus, TimeOfDay } from '@/types/planner';

interface TodayTimelineProps {
  items: TimelineItem[];
  habits: HabitStatus;
  onStartSession?: (session: StudySession) => void;
  onToggleTask?: (task: PlannerTask) => void;
}

const sectionConfig: Record<TimeOfDay | 'todo', { label: string; icon: React.ElementType; color: string }> = {
  morning: { label: 'Morning', icon: Sun, color: 'text-amber-500' },
  afternoon: { label: 'Afternoon', icon: Cloud, color: 'text-blue-500' },
  evening: { label: 'Evening', icon: Moon, color: 'text-indigo-500' },
  todo: { label: 'To Do', icon: ListTodo, color: 'text-gray-500' },
};

const habitLabels: Record<keyof HabitStatus, string> = {
  login: 'Login',
  submit: 'Submit',
  journal: 'Journal',
  read: 'Read',
};

const renderItem = (
  item: TimelineItem,
  onStartSession?: (session: StudySession) => void,
  onToggleTask?: (task: PlannerTask) => void,
) => {
  switch (item.type) {
    case 'session':
      return (
        <StudySessionCard
          key={item.id}
          session={item.data as StudySession}
          onStart={() => onStartSession?.(item.data as StudySession)}
        />
      );
    case 'task':
      return (
        <PlannerTaskItem
          key={item.id}
          task={item.data as PlannerTask}
          onToggle={() => onToggleTask?.(item.data as PlannerTask)}
        />
      );
    case 'deadline':
      return <DeadlineItem key={item.id} assignment={item.data as UpcomingDeadline} />;
    default:
      return null;
  }
};

const TodayTimeline = ({ items, habits, onStartSession, onToggleTask }: TodayTimelineProps) => {
  const grouped = useMemo(() => groupByTimeOfDay(items), [items]);

  const sections = (['morning', 'afternoon', 'evening', 'todo'] as const).filter(
    (key) => grouped[key].length > 0,
  );

  return (
    <div className="space-y-6">
      {/* Habit Status */}
      <div className="flex items-center gap-3">
        {(Object.keys(habitLabels) as Array<keyof HabitStatus>).map((key) => (
          <div
            key={key}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border',
              habits[key]
                ? 'bg-green-50 text-green-700 border-green-200'
                : 'bg-gray-50 text-gray-400 border-gray-200',
            )}
          >
            <div
              className={cn(
                'h-2 w-2 rounded-full',
                habits[key] ? 'bg-green-500' : 'bg-gray-300',
              )}
            />
            {habitLabels[key]}
          </div>
        ))}
      </div>

      {/* Timeline Sections */}
      {sections.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-sm">Nothing scheduled for today</p>
        </div>
      ) : (
        sections.map((sectionKey) => {
          const config = sectionConfig[sectionKey];
          const Icon = config.icon;
          return (
            <div key={sectionKey} className="space-y-2">
              <div className="flex items-center gap-2">
                <Icon className={cn('h-4 w-4', config.color)} />
                <h3 className="text-sm font-semibold text-gray-700">{config.label}</h3>
                <div className="flex-1 border-t border-slate-200" />
              </div>
              <div className="space-y-2 ps-6">
                {grouped[sectionKey].map((item) =>
                  renderItem(item, onStartSession, onToggleTask),
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
};

export default TodayTimeline;

import { Card } from '@/components/ui/card';
import { Clock, CheckSquare, BookOpen } from 'lucide-react';

interface DailyProgressSummaryProps {
  studyMinutes: number;
  tasksCompleted: number;
  sessionsCompleted: number;
}

interface KPIItemProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
}

const KPIItem = ({ icon: Icon, label, value }: KPIItemProps) => (
  <Card className="bg-white border-0 shadow-md rounded-xl p-4 group">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">
          {label}
        </p>
        <p className="text-2xl font-black mt-1">{value}</p>
      </div>
      <div className="p-2 rounded-lg bg-blue-50 group-hover:scale-110 transition-transform">
        <Icon className="h-5 w-5 text-blue-600" />
      </div>
    </div>
  </Card>
);

const formatMinutes = (minutes: number): string => {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

const DailyProgressSummary = ({
  studyMinutes,
  tasksCompleted,
  sessionsCompleted,
}: DailyProgressSummaryProps) => (
  <div className="grid grid-cols-3 gap-4">
    <KPIItem icon={Clock} label="Study Time" value={formatMinutes(studyMinutes)} />
    <KPIItem icon={CheckSquare} label="Tasks Done" value={tasksCompleted} />
    <KPIItem icon={BookOpen} label="Sessions" value={sessionsCompleted} />
  </div>
);

export default DailyProgressSummary;

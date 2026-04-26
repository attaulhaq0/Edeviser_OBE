import { format } from 'date-fns';
import { RotateCcw, Users } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Shimmer from '@/components/shared/Shimmer';
import {
  useExtraAttemptTokenUsage,
  type ExtraAttemptTokenUsageRow,
} from '@/hooks/useExtraAttemptTokenUsage';

interface ExtraAttemptTokenUsageProps {
  courseId: string;
}

const ExtraAttemptTokenUsage = ({ courseId }: ExtraAttemptTokenUsageProps) => {
  const { data: usageRows, isLoading } = useExtraAttemptTokenUsage(courseId);

  if (isLoading) {
    return <Shimmer className="h-32 rounded-xl" />;
  }

  if (!usageRows || usageRows.length === 0) {
    return null;
  }

  // Group by quiz_id for display
  const groupedByQuiz = usageRows.reduce<Record<string, ExtraAttemptTokenUsageRow[]>>(
    (acc, row) => {
      const key = row.quiz_id;
      if (!acc[key]) acc[key] = [];
      acc[key].push(row);
      return acc;
    },
    {},
  );

  return (
    <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
      <div
        className="px-6 py-4 flex items-center gap-2"
        style={{
          background: 'linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)',
        }}
      >
        <RotateCcw className="h-5 w-5 text-white" />
        <h2 className="text-lg font-bold tracking-tight text-white">
          Extra Attempt Token Usage
        </h2>
        <Badge className="ms-auto bg-white/20 text-white border-transparent text-xs font-bold">
          {usageRows.length} used
        </Badge>
      </div>
      <div className="p-6 space-y-4">
        {Object.entries(groupedByQuiz).map(([quizId, rows]) => (
          <div key={quizId} className="space-y-2">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-gray-400" />
              <p className="text-xs font-bold tracking-widest uppercase text-gray-500">
                Quiz {quizId.slice(0, 8)}
              </p>
              <Badge
                variant="secondary"
                className="text-xs font-bold"
              >
                {rows.length} {rows.length === 1 ? 'student' : 'students'}
              </Badge>
            </div>
            <div className="divide-y divide-gray-100 rounded-lg border border-gray-100">
              {rows.map((row) => (
                <div
                  key={row.id}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-amber-50 flex items-center justify-center">
                      <RotateCcw className="h-4 w-4 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{row.student_name}</p>
                      <p className="text-xs text-gray-500">
                        {row.consumed_at
                          ? format(new Date(row.consumed_at), 'MMM d, yyyy h:mm a')
                          : 'Unknown date'}
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-amber-100 text-amber-700 border-transparent text-xs font-bold">
                    {row.xp_cost} XP
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default ExtraAttemptTokenUsage;

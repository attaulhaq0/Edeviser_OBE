// Task 123.3: Semester Trend View page

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingDown, TrendingUp } from 'lucide-react';

const SemesterTrendView = () => {
  // Placeholder — requires mv_semester_attainment materialized view
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Semester Trends</h1>

      <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
        <div className="px-6 py-4 flex items-center gap-2" style={{ background: 'linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)' }}>
          <TrendingUp className="h-5 w-5 text-white" />
          <h2 className="text-lg font-bold tracking-tight text-white">Attainment Over Time</h2>
        </div>
        <div className="p-6">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <TrendingDown className="h-12 w-12 text-slate-300 mb-3" />
            <p className="text-sm text-slate-500">Semester trend data will appear here once multiple semesters have attainment snapshots.</p>
            <Badge variant="outline" className="mt-2 text-xs">Requires semester_attainment_snapshots table</Badge>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default SemesterTrendView;

// Task 119.2: Gap Analysis View page

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { parseAsString, useQueryState } from 'nuqs';
import { useGapAnalysis } from '@/hooks/useVisualizationData';
import { usePrograms } from '@/hooks/usePrograms';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Shimmer from '@/components/shared/Shimmer';
import { AlertTriangle, CheckCircle, XCircle, HelpCircle, Search } from 'lucide-react';
import type { GapStatus } from '@/lib/gapAnalysis';

const STATUS_CONFIG: Record<GapStatus, { label: string; color: string; icon: typeof CheckCircle }> = {
  fully_mapped: { label: 'Fully Mapped', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  partially_mapped: { label: 'Partially Mapped', color: 'bg-yellow-100 text-yellow-700', icon: AlertTriangle },
  unmapped: { label: 'Unmapped', color: 'bg-red-100 text-red-700', icon: XCircle },
  no_evidence: { label: 'No Evidence', color: 'bg-gray-100 text-gray-700', icon: HelpCircle },
};

const GapAnalysisView = () => {
  const [programId, setProgramId] = useQueryState('program', parseAsString.withDefault(''));
  const { data: programsData } = usePrograms();
  const programs = programsData?.data ?? [];
  const { data: gaps, isLoading } = useGapAnalysis(programId || undefined);

  const summary = gaps ? {
    total: gaps.length,
    fullyMapped: gaps.filter((g) => g.status === 'fully_mapped').length,
    withEvidence: gaps.filter((g) => g.evidence_count > 0).length,
  } : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Gap Analysis</h1>
        <Select value={programId} onValueChange={setProgramId}>
          <SelectTrigger className="w-64 bg-white"><SelectValue placeholder="Select program" /></SelectTrigger>
          <SelectContent>
            {(programs ?? []).map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {summary && (
        <div className="grid grid-cols-3 gap-4">
          <Card className="bg-white border-0 shadow-md rounded-xl p-4">
            <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">Total Outcomes</p>
            <p className="text-2xl font-black mt-1">{summary.total}</p>
          </Card>
          <Card className="bg-white border-0 shadow-md rounded-xl p-4">
            <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">Fully Mapped</p>
            <p className="text-2xl font-black mt-1 text-green-600">{summary.total > 0 ? Math.round((summary.fullyMapped / summary.total) * 100) : 0}%</p>
          </Card>
          <Card className="bg-white border-0 shadow-md rounded-xl p-4">
            <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">With Evidence</p>
            <p className="text-2xl font-black mt-1 text-blue-600">{summary.total > 0 ? Math.round((summary.withEvidence / summary.total) * 100) : 0}%</p>
          </Card>
        </div>
      )}

      <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
        <div className="px-6 py-4 flex items-center gap-2" style={{ background: 'linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)' }}>
          <Search className="h-5 w-5 text-white" />
          <h2 className="text-lg font-bold tracking-tight text-white">Outcome Coverage</h2>
        </div>
        <div className="p-6">
          {!programId ? (
            <p className="text-sm text-slate-400 text-center py-12">Select a program to analyze gaps.</p>
          ) : isLoading ? (
            <Shimmer className="h-64 rounded-lg" />
          ) : !gaps || gaps.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-12">No outcomes found.</p>
          ) : (
            <div className="space-y-2">
              {gaps.map((gap) => {
                const config = STATUS_CONFIG[gap.status];
                const Icon = config.icon;
                return (
                  <div key={gap.outcome_id} className="p-3 rounded-lg border border-slate-100 hover:bg-slate-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">{gap.outcome_type}</Badge>
                        <span className="text-sm font-medium">{gap.outcome_title}</span>
                      </div>
                      <Badge className={`text-[10px] ${config.color}`}>
                        <Icon className="h-3 w-3 me-1" />{config.label}
                      </Badge>
                    </div>
                    {gap.flag && (
                      <div className="mt-1 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3 text-amber-500" />
                        <span className="text-xs text-amber-600">{gap.flag === 'under_mapped' ? 'Under-Mapped' : 'Unassessed'}</span>
                      </div>
                    )}
                    {gap.recommendation && (
                      <p className="text-xs text-slate-500 mt-1">{gap.recommendation}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default GapAnalysisView;

// Task 118.2: Sankey Diagram View page

import { Card } from '@/components/ui/card';
import { parseAsString, useQueryState } from 'nuqs';
import { useSankeyData } from '@/hooks/useVisualizationData';
import { usePrograms } from '@/hooks/usePrograms';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Shimmer from '@/components/shared/Shimmer';
import { GitBranch } from 'lucide-react';

const SankeyDiagramView = () => {
  const [programId, setProgramId] = useQueryState('program', parseAsString.withDefault(''));
  const { data: programsData } = usePrograms();
  const programs = programsData?.data ?? [];
  const { data: sankeyData, isLoading } = useSankeyData(programId || undefined);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Outcome Flow (Sankey)</h1>
        <Select value={programId} onValueChange={setProgramId}>
          <SelectTrigger className="w-64 bg-white"><SelectValue placeholder="Select program" /></SelectTrigger>
          <SelectContent>
            {(programs ?? []).map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
        <div className="px-6 py-4 flex items-center gap-2" style={{ background: 'linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)' }}>
          <GitBranch className="h-5 w-5 text-white" />
          <h2 className="text-lg font-bold tracking-tight text-white">Outcome Mapping Flow</h2>
        </div>
        <div className="p-6">
          {!programId ? (
            <p className="text-sm text-slate-400 text-center py-12">Select a program to view the outcome flow diagram.</p>
          ) : isLoading ? (
            <Shimmer className="h-64 rounded-lg" />
          ) : !sankeyData || sankeyData.nodes.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-12">No outcome data available for this program.</p>
          ) : (
            <div className="space-y-4">
              <div className="flex gap-8 justify-center text-xs text-slate-500">
                <span>CLOs → PLOs → ILOs</span>
              </div>
              {/* Sankey visualization — nodes grouped by type */}
              <div className="grid grid-cols-3 gap-4 min-h-[300px]">
                {(['CLO', 'PLO', 'ILO'] as const).map((type) => (
                  <div key={type} className="space-y-2">
                    <p className="text-xs font-black tracking-widest uppercase text-slate-400 text-center">{type}s</p>
                    {sankeyData.nodes.filter((n) => n.type === type).map((node) => (
                      <div key={node.id} className="p-2 rounded-lg border text-xs" style={{ borderColor: node.color, backgroundColor: `${node.color}15` }}>
                        <p className="font-medium truncate" style={{ color: node.color }}>{node.name}</p>
                        <p className="text-slate-500">{Math.round(node.attainment)}%</p>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-400 text-center">{sankeyData.nodes.length} outcomes · {sankeyData.links.length} mappings</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default SankeyDiagramView;

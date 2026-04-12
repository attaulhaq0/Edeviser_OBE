// Task 113.2: Graduate Attribute Card shared component

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface GraduateAttributeCardProps {
  title: string;
  code: string;
  attainment: number;
  mappedILOCount: number;
}

const getAttainmentStyle = (score: number) => {
  if (score >= 85) return 'text-green-600 bg-green-50';
  if (score >= 70) return 'text-blue-600 bg-blue-50';
  if (score >= 50) return 'text-yellow-600 bg-yellow-50';
  return 'text-red-600 bg-red-50';
};

const getAttainmentLabel = (score: number) => {
  if (score >= 85) return 'Excellent';
  if (score >= 70) return 'Satisfactory';
  if (score >= 50) return 'Developing';
  return 'Not Yet';
};

const GraduateAttributeCard = ({ title, code, attainment, mappedILOCount }: GraduateAttributeCardProps) => (
  <Card className="bg-white border-0 shadow-md rounded-xl p-4 group">
    <div className="flex items-start justify-between">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-mono text-slate-400">{code}</p>
        <p className="text-sm font-semibold mt-0.5 truncate">{title}</p>
        <p className="text-xs text-slate-500 mt-1">{mappedILOCount} mapped ILOs</p>
      </div>
      <div className="text-end">
        <p className="text-2xl font-black">{Math.round(attainment)}%</p>
        <Badge className={`text-[10px] ${getAttainmentStyle(attainment)}`}>
          {getAttainmentLabel(attainment)}
        </Badge>
      </div>
    </div>
  </Card>
);

export default GraduateAttributeCard;

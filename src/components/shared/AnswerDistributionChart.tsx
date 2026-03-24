import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { cn } from '@/lib/utils';

export interface AnswerDistributionChartProps {
  data: Array<{
    option: string;
    count: number;
    isCorrect: boolean;
  }>;
  className?: string;
}

const AnswerDistributionChart = ({ data, className }: AnswerDistributionChartProps) => {
  return (
    <div className={cn('w-full', className)}>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <XAxis
            dataKey="option"
            tick={{ fontSize: 12, fill: '#64748b' }}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11, fill: '#64748b' }}
          />
          <Tooltip
            formatter={((value: number) =>
              [`${value} responses`]
            ) as never}
            contentStyle={{
              borderRadius: 8,
              border: 'none',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            }}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {data.map((entry, idx) => (
              <Cell
                key={idx}
                fill={entry.isCorrect ? '#22c55e' : '#94a3b8'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export { AnswerDistributionChart };
export default AnswerDistributionChart;

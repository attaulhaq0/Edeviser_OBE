import { cn } from '@/lib/utils';

export interface ConsistencyScoreRingProps {
  score: number; // 0-100
  label: string;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

const ConsistencyScoreRing = ({
  score,
  label,
  size = 120,
  strokeWidth = 10,
  className,
}: ConsistencyScoreRingProps) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, score));
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div className={cn('flex flex-col items-center gap-2', className)} data-testid="consistency-score-ring">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label={`${label}: ${clamped}%`}
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-slate-200"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#scoreGradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className="transition-[stroke-dashoffset] duration-500"
        />
        <defs>
          <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#14B8A6" />
            <stop offset="100%" stopColor="#0382BD" />
          </linearGradient>
        </defs>
        {/* Percentage text */}
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-gray-900 text-2xl font-black"
          style={{ fontSize: size * 0.22 }}
        >
          {clamped}%
        </text>
      </svg>
      <span className="text-xs font-bold tracking-widest uppercase text-gray-500">
        {label}
      </span>
    </div>
  );
};

export default ConsistencyScoreRing;

// =============================================================================
// AttendanceGrid — Attendance marking grid
// =============================================================================

import { cn } from '@/lib/utils';

type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

interface StudentAttendance {
  studentId: string;
  studentName: string;
  status: AttendanceStatus;
}

interface AttendanceGridProps {
  students: StudentAttendance[];
  onStatusChange: (studentId: string, status: AttendanceStatus) => void;
  className?: string;
}

const STATUS_STYLES: Record<AttendanceStatus, { bg: string; text: string; label: string }> = {
  present: { bg: 'bg-green-50 border-green-300', text: 'text-green-700', label: 'P' },
  absent: { bg: 'bg-red-50 border-red-300', text: 'text-red-700', label: 'A' },
  late: { bg: 'bg-yellow-50 border-yellow-300', text: 'text-yellow-700', label: 'L' },
  excused: { bg: 'bg-blue-50 border-blue-300', text: 'text-blue-700', label: 'E' },
};

const STATUSES: AttendanceStatus[] = ['present', 'absent', 'late', 'excused'];

const AttendanceGrid = ({ students, onStatusChange, className }: AttendanceGridProps) => (
  <div className={cn('space-y-2', className)}>
    {students.map((student) => (
      <div key={student.studentId} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
        <span className="text-sm font-medium flex-1 min-w-0 truncate">{student.studentName}</span>
        <div className="flex gap-1">
          {STATUSES.map((status) => {
            const style = STATUS_STYLES[status];
            const isActive = student.status === status;
            return (
              <button
                key={status}
                type="button"
                onClick={() => onStatusChange(student.studentId, status)}
                className={cn(
                  'h-8 w-8 rounded-lg border text-xs font-bold transition-colors',
                  isActive ? `${style.bg} ${style.text}` : 'border-gray-200 text-gray-400 hover:bg-gray-50',
                )}
                title={status}
              >
                {style.label}
              </button>
            );
          })}
        </div>
      </div>
    ))}
  </div>
);

export default AttendanceGrid;
export { STATUS_STYLES, STATUSES };
export type { AttendanceGridProps, StudentAttendance, AttendanceStatus };

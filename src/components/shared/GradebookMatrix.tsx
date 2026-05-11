// =============================================================================
// GradebookMatrix — Student x Assignment grade matrix
// =============================================================================
/* eslint-disable react-refresh/only-export-components */

import { cn } from "@/lib/utils";

interface GradeCell {
  score: number | null;
  maxScore: number;
}

interface GradebookStudent {
  studentId: string;
  studentName: string;
  grades: Record<string, GradeCell>;
}

interface GradebookAssignment {
  id: string;
  title: string;
  maxScore: number;
}

interface GradebookMatrixProps {
  students: GradebookStudent[];
  assignments: GradebookAssignment[];
  onCellClick?: (studentId: string, assignmentId: string) => void;
  className?: string;
}

function getCellColor(score: number | null, maxScore: number): string {
  if (score === null) return "bg-gray-50 text-gray-400";
  const pct = (score / maxScore) * 100;
  if (pct >= 85) return "bg-green-50 text-green-700";
  if (pct >= 70) return "bg-blue-50 text-blue-700";
  if (pct >= 50) return "bg-yellow-50 text-yellow-700";
  return "bg-red-50 text-red-700";
}

const GradebookMatrix = ({
  students,
  assignments,
  onCellClick,
  className,
}: GradebookMatrixProps) => (
  <div
    className={cn(
      "overflow-auto rounded-xl border border-slate-200",
      className
    )}
  >
    <table className="w-full text-sm">
      <thead>
        <tr className="bg-slate-50">
          <th className="sticky start-0 bg-slate-50 px-4 py-2 text-start font-medium text-gray-600 z-10">
            Student
          </th>
          {assignments.map((a) => (
            <th
              key={a.id}
              className="px-3 py-2 text-center font-medium text-gray-600 whitespace-nowrap"
            >
              <div className="truncate max-w-[100px]" title={a.title}>
                {a.title}
              </div>
              <div className="text-[10px] text-gray-400 font-normal">
                /{a.maxScore}
              </div>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {students.map((student) => (
          <tr key={student.studentId} className="border-t border-slate-100">
            <td className="sticky start-0 bg-white px-4 py-2 font-medium truncate max-w-[160px] z-10">
              {student.studentName}
            </td>
            {assignments.map((a) => {
              const cell = student.grades[a.id];
              const score = cell?.score ?? null;
              return (
                <td
                  key={a.id}
                  className={cn(
                    "px-3 py-2 text-center font-medium tabular-nums cursor-pointer hover:opacity-80 transition-opacity",
                    getCellColor(score, a.maxScore)
                  )}
                  onClick={() => onCellClick?.(student.studentId, a.id)}
                >
                  {score !== null ? score : "—"}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default GradebookMatrix;
export { getCellColor };
export type {
  GradebookMatrixProps,
  GradebookStudent,
  GradebookAssignment,
  GradeCell,
};

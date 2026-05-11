// =============================================================================
// CLOProgress — Student CLO attainment progress view
// Requirements: 44.1, 44.2, 44.3, 44.4, 44.5
// =============================================================================

import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, GraduationCap, FileText, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import Shimmer from "@/components/shared/Shimmer";
import CLOProgressBar from "@/components/shared/CLOProgressBar";
import { useAuth } from "@/hooks/useAuth";
import { useCLOProgress } from "@/hooks/useCLOProgress";
import { useCLOEvidence } from "@/hooks/useCLOEvidence";
import { useRealtime } from "@/hooks/useRealtime";
import { useReadHabitTimer } from "@/hooks/useReadHabitTimer";
import { queryKeys } from "@/lib/queryKeys";
import type { CLOEvidenceRecord } from "@/hooks/useCLOEvidence";

// ─── Evidence Panel ──────────────────────────────────────────────────────────

interface EvidencePanelProps {
  cloId: string;
  studentId: string;
}

const EvidencePanel = ({ cloId, studentId }: EvidencePanelProps) => {
  const { data: evidence, isLoading } = useCLOEvidence(cloId, studentId);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-3 px-4 text-sm text-gray-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading evidence…
      </div>
    );
  }

  if (!evidence || evidence.length === 0) {
    return (
      <div className="py-3 px-4 text-sm text-gray-400 italic">
        No evidence records yet.
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {evidence.map((record: CLOEvidenceRecord) => (
        <div
          key={record.id}
          className="flex items-center justify-between gap-4 py-2 px-4 rounded-lg bg-slate-50 text-sm"
        >
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="h-4 w-4 text-gray-400 shrink-0" />
            <span className="font-medium truncate">
              {record.assignment_title}
            </span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="font-bold tabular-nums">
              {Math.round(record.score_percent)}%
            </span>
            <span className="text-xs text-gray-500">
              {format(new Date(record.created_at), "MMM d, yyyy")}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

// ─── Component ───────────────────────────────────────────────────────────────

const CLOProgress = () => {
  const { user } = useAuth();
  const studentId = user?.id;
  const queryClient = useQueryClient();
  const { data: courseGroups, isLoading } = useCLOProgress(studentId);
  const [expandedCloId, setExpandedCloId] = useState<string | null>(null);

  // Track read habit — fires after 30s of viewing CLO progress
  useReadHabitTimer({
    pageType: "clo_progress",
    pageId: studentId ?? "",
  });

  // Realtime: invalidate CLO progress queries when outcome_attainment changes
  // Requirement 44.4 — update bars in real time when new grades are released
  const handleRealtimePayload = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.outcomeAttainment.lists(),
    });
    queryClient.invalidateQueries({
      queryKey: queryKeys.evidence.lists(),
    });
  }, [queryClient]);

  const handlePollingFallback = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.outcomeAttainment.lists(),
    });
  }, [queryClient]);

  useRealtime({
    table: "outcome_attainment",
    event: "*",
    filter: studentId ? `student_id=eq.${studentId}` : undefined,
    onPayload: handleRealtimePayload,
    pollingFn: handlePollingFallback,
    pollingInterval: 30_000,
  });

  const toggleClo = (cloId: string) => {
    setExpandedCloId((prev) => (prev === cloId ? null : cloId));
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold tracking-tight">CLO Progress</h2>
        {Array.from({ length: 2 }).map((_, i) => (
          <Shimmer key={i} className="h-48 rounded-xl" />
        ))}
      </div>
    );
  }

  // Empty state
  if (!courseGroups || courseGroups.length === 0) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold tracking-tight">CLO Progress</h2>
        <Card className="bg-white border-0 shadow-md rounded-xl">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="p-3 rounded-full bg-blue-50 mb-3">
              <GraduationCap className="h-8 w-8 text-blue-500" />
            </div>
            <p className="text-sm text-gray-500">
              No CLO progress data yet. Enroll in courses and complete
              assessments to see your progress.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">CLO Progress</h2>

      {courseGroups.map((group, groupIdx) => (
        <motion.div
          key={group.course_id}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: groupIdx * 0.08 }}
        >
          <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
            {/* Course header */}
            <div
              className="px-6 py-4 flex items-center gap-2"
              style={{
                background:
                  "linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)",
              }}
            >
              <BookOpen className="h-5 w-5 text-white" />
              <h3 className="text-lg font-bold tracking-tight text-white">
                {group.course_name}
              </h3>
            </div>

            {/* CLO entries */}
            <div className="p-6 space-y-4">
              {group.entries.length === 0 ? (
                <p className="text-sm text-gray-400 italic text-center py-4">
                  No CLOs defined for this course yet.
                </p>
              ) : (
                group.entries.map((entry) => {
                  const isExpanded = expandedCloId === entry.clo_id;
                  return (
                    <div key={entry.clo_id}>
                      <CLOProgressBar
                        title={entry.clo_title}
                        bloomsLevel={entry.blooms_level}
                        attainmentPercent={entry.attainment_percent}
                        attainmentLevel={entry.attainment_level}
                        onClick={() => toggleClo(entry.clo_id)}
                        isExpanded={isExpanded}
                      />
                      <AnimatePresence initial={false}>
                        {isExpanded && studentId && (
                          <motion.div
                            key="evidence"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.25, ease: "easeInOut" }}
                            className="overflow-hidden"
                          >
                            <div className="mt-2 ms-2 border-s-2 border-slate-200 ps-3">
                              <EvidencePanel
                                cloId={entry.clo_id}
                                studentId={studentId}
                              />
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  );
};

export default CLOProgress;

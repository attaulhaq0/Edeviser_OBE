import { useState, useCallback, useEffect } from 'react';
import { ClipboardCheck, Clock, FileQuestion } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import type { WizardStepProps } from './OnboardingWizard';

// ── Types ────────────────────────────────────────────────────────────

interface CourseWithBaseline {
  course_id: string;
  course_name: string;
  time_limit_minutes: number;
  question_count: number;
}

interface BaselineSelectStepProps extends WizardStepProps {
  onCoursesSelected: (courseIds: string[]) => void;
}

// ── Hook: fetch enrolled courses with active baseline tests ──────────

const useEnrolledCoursesWithBaseline = (studentId: string) => {
  return useQuery({
    queryKey: [...queryKeys.onboarding.baselineTests('enrolled'), studentId],
    queryFn: async (): Promise<CourseWithBaseline[]> => {
      // Fetch student's enrolled courses
      const { data: enrollments, error: enrollError } = await supabase
        .from('student_courses')
        .select('course_id, courses(id, name)')
        .eq('student_id', studentId)
        .eq('status', 'active');

      if (enrollError) throw enrollError;
      if (!enrollments?.length) return [];

      const courseIds = enrollments.map((e: Record<string, unknown>) => e.course_id as string);

      // Fetch active baseline configs for those courses
      const { data: configs, error: configError } = await supabase
        .from('baseline_test_config')
        .select('course_id, time_limit_minutes')
        .in('course_id', courseIds)
        .eq('is_active', true);

      if (configError) throw configError;
      if (!configs?.length) return [];

      // Fetch question counts per course
      const activeCourseIds = configs.map((c: Record<string, unknown>) => c.course_id as string);
      const { data: questions, error: qError } = await supabase
        .from('onboarding_questions')
        .select('course_id')
        .eq('assessment_type', 'baseline')
        .eq('is_active', true)
        .in('course_id', activeCourseIds);

      if (qError) throw qError;

      const questionCounts = new Map<string, number>();
      for (const q of questions ?? []) {
        const cid = q.course_id as string;
        questionCounts.set(cid, (questionCounts.get(cid) ?? 0) + 1);
      }

      // Build result
      const courseMap = new Map<string, string>();
      for (const e of enrollments) {
        const course = e.courses as Record<string, unknown> | null;
        if (course) {
          courseMap.set(e.course_id as string, (course.name as string) ?? 'Unknown Course');
        }
      }

      return configs
        .filter((c: Record<string, unknown>) => questionCounts.has(c.course_id as string))
        .map((c: Record<string, unknown>) => ({
          course_id: c.course_id as string,
          course_name: courseMap.get(c.course_id as string) ?? 'Unknown Course',
          time_limit_minutes: (c.time_limit_minutes as number) ?? 15,
          question_count: questionCounts.get(c.course_id as string) ?? 0,
        }));
    },
    enabled: !!studentId,
  });
};

// ── Component ────────────────────────────────────────────────────────

export const BaselineSelectStep = ({
  isDay1,
  onComplete,
  studentId,
  onCoursesSelected,
}: BaselineSelectStepProps) => {
  const { data: courses = [], isLoading } = useEnrolledCoursesWithBaseline(studentId);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // In Day 1 mode, baseline tests are skipped
  useEffect(() => {
    if (isDay1) {
      onCoursesSelected([]);
    }
  }, [isDay1, onCoursesSelected]);

  const toggleCourse = useCallback((courseId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(courseId)) {
        next.delete(courseId);
      } else {
        next.add(courseId);
      }
      return next;
    });
  }, []);

  const handleContinue = useCallback(() => {
    onCoursesSelected(Array.from(selectedIds));
    if (selectedIds.size > 0) {
      onComplete();
    }
  }, [selectedIds, onCoursesSelected, onComplete]);

  const handleSkip = useCallback(() => {
    onCoursesSelected([]);
  }, [onCoursesSelected]);

  if (isDay1) return null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <ClipboardCheck className="mb-4 h-10 w-10 text-blue-400" />
        <h2 className="text-lg font-bold tracking-tight text-gray-900">
          Baseline Tests
        </h2>
        <p className="mt-2 max-w-sm text-sm text-gray-500">
          No baseline tests are available for your enrolled courses yet. Your teachers may add them
          later.
        </p>
        <Button
          onClick={handleSkip}
          className="mt-6 bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95"
        >
          Continue
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <div className="mb-4 flex items-center gap-2">
        <ClipboardCheck className="h-5 w-5 text-blue-600" />
        <h2 className="text-lg font-bold tracking-tight text-gray-900">
          Baseline Tests
        </h2>
      </div>

      <p className="mb-6 max-w-md text-center text-sm text-gray-500">
        Select courses to take a quick diagnostic test. This helps us understand your starting
        knowledge level for each course.
      </p>

      <div className="w-full max-w-md space-y-3">
        {courses.map((course) => {
          const isSelected = selectedIds.has(course.course_id);
          return (
            <Card
              key={course.course_id}
              className={`cursor-pointer border-0 p-4 shadow-md rounded-xl transition-colors ${
                isSelected ? 'bg-blue-50 ring-2 ring-blue-500' : 'bg-white hover:bg-slate-50'
              }`}
              onClick={() => toggleCourse(course.course_id)}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${
                    isSelected ? 'border-blue-500 bg-blue-500' : 'border-slate-300'
                  }`}
                  aria-hidden="true"
                >
                  {isSelected && (
                    <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">{course.course_name}</p>
                  <div className="mt-1 flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <FileQuestion className="h-3.5 w-3.5" />
                      {course.question_count} questions
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {course.time_limit_minutes} min
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="mt-6 flex w-full max-w-md items-center justify-between">
        <Button variant="ghost" onClick={handleSkip} className="text-gray-500">
          Skip Baseline Tests
        </Button>
        <Button
          onClick={handleContinue}
          disabled={selectedIds.size === 0}
          className="gap-1 bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95"
        >
          Start Tests ({selectedIds.size} selected)
        </Button>
      </div>
    </div>
  );
};

export default BaselineSelectStep;

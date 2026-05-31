// =============================================================================
// JournalListPage — List all journal entries for the current student
// =============================================================================

import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { parseAsString, useQueryState } from "nuqs";
import { BookOpen, PenLine, Share2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useJournalEntries, type JournalEntry } from "@/hooks/useJournal";
import { useStudentCourseProgram } from "@/hooks/useStudentCourseProgram";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Shimmer from "@/components/shared/Shimmer";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const truncate = (text: string, maxLen: number): string =>
  text.length > maxLen ? `${text.slice(0, maxLen)}…` : text;

const formatDate = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const countWords = (text: string): number =>
  text.trim().split(/\s+/).filter(Boolean).length;

// ─── EntryCard ───────────────────────────────────────────────────────────────

interface EntryCardProps {
  entry: JournalEntry;
  courseName: string;
  onClick: () => void;
}

const EntryCard = ({ entry, courseName, onClick }: EntryCardProps) => {
  const words = countWords(entry.content);

  return (
    <Card
      className="bg-white border-0 shadow-md rounded-xl p-4 cursor-pointer hover:shadow-lg transition-shadow"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick();
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-gray-500">
              {formatDate(entry.created_at)}
            </span>
            <Badge
              variant="secondary"
              className="bg-blue-50 text-blue-700 border-blue-200 text-xs"
            >
              {courseName}
            </Badge>
            {entry.is_shared && (
              <Badge
                variant="secondary"
                className="bg-green-50 text-green-700 border-green-200 text-xs"
              >
                <Share2 className="h-3 w-3 me-1" />
                Shared
              </Badge>
            )}
          </div>
          <p className="text-sm text-gray-700 leading-relaxed">
            {truncate(entry.content, 150)}
          </p>
          <p className="text-xs text-gray-400 mt-2">{words} words</p>
        </div>
      </div>
    </Card>
  );
};

// ─── JournalListPage ─────────────────────────────────────────────────────────

const JournalListPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?.id ?? "";

  // URL-persisted course filter
  const [courseFilter, setCourseFilter] = useQueryState(
    "course",
    parseAsString.withDefault("all")
  );

  // Fetch student's enrolled courses for the filter dropdown
  const { courses, isLoading: isLoadingCourses } =
    useStudentCourseProgram(userId);

  // Fetch journal entries with optional course filter
  const filters =
    courseFilter && courseFilter !== "all" ? { courseId: courseFilter } : {};
  const { data: entries, isLoading: isLoadingEntries } =
    useJournalEntries(filters);

  // Build course name lookup
  const courseNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of courses) {
      map.set(c.id, c.name);
    }
    return map;
  }, [courses]);

  const isLoading = isLoadingEntries || isLoadingCourses;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <BookOpen className="h-6 w-6 text-teal-500" />
          <h1 className="text-2xl font-bold tracking-tight">
            Reflection Journal
          </h1>
        </div>
        <Button
          onClick={() => navigate("/student/journal/new")}
          className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95 text-white"
        >
          <PenLine className="h-4 w-4" />
          New Entry
        </Button>
      </div>

      {/* Course Filter */}
      <div className="flex items-center gap-4">
        <Select value={courseFilter} onValueChange={(v) => setCourseFilter(v)}>
          <SelectTrigger className="w-64 bg-white">
            <SelectValue placeholder="Filter by course" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Courses</SelectItem>
            {courses.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Entry List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Shimmer key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : !entries || entries.length === 0 ? (
        <Card className="bg-white border-0 shadow-md rounded-xl p-8 text-center">
          <BookOpen className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">
            No journal entries yet. Start reflecting on your learning!
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <EntryCard
              key={entry.id}
              entry={entry}
              courseName={
                courseNameMap.get(entry.course_id) ?? "Unknown Course"
              }
              onClick={() => navigate(`/student/journal/${entry.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default JournalListPage;

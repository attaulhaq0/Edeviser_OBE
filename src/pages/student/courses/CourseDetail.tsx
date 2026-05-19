// Task 66.7: Student course detail — materials organized by module + Read habit timer
// Requirements: 76.5, 76.6
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  useCourseModules,
  useCourseMaterials,
  type CourseModule,
  type CourseMaterial,
} from "@/hooks/useCourseModules";
import { useAnnouncements } from "@/hooks/useAnnouncements";
import { useReadHabitTimer } from "@/hooks/useReadHabitTimer";
import { useCourse } from "@/hooks/useCourses";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Shimmer from "@/components/shared/Shimmer";
import MaterialItem from "@/components/shared/MaterialItem";
import AnnouncementCard from "@/components/shared/AnnouncementCard";
import {
  ArrowLeft,
  FolderOpen,
  ChevronDown,
  ChevronRight,
  Megaphone,
  BookOpen,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { format } from "date-fns";

// ─── Module Section with materials ──────────────────────────────────────────

interface ModuleSectionProps {
  module: CourseModule;
  courseId: string;
  onMaterialClick: (material: CourseMaterial) => void;
}

const ModuleSection = ({
  module: mod,
  onMaterialClick,
}: ModuleSectionProps) => {
  const [expanded, setExpanded] = useState(true);
  const { data: materials, isLoading } = useCourseMaterials(mod.id);

  // Only show published materials to students
  const publishedMaterials = (materials ?? []).filter((m) => m.is_published);

  return (
    <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden gap-0 py-0">
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setExpanded(!expanded);
          }
        }}
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" />
        )}
        <FolderOpen className="h-4 w-4 text-blue-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold truncate">{mod.title}</h3>
          {mod.description && (
            <p className="text-xs text-gray-500 truncate">{mod.description}</p>
          )}
        </div>
        <Badge variant="outline" className="text-xs text-gray-400">
          {publishedMaterials.length} item
          {publishedMaterials.length !== 1 ? "s" : ""}
        </Badge>
      </div>
      {expanded && (
        <div className="border-t border-slate-100 px-2 py-2">
          {isLoading ? (
            <Shimmer className="h-10 rounded-lg mx-2" />
          ) : publishedMaterials.length === 0 ? (
            <p className="text-xs text-gray-400 px-4 py-2">
              No materials available yet.
            </p>
          ) : (
            publishedMaterials.map((m) => (
              <MaterialItem
                key={m.id}
                title={m.title}
                type={m.type}
                url={m.content_url ?? m.file_path ?? undefined}
                onClick={() => onMaterialClick(m)}
              />
            ))
          )}
        </div>
      )}
    </Card>
  );
};

// ─── Material Viewer with Read Habit Timer ──────────────────────────────────

interface MaterialViewerProps {
  material: CourseMaterial;
  onClose: () => void;
}

const MaterialViewer = ({ material, onClose }: MaterialViewerProps) => {
  const { elapsedSeconds, isCompleted } = useReadHabitTimer({
    pageType: "assignment_detail", // reuse existing page type for read habit
    pageId: material.id,
  });

  return (
    <Card className="bg-white border-0 shadow-md rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold tracking-tight">{material.title}</h2>
        <div className="flex items-center gap-2">
          {isCompleted ? (
            <Badge className="bg-green-50 text-green-600 border-green-200 text-xs">
              <CheckCircle2 className="h-3 w-3 me-1" /> Read habit ✓
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs text-gray-400">
              <Clock className="h-3 w-3 me-1" /> {30 - elapsedSeconds}s to read
              habit
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>

      {material.description && (
        <p className="text-sm text-gray-600 mb-4">{material.description}</p>
      )}

      {material.type === "text" && (
        <div className="prose prose-sm max-w-none whitespace-pre-wrap text-gray-700 bg-slate-50 rounded-lg p-4">
          {material.content_url}
        </div>
      )}

      {material.type === "video" && material.content_url && (
        <div className="aspect-video rounded-lg overflow-hidden bg-black">
          <iframe
            src={material.content_url.replace("watch?v=", "embed/")}
            title={material.title}
            className="w-full h-full"
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          />
        </div>
      )}

      {material.type === "link" && material.content_url && (
        <a
          href={material.content_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-600 hover:underline"
        >
          Open link: {material.content_url}
        </a>
      )}

      {material.type === "file" &&
        (material.content_url || material.file_path) && (
          <a
            href={material.content_url ?? material.file_path ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline"
          >
            <BookOpen className="h-4 w-4" /> Download / View File
          </a>
        )}
    </Card>
  );
};

// ─── Main Component ─────────────────────────────────────────────────────────

const CourseDetail = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [viewingMaterial, setViewingMaterial] = useState<CourseMaterial | null>(
    null
  );

  const { data: course, isLoading: courseLoading } = useCourse(courseId);
  const { data: modules, isLoading: modulesLoading } =
    useCourseModules(courseId);
  const { data: announcements, isLoading: announcementsLoading } =
    useAnnouncements(courseId);

  // Only show published modules to students
  const publishedModules = (modules ?? []).filter((m) => m.is_published);

  if (courseLoading) {
    return (
      <div className="space-y-4">
        <Shimmer className="h-8 w-48 rounded-lg" />
        <Shimmer className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="text-gray-500"
        >
          <ArrowLeft className="h-4 w-4 me-1" /> Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {course?.name ?? "Course"}
          </h1>
          {course?.code && (
            <p className="text-sm text-gray-500">{course.code}</p>
          )}
        </div>
      </div>

      {/* Material Viewer */}
      {viewingMaterial && (
        <MaterialViewer
          material={viewingMaterial}
          onClose={() => setViewingMaterial(null)}
        />
      )}

      {/* Course Announcements */}
      {!viewingMaterial && (
        <>
          {announcementsLoading ? (
            <Shimmer className="h-24 rounded-xl" />
          ) : (
            (announcements ?? []).length > 0 && (
              <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden gap-0 py-0">
                <div
                  className="px-6 py-4 flex items-center gap-2"
                  style={{
                    background: "var(--brand-gradient)",
                  }}
                >
                  <Megaphone className="h-5 w-5 text-white" />
                  <h2 className="text-lg font-bold tracking-tight text-white">
                    Announcements
                  </h2>
                </div>
                <div className="p-4 space-y-2">
                  {(announcements ?? []).slice(0, 3).map((a) => (
                    <AnnouncementCard
                      key={a.id}
                      title={a.title}
                      content={a.content}
                      authorName=""
                      createdAt={format(new Date(a.created_at), "MMM d, yyyy")}
                      priority={a.is_pinned ? "high" : "normal"}
                      className="cursor-pointer"
                    />
                  ))}
                </div>
              </Card>
            )
          )}

          {/* Course Modules & Materials */}
          <div className="space-y-3">
            <h2 className="text-lg font-bold tracking-tight">
              Course Materials
            </h2>
            {modulesLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Shimmer key={i} className="h-16 rounded-xl" />
                ))}
              </div>
            ) : publishedModules.length === 0 ? (
              <Card className="bg-white border-0 shadow-md rounded-xl p-8 text-center">
                <FolderOpen className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">
                  No course materials available yet.
                </p>
              </Card>
            ) : (
              publishedModules.map((m) => (
                <ModuleSection
                  key={m.id}
                  module={m}
                  courseId={courseId ?? ""}
                  onMaterialClick={setViewingMaterial}
                />
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default CourseDetail;

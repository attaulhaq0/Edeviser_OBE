import { useMemo, useState } from "react";
import { format } from "date-fns";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  BookOpen,
  CheckCircle2,
  CircleAlert,
  Clock,
  File,
  FileText,
  FolderOpen,
  Link as LinkIcon,
  Megaphone,
  Sparkles,
  Video,
  type LucideIcon,
} from "lucide-react";

import ErrorState from "@/components/shared/ErrorState";
import { Button, Badge, PCard, SectionHeader, Shimmer } from "@/design-system";
import { useAnnouncements } from "@/hooks/useAnnouncements";
import { useAuth } from "@/hooks/useAuth";
import { useCourse } from "@/hooks/useCourses";
import {
  useCourseAllMaterials,
  useCourseModules,
  type CourseMaterial,
  type CourseModule,
} from "@/hooks/useCourseModules";
import { useReadHabitTimer } from "@/hooks/useReadHabitTimer";
import { useStudentAssignments } from "@/hooks/useSubmissions";
import { useStudentCourses } from "@/hooks/useStudentCourses";
import { resolveCourseColor } from "@/lib/courseColor";
import { cn } from "@/lib/utils";

const MATERIAL_META: Record<
  CourseMaterial["type"],
  {
    icon: LucideIcon;
    badge: string;
    tone: string;
  }
> = {
  text: { icon: FileText, badge: "Text", tone: "bg-slate-100 text-slate-700" },
  video: { icon: Video, badge: "Video", tone: "bg-violet-50 text-violet-700" },
  link: {
    icon: LinkIcon,
    badge: "Link",
    tone: "bg-emerald-50 text-emerald-700",
  },
  file: { icon: File, badge: "File", tone: "bg-blue-50 text-blue-700" },
};

const CourseSummaryStat = ({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) => (
  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-center">
    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground">
      {label}
    </p>
    <p className="mt-1 text-lg font-black text-foreground">{value}</p>
    {hint ? (
      <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>
    ) : null}
  </div>
);

const MaterialViewerCard = ({
  courseName,
  material,
}: {
  courseName: string;
  material: CourseMaterial;
}) => {
  const { t } = useTranslation("student");
  const { elapsedSeconds, isCompleted } = useReadHabitTimer({
    pageType: "assignment_detail",
    pageId: material.id,
  });
  const meta = MATERIAL_META[material.type];
  const Icon = meta.icon;

  return (
    <PCard className="overflow-hidden p-0">
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div className="min-w-0 flex items-start gap-3">
          <span
            aria-hidden="true"
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-2xl",
              meta.tone
            )}
          >
            <Icon className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground">
              {courseName}
            </p>
            <h3 className="truncate text-base font-bold text-foreground">
              {material.title}
            </h3>
            {material.description ? (
              <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                {material.description}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge
            variant={isCompleted ? "default" : "secondary"}
            className="rounded-full px-2.5 py-1 text-[11px]"
          >
            {isCompleted ? (
              <CheckCircle2 className="me-1 size-3.5" aria-hidden="true" />
            ) : (
              <Clock className="me-1 size-3.5" aria-hidden="true" />
            )}
            {isCompleted
              ? t("courses.detail.readCompleted", "Read habit complete")
              : t("courses.detail.reading", {
                  defaultValue: "{{count}}s reading",
                  count: Math.max(0, 30 - elapsedSeconds),
                })}
          </Badge>
        </div>
      </div>

      <div className="space-y-4 px-4 py-4">
        {material.type === "text" ? (
          <div className="rounded-2xl bg-slate-50 p-4 text-sm leading-7 text-slate-700 whitespace-pre-wrap">
            {material.content_url ??
              t(
                "courses.detail.noTextBody",
                "No text content is attached yet."
              )}
          </div>
        ) : null}

        {material.type === "video" && material.content_url ? (
          <div className="overflow-hidden rounded-2xl border border-slate-100 bg-black">
            <iframe
              title={material.title}
              src={material.content_url.replace("watch?v=", "embed/")}
              className="aspect-video w-full"
              allowFullScreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            />
          </div>
        ) : null}

        {material.type === "link" && material.content_url ? (
          <a
            href={material.content_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-100"
          >
            <LinkIcon className="size-4" aria-hidden="true" />
            {t("courses.detail.openLink", "Open resource")}
          </a>
        ) : null}

        {material.type === "file" &&
        (material.content_url || material.file_path) ? (
          <a
            href={material.content_url ?? material.file_path ?? "#"}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-100"
          >
            <FileText className="size-4" aria-hidden="true" />
            {t("courses.detail.openFile", "Download or view file")}
          </a>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className="rounded-full px-2.5 py-1 text-[11px]"
          >
            {meta.badge}
          </Badge>
          <Badge
            variant="outline"
            className="rounded-full px-2.5 py-1 text-[11px]"
          >
            {t("courses.detail.readTimer", "Reading timer")}
          </Badge>
        </div>
      </div>
    </PCard>
  );
};

const ModuleCard = ({
  module,
  materials,
  isOpen,
  onToggle,
  onSelectMaterial,
  activeMaterialId,
}: {
  module: CourseModule;
  materials: CourseMaterial[];
  isOpen: boolean;
  onToggle: () => void;
  onSelectMaterial: (material: CourseMaterial) => void;
  activeMaterialId: string | null;
}) => {
  const { t } = useTranslation("student");
  const publishedCount = materials.length;
  const isLocked = publishedCount === 0;

  return (
    <PCard className="overflow-hidden p-0">
      <Button
        type="button"
        variant="ghost"
        className="h-auto w-full justify-between gap-3 rounded-none px-4 py-3 text-left hover:bg-slate-50"
        onClick={onToggle}
        aria-expanded={isOpen}
      >
        <div className="flex min-w-0 items-start gap-3">
          <span
            aria-hidden="true"
            className={cn(
              "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-2xl",
              isLocked
                ? "bg-slate-100 text-slate-400"
                : "bg-blue-50 text-blue-700"
            )}
          >
            <FolderOpen className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-foreground">
              {module.title}
            </p>
            {module.description ? (
              <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                {module.description}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Badge
            variant={isLocked ? "secondary" : "outline"}
            className="rounded-full px-2.5 py-1 text-[11px]"
          >
            {isLocked
              ? t("courses.detail.locked", "Locked")
              : t("courses.detail.items", {
                  defaultValue: "{{count}} items",
                  count: publishedCount,
                })}
          </Badge>
          <ArrowRight
            className={cn(
              "size-4 transition-transform rtl:rotate-180",
              isOpen && "rotate-90"
            )}
            aria-hidden="true"
          />
        </div>
      </Button>

      {isOpen ? (
        <div className="border-t border-slate-100 p-2">
          {publishedCount === 0 ? (
            <p className="px-3 py-3 text-sm text-muted-foreground">
              {t(
                "courses.detail.noMaterials",
                "No published materials are available yet."
              )}
            </p>
          ) : (
            <div className="space-y-1">
              {materials.map((material) => {
                const meta = MATERIAL_META[material.type];
                const Icon = meta.icon;
                const active = material.id === activeMaterialId;

                return (
                  <Button
                    key={material.id}
                    type="button"
                    variant="ghost"
                    onClick={() => onSelectMaterial(material)}
                    className={cn(
                      "h-auto w-full justify-between rounded-2xl px-3 py-2.5 text-left",
                      active && "bg-blue-50 text-blue-800 hover:bg-blue-100"
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span
                        aria-hidden="true"
                        className={cn(
                          "flex size-8 shrink-0 items-center justify-center rounded-xl",
                          meta.tone
                        )}
                      >
                        <Icon className="size-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">
                          {material.title}
                        </span>
                        {material.description ? (
                          <span className="block truncate text-xs text-muted-foreground">
                            {material.description}
                          </span>
                        ) : null}
                      </span>
                    </span>

                    <Badge
                      variant={active ? "default" : "outline"}
                      className="rounded-full px-2 py-1 text-[10px] uppercase tracking-widest"
                    >
                      {meta.badge}
                    </Badge>
                  </Button>
                );
              })}
            </div>
          )}
        </div>
      ) : null}
    </PCard>
  );
};

const CourseDetailScreen = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation("student");
  const { user } = useAuth();
  const [selection, setSelection] = useState<{
    openModuleId: string | null;
    activeMaterialId: string | null;
  }>({
    openModuleId: null,
    activeMaterialId: null,
  });

  const course = useCourse(courseId);
  const modules = useCourseModules(courseId ?? "");
  const materials = useCourseAllMaterials(courseId ?? "");
  const announcements = useAnnouncements(courseId);
  const studentCourses = useStudentCourses(user?.id);
  const studentAssignments = useStudentAssignments(courseId);

  const hasError =
    course.isError ||
    modules.isError ||
    materials.isError ||
    announcements.isError ||
    studentCourses.isError ||
    studentAssignments.isError;

  const retryAll = () => {
    void course.refetch();
    void modules.refetch();
    void materials.refetch();
    void announcements.refetch();
    void studentCourses.refetch();
    void studentAssignments.refetch();
  };

  const courseSnapshot = useMemo(
    () => studentCourses.data?.find((item) => item.id === courseId) ?? null,
    [courseId, studentCourses.data]
  );

  const publishedModules = useMemo(
    () => (modules.data ?? []).filter((module) => module.is_published),
    [modules.data]
  );

  const publishedMaterials = useMemo(
    () => (materials.data ?? []).filter((material) => material.is_published),
    [materials.data]
  );

  const materialsByModule = useMemo(() => {
    const next = new Map<string, CourseMaterial[]>();
    for (const material of publishedMaterials) {
      const list = next.get(material.module_id) ?? [];
      list.push(material);
      next.set(material.module_id, list);
    }
    return next;
  }, [publishedMaterials]);

  const nextAssignment = useMemo(() => {
    const assignments = studentAssignments.data ?? [];
    return (
      assignments.find(
        (assignment) => (assignment.submissions?.length ?? 0) === 0
      ) ?? null
    );
  }, [studentAssignments.data]);

  const visibleAnnouncements = useMemo(
    () => (announcements.data ?? []).slice(0, 3),
    [announcements.data]
  );

  if (!courseId) {
    return (
      <ErrorState
        message={t(
          "courses.detail.courseNotFound",
          "This course could not be loaded."
        )}
        title={t("courses.detail.courseNotFoundTitle", "Course unavailable")}
        onRetry={() => navigate("/student/courses")}
        retryLabel={t("courses.detail.backToCourses", "Back to courses")}
      />
    );
  }

  if (course.isLoading && !course.data) {
    return (
      <div className="space-y-4">
        <Shimmer className="h-8 w-56 rounded-2xl" />
        <Shimmer className="h-44 rounded-3xl" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Shimmer className="h-60 rounded-3xl" />
          <Shimmer className="h-60 rounded-3xl" />
        </div>
        <Shimmer className="h-80 rounded-3xl" />
      </div>
    );
  }

  if (hasError) {
    return (
      <ErrorState
        title={t("courses.detail.loadErrorTitle", "Course details unavailable")}
        message={t(
          "courses.detail.loadError",
          "We couldn't load one or more course details. Please try again."
        )}
        onRetry={retryAll}
        retryLabel={t("common:buttons.retry", "Try again")}
      />
    );
  }

  if (!course.data) {
    return (
      <ErrorState
        title={t("courses.detail.courseNotFoundTitle", "Course unavailable")}
        message={t(
          "courses.detail.courseNotFound",
          "This course could not be loaded."
        )}
        onRetry={() => navigate("/student/courses")}
        retryLabel={t("courses.detail.backToCourses", "Back to courses")}
      />
    );
  }

  const activeMaterial =
    publishedMaterials.find(
      (material) => material.id === selection.activeMaterialId
    ) ??
    publishedMaterials[0] ??
    null;
  const activeMaterialId = activeMaterial?.id ?? null;
  const openModuleId =
    publishedModules.find((module) => module.id === selection.openModuleId)
      ?.id ??
    publishedModules[0]?.id ??
    null;
  const courseColor = resolveCourseColor(
    courseSnapshot?.color ?? null,
    courseId
  );
  const teacherName = courseSnapshot?.teacher_name ?? null;
  const progress = courseSnapshot?.progress_percent ?? 0;
  const attainment = courseSnapshot?.attainment_percent;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/student/courses")}
          className="text-muted-foreground"
        >
          <ArrowLeft className="me-1 size-4" />
          {t("courses.detail.backToCourses", "Back to courses")}
        </Button>
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-black tracking-tight text-foreground">
            {course.data?.name ?? t("courses.detail.title", "Course details")}
          </h1>
          <p className="truncate text-sm text-muted-foreground">
            {course.data?.code
              ? `${course.data.code}${teacherName ? ` · ${teacherName}` : ""}`
              : teacherName ?? ""}
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <PCard className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-muted-foreground">
                {t("courses.detail.progressLabel", "Progress")}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="flex size-10 shrink-0 items-center justify-center rounded-2xl"
                  style={{ background: `${courseColor}20`, color: courseColor }}
                >
                  <BookOpen className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-muted-foreground">
                    {course.data?.name}
                  </p>
                  <p className="text-lg font-black text-foreground">
                    {progress.toFixed(0)}%
                  </p>
                </div>
              </div>
            </div>

            <Badge className="rounded-full px-3 py-1 text-[11px]">
              {attainment != null
                ? t("courses.detail.attainmentValue", {
                    defaultValue: "{{count}}% attainment",
                    count: attainment,
                  })
                : t("courses.detail.noAttainment", "No attainment data")}
            </Badge>
          </div>

          <div
            aria-label={t(
              "courses.progressLabel",
              "Course progress: {{percent}}%",
              {
                percent: progress,
              }
            )}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
            className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100"
            role="progressbar"
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${progress}%`,
                background: "var(--brand-gradient)",
              }}
            />
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <CourseSummaryStat
              label={t("courses.detail.stats.modules", "Modules")}
              value={`${publishedModules.length}`}
            />
            <CourseSummaryStat
              label={t("courses.detail.stats.materials", "Materials")}
              value={`${publishedMaterials.length}`}
            />
            <CourseSummaryStat
              label={t("courses.detail.stats.assignments", "Assignments")}
              value={`${studentAssignments.data?.length ?? 0}`}
            />
            <CourseSummaryStat
              label={t("courses.detail.stats.attainment", "Attainment")}
              value={attainment != null ? `${attainment}%` : "—"}
            />
          </div>
        </PCard>

        {nextAssignment ? (
          <Link
            to={`/student/assignments/${nextAssignment.id}`}
            className="block rounded-3xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <PCard className="h-full border-teal-200 bg-gradient-to-br from-teal-50 to-blue-50 p-4">
              <div className="flex h-full flex-col justify-between gap-4">
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-teal-700">
                    {t(
                      "courses.detail.continueTitle",
                      "Continue where you left off"
                    )}
                  </p>
                  <h2 className="text-base font-black text-foreground">
                    {nextAssignment.title}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {nextAssignment.due_date
                      ? t("courses.detail.dueShort", {
                          defaultValue: "Due {{date}}",
                          date: format(
                            new Date(nextAssignment.due_date),
                            "MMM d"
                          ),
                        })
                      : t("courses.noDueDate", "No due date")}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-teal-700">
                    <CircleAlert className="size-4" />
                    {t("courses.detail.openAssignment", "Open assignment")}
                  </div>
                  <span
                    aria-hidden="true"
                    className="flex size-10 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm"
                    style={{ background: "var(--brand-gradient)" }}
                  >
                    <ArrowRight className="size-5 rtl:rotate-180" />
                  </span>
                </div>
              </div>
            </PCard>
          </Link>
        ) : (
          <PCard className="flex items-center justify-center p-6 text-sm text-muted-foreground">
            <Sparkles className="me-2 size-4 text-teal-600" />
            {t("courses.detail.noOpenWork", "Nothing is due soon.")}
          </PCard>
        )}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-5">
          <div className="space-y-3">
            <SectionHeader
              icon={Megaphone}
              title={t("courses.detail.announcements", "Announcements")}
              description={t(
                "courses.detail.announcementsDescription",
                "Recent updates from the course team."
              )}
            />
            {announcements.isLoading ? (
              <Shimmer className="h-40 rounded-3xl" />
            ) : visibleAnnouncements.length > 0 ? (
              <div className="space-y-3">
                {visibleAnnouncements.map((announcement) => (
                  <PCard
                    key={announcement.id}
                    className={cn(
                      "p-4",
                      announcement.is_pinned
                        ? "border-amber-200 bg-amber-50/40"
                        : "border-slate-100"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        aria-hidden="true"
                        className={cn(
                          "flex size-10 shrink-0 items-center justify-center rounded-2xl",
                          announcement.is_pinned
                            ? "bg-amber-100 text-amber-700"
                            : "bg-slate-100 text-slate-500"
                        )}
                      >
                        <Megaphone className="size-4" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-bold text-foreground">
                            {announcement.title}
                          </h3>
                          {announcement.is_pinned ? (
                            <Badge className="rounded-full px-2 py-0.5 text-[10px] uppercase tracking-widest">
                              {t("courses.detail.pinned", "Pinned")}
                            </Badge>
                          ) : null}
                        </div>
                        <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">
                          {announcement.content}
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {format(
                            new Date(announcement.created_at),
                            "MMM d, yyyy"
                          )}
                        </p>
                      </div>
                    </div>
                  </PCard>
                ))}
              </div>
            ) : (
              <PCard className="p-5 text-sm text-muted-foreground">
                {t(
                  "courses.detail.noAnnouncements",
                  "There are no announcements for this course yet."
                )}
              </PCard>
            )}
          </div>

          <div className="space-y-3">
            <SectionHeader
              icon={FolderOpen}
              title={t("courses.detail.modules", "Modules")}
              description={t(
                "courses.detail.modulesDescription",
                "Open a module to browse the published materials inside it."
              )}
            />

            {modules.isLoading || materials.isLoading ? (
              <div className="space-y-3">
                <Shimmer className="h-18 rounded-3xl" />
                <Shimmer className="h-18 rounded-3xl" />
                <Shimmer className="h-18 rounded-3xl" />
              </div>
            ) : publishedModules.length > 0 ? (
              <div className="space-y-3">
                {publishedModules.map((module) => (
                  <ModuleCard
                    key={module.id}
                    module={module}
                    materials={materialsByModule.get(module.id) ?? []}
                    isOpen={openModuleId === module.id}
                    onToggle={() =>
                      setSelection((current) => ({
                        ...current,
                        openModuleId:
                          current.openModuleId === module.id ? null : module.id,
                      }))
                    }
                    onSelectMaterial={(material) => {
                      setSelection({
                        openModuleId: material.module_id,
                        activeMaterialId: material.id,
                      });
                    }}
                    activeMaterialId={activeMaterialId}
                  />
                ))}
              </div>
            ) : (
              <PCard className="p-6 text-sm text-muted-foreground">
                {t(
                  "courses.detail.noPublishedModules",
                  "No published modules are available yet."
                )}
              </PCard>
            )}
          </div>
        </div>

        <div className="space-y-5">
          {activeMaterial ? (
            <MaterialViewerCard
              key={activeMaterial.id}
              material={activeMaterial}
              courseName={
                course.data?.name ?? t("courses.detail.title", "Course details")
              }
            />
          ) : (
            <PCard className="flex min-h-80 items-center justify-center p-8 text-center">
              <div className="max-w-sm">
                <div
                  aria-hidden="true"
                  className="mx-auto flex size-14 items-center justify-center rounded-3xl bg-teal-50 text-teal-700"
                >
                  <BookOpen className="size-6" />
                </div>
                <h2 className="mt-4 text-lg font-bold text-foreground">
                  {t(
                    "courses.detail.selectMaterialTitle",
                    "Select a material to preview it here"
                  )}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {t(
                    "courses.detail.selectMaterialHint",
                    "Browse a module on the left, then open a material to read or view it."
                  )}
                </p>
              </div>
            </PCard>
          )}

          <Link
            to="/student/tutor"
            className="block rounded-3xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <PCard className="border-teal-200 bg-gradient-to-br from-teal-50 to-blue-50 p-4">
              <div className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="flex size-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm"
                  style={{ background: "var(--brand-gradient)" }}
                >
                  <Bot className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">
                    {t("courses.stuck", "Stuck on this course?")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t(
                      "courses.tutorPrompt",
                      "Ask your AI Tutor for a guided explanation."
                    )}
                  </p>
                </div>
                <span className="shrink-0 text-xs font-semibold text-teal-700">
                  {t("courses.ask", "Ask")}
                </span>
              </div>
            </PCard>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CourseDetailScreen;

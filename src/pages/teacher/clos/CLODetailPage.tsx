// =============================================================================
// CLODetailPage — Read-only Course Learning Outcome drill-down (Req 14.1)
//
// Opens from the "View" action on the CLO list (route /teacher/clos/:id).
// Shows the CLO's title, description, Bloom's level, parent course, mapped PLOs,
// linked assignments, and course-scope attainment. Strictly read-only: all
// editing stays on the existing /teacher/clos/:id/edit route (Req 14.5).
//
// All data is fetched through hooks (no raw supabase in the component).
// =============================================================================

import { useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import {
  ArrowLeft,
  Pencil,
  Target,
  ListChecks,
  ClipboardList,
  BookOpen,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import BloomsPill from "@/components/shared/BloomsPill";
import OutcomeTypeBadge from "@/components/shared/OutcomeTypeBadge";
import Shimmer from "@/components/shared/Shimmer";
import {
  useCLO,
  useCLOMappedPLOs,
  useCLOLinkedAssignments,
  useCLOAttainment,
} from "@/hooks/useCLOs";
import { useCourse } from "@/hooks/useCourses";
import { resolveName } from "@/lib/db/resolveName";
import { getAttainmentColor } from "@/lib/attainmentClassifier";

// ─── Section card (gradient header) ──────────────────────────────────────────

interface SectionCardProps {
  icon: typeof Target;
  title: string;
  children: React.ReactNode;
}

const SectionCard = ({ icon: Icon, title, children }: SectionCardProps) => (
  <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
    <div
      className="px-6 py-4 flex items-center gap-2"
      style={{
        background: "linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)",
      }}
    >
      <Icon className="h-5 w-5 text-white" />
      <h2 className="text-lg font-bold tracking-tight text-white">{title}</h2>
    </div>
    <div className="p-6">{children}</div>
  </Card>
);

// ─── Page ─────────────────────────────────────────────────────────────────────

const CLODetailPage = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const { data: clo, isLoading: cloLoading } = useCLO(id);
  const { data: mappedPLOs = [], isLoading: plosLoading } =
    useCLOMappedPLOs(id);
  const { data: assignments = [], isLoading: assignmentsLoading } =
    useCLOLinkedAssignments(id, clo?.course_id ?? undefined);
  const { data: attainment, isLoading: attainmentLoading } =
    useCLOAttainment(id);
  const { data: course } = useCourse(clo?.course_id ?? undefined);

  if (cloLoading) {
    return (
      <div className="space-y-6">
        <Shimmer className="h-10 w-48" />
        <Shimmer className="h-40" />
        <Shimmer className="h-40" />
      </div>
    );
  }

  if (!clo) {
    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          size="sm"
          className="-ms-2"
          onClick={() => navigate("/teacher/clos")}
        >
          <ArrowLeft className="h-4 w-4" /> Back to CLOs
        </Button>
        <Card className="bg-white border-0 shadow-md rounded-xl p-10 text-center">
          <p className="text-sm text-slate-500">
            This CLO could not be found. It may have been deleted.
          </p>
        </Card>
      </div>
    );
  }

  const attainmentPercent = attainment?.percent ?? null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Button
            variant="ghost"
            size="sm"
            className="-ms-2"
            onClick={() => navigate("/teacher/clos")}
          >
            <ArrowLeft className="h-4 w-4" /> Back to CLOs
          </Button>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight">{clo.title}</h1>
            <OutcomeTypeBadge type="CLO" />
            {clo.blooms_level && <BloomsPill level={clo.blooms_level} />}
          </div>
          <p className="text-sm text-slate-500 flex items-center gap-1.5">
            <BookOpen className="h-4 w-4" />
            {resolveName(course?.name)}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => navigate(`/teacher/clos/${clo.id}/edit`)}
        >
          <Pencil className="h-4 w-4" /> Edit
        </Button>
      </div>

      {/* Overview + Attainment */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SectionCard icon={Target} title="Outcome">
            {clo.description ? (
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                {clo.description}
              </p>
            ) : (
              <p className="text-sm text-slate-400">No description provided.</p>
            )}
          </SectionCard>
        </div>

        <Card className="bg-white border-0 shadow-md rounded-xl p-6 flex flex-col justify-center">
          <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">
            Course Attainment
          </p>
          {attainmentLoading ? (
            <Shimmer className="h-9 w-24 mt-2" />
          ) : attainmentPercent === null ? (
            <>
              <p className="text-2xl font-black mt-1 text-slate-400">—</p>
              <p className="text-xs text-slate-500 mt-1">
                No attainment recorded yet.
              </p>
            </>
          ) : (
            <>
              <p
                className="text-2xl font-black mt-1"
                style={{ color: getAttainmentColor(attainmentPercent) }}
              >
                {attainmentPercent.toFixed(1)}%
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Across {attainment?.sampleCount ?? 0} course rollup
                {(attainment?.sampleCount ?? 0) === 1 ? "" : "s"}.
              </p>
            </>
          )}
        </Card>
      </div>

      {/* Mapped PLOs */}
      <SectionCard icon={ListChecks} title="Mapped PLOs">
        {plosLoading ? (
          <Shimmer className="h-20" />
        ) : mappedPLOs.length === 0 ? (
          <p className="text-sm text-slate-400">
            This CLO is not mapped to any PLOs yet.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {mappedPLOs.map((plo) => (
              <li
                key={plo.mapping_id}
                className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <OutcomeTypeBadge type="PLO" />
                  <span className="text-sm font-medium truncate">
                    {resolveName(plo.title)}
                  </span>
                </div>
                <span className="text-xs font-semibold text-slate-500 shrink-0">
                  Weight {Math.round(plo.weight * 100)}%
                </span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      {/* Linked assignments */}
      <SectionCard icon={ClipboardList} title="Linked Assignments">
        {assignmentsLoading ? (
          <Shimmer className="h-20" />
        ) : assignments.length === 0 ? (
          <p className="text-sm text-slate-400">
            No assignments assess this CLO yet.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {assignments.map((assignment) => (
              <li
                key={assignment.id}
                className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {assignment.title}
                  </p>
                  <p className="text-xs text-slate-500">
                    Due {format(new Date(assignment.due_date), "PP")}
                  </p>
                </div>
                <span className="text-xs font-semibold text-slate-500 shrink-0">
                  Weight {Math.round(assignment.weight * 100)}%
                </span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
};

export default CLODetailPage;

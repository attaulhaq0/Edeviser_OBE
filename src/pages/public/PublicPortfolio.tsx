// =============================================================================
// PublicPortfolio — Unauthenticated, read-only portfolio view
// Shows only non-sensitive data: badges, CLO attainment levels, XP total, level
// Route: /portfolio/:student_id
// =============================================================================

import { useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { usePublicPortfolio } from "@/hooks/usePortfolio";
import GradientCardHeader from "@/components/shared/GradientCardHeader";
import {
  InlineNoAttainmentData,
  InlineNoBadges,
} from "@/components/shared/EmptyState";
import { Award, BookOpen, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import type { AttainmentLevel } from "@/types/app";

const ATTAINMENT_STYLES: Record<AttainmentLevel, string> = {
  Excellent: "text-green-600 bg-green-50",
  Satisfactory: "text-blue-600 bg-blue-50",
  Developing: "text-yellow-600 bg-yellow-50",
  Not_Yet: "text-red-600 bg-red-50",
};

const PublicPortfolio = () => {
  const { student_id } = useParams<{ student_id: string }>();
  const { data, isLoading } = usePublicPortfolio(student_id);

  if (!student_id) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="bg-white border-0 shadow-md rounded-xl p-8 text-center max-w-md">
          <ShieldCheck className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-gray-700">
            Portfolio Not Available
          </h2>
          <p className="text-sm text-gray-500 mt-2">No student ID provided.</p>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="h-8 w-48 rounded-lg animate-shimmer" />
          <div className="h-64 rounded-xl animate-shimmer" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="bg-white border-0 shadow-md rounded-xl p-8 text-center max-w-md">
          <ShieldCheck className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-gray-700">
            Portfolio Not Available
          </h2>
          <p className="text-sm text-gray-500 mt-2">
            This portfolio is either private or does not exist.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Hero */}
        <Card
          className="border-0 shadow-lg rounded-xl overflow-hidden text-white"
          style={{
            background:
              "linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #312e81 100%)",
          }}
        >
          <div className="p-6">
            <h1 className="text-2xl font-bold tracking-tight">
              {data.full_name}
            </h1>
            <p className="text-sm text-white/70 mt-1">
              Student Learning Portfolio
            </p>
            <div className="flex gap-6 mt-4">
              <div>
                <p className="text-[10px] font-black tracking-widest uppercase text-white/50">
                  Total XP
                </p>
                <p className="text-xl font-black text-amber-400">
                  {data.totalXP.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-black tracking-widest uppercase text-white/50">
                  Level
                </p>
                <p className="text-xl font-black">{data.level}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* CLO Attainment Levels */}
        <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden gap-0 py-0">
          <GradientCardHeader icon={BookOpen} title="CLO Attainment" />
          <div className="p-6">
            {data.clos.length === 0 ? (
              <InlineNoAttainmentData />
            ) : (
              <div className="space-y-2">
                {data.clos.map((clo, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg border border-slate-100 p-3"
                  >
                    <span className="text-sm font-medium text-gray-800 truncate">
                      {clo.clo_title}
                    </span>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold shrink-0",
                        ATTAINMENT_STYLES[clo.attainment_level]
                      )}
                    >
                      {clo.attainment_level.replace("_", " ")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Badge Collection */}
        <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden gap-0 py-0">
          <GradientCardHeader icon={Award} title="Badges" />
          <div className="p-6">
            {data.badges.length === 0 ? (
              <InlineNoBadges />
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                {data.badges.map((b) => (
                  <Card
                    key={b.badge_key}
                    className="bg-white border-0 shadow-md rounded-xl p-4 flex flex-col items-center text-center gap-2 border-s-4 border-s-amber-400"
                  >
                    <span className="text-3xl" aria-hidden="true">
                      {b.emoji}
                    </span>
                    <span className="text-xs font-bold tracking-wide">
                      {b.badge_name}
                    </span>
                    <span className="text-[10px] text-gray-500">
                      {format(new Date(b.awarded_at), "MMM d, yyyy")}
                    </span>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </Card>

        <p className="text-center text-xs text-gray-400">Powered by Edeviser</p>
      </div>
    </div>
  );
};

export default PublicPortfolio;

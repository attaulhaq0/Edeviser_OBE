// =============================================================================
// PublicPortfolio — Unauthenticated, read-only portfolio view
// Route: /portfolio/:student_id
//
// Task 24.2: Enforce 403/404 on the public portfolio route (R24.3 / 24.3a / 24.4).
//
// Access control is decided at the DATA LAYER: `usePortfolioAccess` calls the
// `portfolio_public_access` SECURITY DEFINER RPC, which returns an authorization
// discriminator (`authorized | forbidden | not_found`) WITHOUT leaking any
// portfolio content. `mapPortfolioAccessToRoute` translates that discriminator
// into the route outcome:
//   - authorized → render the portfolio
//   - forbidden  → 403 (exists but not authorized — never collapsed into a 404)
//   - not_found  → 404 (no such portfolio)
//
// The portfolio content query (`usePublicPortfolio`) is gated so it only runs
// once the request is authorized, and it ALWAYS runs under RLS regardless — so
// unauthorized content can never be returned even if the client misbehaves.
// =============================================================================

import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { usePortfolioAccess, usePublicPortfolio } from "@/hooks/usePortfolio";
import {
  mapPortfolioAccessToRoute,
  type PortfolioAccessStatus,
} from "@/lib/portfolioAccess";
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

interface PortfolioNoticeProps {
  title: string;
  body: string;
  /** Optional HTTP-style status code to surface (e.g. 403, 404). */
  status?: 403 | 404;
}

/**
 * Centered, content-free notice panel used for the missing-id / 403 / 404
 * states. Never renders any protected portfolio content.
 */
const PortfolioNotice = ({ title, body, status }: PortfolioNoticeProps) => {
  const { t } = useTranslation("student");
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <Card className="bg-white border-0 shadow-md rounded-xl p-8 text-center max-w-md">
        <ShieldCheck className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <h2 className="text-lg font-bold text-gray-700">{title}</h2>
        <p className="text-sm text-gray-500 mt-2">{body}</p>
        {status !== undefined && (
          <p className="text-xs font-black tracking-widest uppercase text-gray-300 mt-4">
            {t("publicPortfolio.error.code", { status })}
          </p>
        )}
      </Card>
    </div>
  );
};

const PortfolioShimmer = () => (
  <div className="min-h-screen bg-slate-50 p-6">
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="h-8 w-48 rounded-lg animate-shimmer" />
      <div className="h-64 rounded-xl animate-shimmer" />
    </div>
  </div>
);

const PublicPortfolio = () => {
  const { t } = useTranslation("student");
  const { student_id } = useParams<{ student_id: string }>();

  // Data-layer access discriminator (403 vs 404 without leaking content).
  const {
    data: accessStatus,
    isLoading: isAccessLoading,
    isError: isAccessError,
  } = usePortfolioAccess(student_id);

  // Conservatively treat an unresolved/failed discriminator as `forbidden`
  // (→ 403, never renders) so a malformed or failed response can never expose
  // protected content. Mirrors `parsePortfolioAccessStatus`.
  const status: PortfolioAccessStatus = isAccessError
    ? "forbidden"
    : accessStatus ?? "forbidden";
  const outcome = mapPortfolioAccessToRoute(status);

  // Content query is gated on authorization; it still runs under RLS regardless.
  const { data, isLoading: isContentLoading } = usePublicPortfolio(student_id, {
    enabled: outcome.kind === "render",
  });

  // No id in the URL: nothing to resolve.
  if (!student_id) {
    return (
      <PortfolioNotice
        title={t("publicPortfolio.error.missingIdTitle")}
        body={t("publicPortfolio.error.missingIdBody")}
      />
    );
  }

  // Resolving the access discriminator.
  if (isAccessLoading) {
    return <PortfolioShimmer />;
  }

  // 403 Forbidden — the portfolio exists but is not authorized for public view.
  if (outcome.kind === "error" && outcome.status === 403) {
    return (
      <PortfolioNotice
        title={t("publicPortfolio.error.forbiddenTitle")}
        body={t("publicPortfolio.error.forbiddenBody")}
        status={403}
      />
    );
  }

  // 404 Not Found — no portfolio exists for this id.
  if (outcome.kind === "error" && outcome.status === 404) {
    return (
      <PortfolioNotice
        title={t("publicPortfolio.error.notFoundTitle")}
        body={t("publicPortfolio.error.notFoundBody")}
        status={404}
      />
    );
  }

  // Authorized: render the portfolio content (loaded under RLS).
  if (isContentLoading) {
    return <PortfolioShimmer />;
  }

  // Defense-in-depth: authorized but RLS returned no content — deny rather than
  // render an empty shell.
  if (!data) {
    return (
      <PortfolioNotice
        title={t("publicPortfolio.error.forbiddenTitle")}
        body={t("publicPortfolio.error.forbiddenBody")}
        status={403}
      />
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
              {t("publicPortfolio.subtitle")}
            </p>
            <div className="flex gap-6 mt-4">
              <div>
                <p className="text-[10px] font-black tracking-widest uppercase text-white/50">
                  {t("publicPortfolio.totalXP")}
                </p>
                <p className="text-xl font-black text-amber-400">
                  {data.totalXP.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-black tracking-widest uppercase text-white/50">
                  {t("publicPortfolio.level")}
                </p>
                <p className="text-xl font-black">{data.level}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* CLO Attainment Levels */}
        <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden gap-0 py-0">
          <GradientCardHeader
            icon={BookOpen}
            title={t("publicPortfolio.sections.cloAttainment")}
          />
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
          <GradientCardHeader
            icon={Award}
            title={t("publicPortfolio.sections.badges")}
          />
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

        <p className="text-center text-xs text-gray-400">
          {t("publicPortfolio.poweredBy")}
        </p>
      </div>
    </div>
  );
};

export default PublicPortfolio;

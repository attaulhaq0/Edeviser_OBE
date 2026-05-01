// =============================================================================
// ReflectionDigestCard — Monthly reflection digest with themes, growth,
// emotional trends, suggested focus, and sharing controls
// =============================================================================

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import GradientCardHeader from "@/components/shared/GradientCardHeader";
import { cn } from "@/lib/utils";
import {
  Brain,
  TrendingUp,
  Heart,
  Target,
  Share2,
  X,
  Loader2,
} from "lucide-react";
import type { ReflectionDigest } from "@/types/planner";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ReflectionDigestCardProps {
  digest: ReflectionDigest;
  onShare?: (digestId: string, role: "parent" | "advisor" | "teacher") => void;
  onRevokeShare?: (
    digestId: string,
    role: "parent" | "advisor" | "teacher"
  ) => void;
  isSharing?: boolean;
  className?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

const ReflectionDigestCard = ({
  digest,
  onShare,
  onRevokeShare,
  isSharing = false,
  className,
}: ReflectionDigestCardProps) => {
  const [showShareOptions, setShowShareOptions] = useState(false);

  const sharedRoles = new Set(digest.sharedWith.map((s) => s.role));

  const shareRoles: Array<"parent" | "advisor" | "teacher"> = [
    "parent",
    "advisor",
    "teacher",
  ];

  return (
    <Card
      className={cn(
        "bg-white border-0 shadow-md rounded-xl overflow-hidden",
        className
      )}
      data-testid="reflection-digest-card"
    >
      <GradientCardHeader
        icon={Brain}
        title={`Monthly Insights — ${digest.month}`}
      />

      <div className="p-6 space-y-5">
        {/* Themes */}
        {digest.themes.length > 0 && (
          <section>
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5 mb-2">
              <Brain className="h-4 w-4 text-purple-500" />
              Key Themes
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {digest.themes.map((theme, i) => (
                <Badge
                  key={i}
                  variant="secondary"
                  className="text-xs bg-purple-50 text-purple-700 border-purple-200"
                >
                  {theme.topic} ({theme.count})
                </Badge>
              ))}
            </div>
          </section>
        )}

        {/* Growth Patterns */}
        {digest.growthPatterns.length > 0 && (
          <section>
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5 mb-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Growth Patterns
            </h3>
            <ul className="space-y-1">
              {digest.growthPatterns.map((p, i) => (
                <li key={i} className="text-xs text-gray-600">
                  <span className="font-medium text-gray-700">{p.area}:</span>{" "}
                  {p.description}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Emotional Trends */}
        {digest.emotionalTrends.length > 0 && (
          <section>
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5 mb-2">
              <Heart className="h-4 w-4 text-red-400" />
              Emotional Trends
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {digest.emotionalTrends.map((t, i) => (
                <Badge
                  key={i}
                  variant="outline"
                  className="text-xs border-red-200 text-red-600"
                >
                  {t.label}
                </Badge>
              ))}
            </div>
          </section>
        )}

        {/* Suggested Focus */}
        {digest.suggestedFocus.length > 0 && (
          <section>
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5 mb-2">
              <Target className="h-4 w-4 text-blue-500" />
              Suggested Focus
            </h3>
            <ul className="space-y-1">
              {digest.suggestedFocus.map((f, i) => (
                <li key={i} className="text-xs text-gray-600">
                  <span className="font-medium text-gray-700">{f.area}:</span>{" "}
                  {f.reason}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Share Controls */}
        <div className="pt-2 border-t border-gray-100">
          {!showShareOptions ? (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => setShowShareOptions(true)}
              data-testid="share-digest-button"
            >
              <Share2 className="h-3.5 w-3.5" />
              Share Insights
            </Button>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-gray-500">Share with:</p>
              <div className="flex flex-wrap gap-2">
                {shareRoles.map((role) => {
                  const isShared = sharedRoles.has(role);
                  return (
                    <Button
                      key={role}
                      variant={isShared ? "default" : "outline"}
                      size="sm"
                      className={cn(
                        "gap-1 text-xs capitalize",
                        isShared && "bg-blue-600 hover:bg-blue-700 text-white"
                      )}
                      onClick={() => {
                        if (isShared) {
                          onRevokeShare?.(digest.id, role);
                        } else {
                          onShare?.(digest.id, role);
                        }
                      }}
                      disabled={isSharing}
                      data-testid={`share-${role}-button`}
                    >
                      {isSharing ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : isShared ? (
                        <X className="h-3 w-3" />
                      ) : null}
                      {role}
                      {isShared && " (shared)"}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default ReflectionDigestCard;
export type { ReflectionDigestCardProps };

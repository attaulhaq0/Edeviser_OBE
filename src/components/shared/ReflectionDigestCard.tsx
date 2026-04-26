import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Share2, X, TrendingUp, Heart, Target } from 'lucide-react';
import type { ReflectionDigest } from '@/types/planner';

export interface ReflectionDigestCardProps {
  digest: ReflectionDigest;
  onShare: (target: 'parent' | 'advisor') => void;
  onRevoke: (target: 'parent' | 'advisor') => void;
}

const ReflectionDigestCard = ({
  digest,
  onShare,
  onRevoke,
}: ReflectionDigestCardProps) => {
  const monthLabel = new Date(digest.month).toLocaleDateString([], {
    month: 'long',
    year: 'numeric',
  });

  const isSharedWithParent = digest.sharedWith.some((s) => s.role === 'parent');
  const isSharedWithAdvisor = digest.sharedWith.some((s) => s.role === 'advisor');

  return (
    <Card
      className="bg-white border-0 shadow-md rounded-xl overflow-hidden"
      data-testid="reflection-digest-card"
    >
      <div
        className="px-6 py-4 flex items-center justify-between"
        style={{
          background: 'linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)',
        }}
      >
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-white" />
          <h2 className="text-lg font-bold tracking-tight text-white">
            Monthly Insights — {monthLabel}
          </h2>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* Themes */}
        {digest.themes.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
              <Target className="h-4 w-4 text-blue-500" /> Recurring Themes
            </h3>
            <div className="flex flex-wrap gap-2">
              {digest.themes.map((t, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-700 border border-blue-200"
                >
                  {t.topic}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Growth Patterns */}
        {digest.growthPatterns.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-green-500" /> Growth Patterns
            </h3>
            <ul className="space-y-1">
              {digest.growthPatterns.map((p, i) => (
                <li key={i} className="text-xs text-gray-600">
                  <span className="font-medium">{p.area}:</span> {p.description}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Emotional Trends */}
        {digest.emotionalTrends.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
              <Heart className="h-4 w-4 text-red-400" /> Emotional Trends
            </h3>
            <ul className="space-y-1">
              {digest.emotionalTrends.map((t, i) => (
                <li key={i} className="text-xs text-gray-600">
                  {t.label}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Suggested Focus */}
        {digest.suggestedFocus.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-amber-500" /> Suggested Focus
            </h3>
            <ul className="space-y-1">
              {digest.suggestedFocus.map((f, i) => (
                <li key={i} className="text-xs text-gray-600">
                  <span className="font-medium">{f.area}:</span> {f.reason}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Sharing */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
          <Share2 className="h-4 w-4 text-gray-400" />
          <span className="text-xs text-gray-500 font-medium">Share with:</span>

          {isSharedWithParent ? (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs text-red-500 border-red-200 hover:bg-red-50"
              onClick={() => onRevoke('parent')}
            >
              <X className="h-3 w-3" /> Revoke Parent
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => onShare('parent')}
            >
              Parent
            </Button>
          )}

          {isSharedWithAdvisor ? (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs text-red-500 border-red-200 hover:bg-red-50"
              onClick={() => onRevoke('advisor')}
            >
              <X className="h-3 w-3" /> Revoke Advisor
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => onShare('advisor')}
            >
              Advisor
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};

export default ReflectionDigestCard;

// =============================================================================
// KnowledgeQuestsTab — Quest listing with countdown timers and progress
// Task 21.1
// =============================================================================

import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Clock, Trophy, BookOpen } from 'lucide-react';
import { useKnowledgeQuests, useStartQuest } from '@/hooks/useKnowledgeQuests';
import { useAuth } from '@/hooks/useAuth';

const QUEST_TYPE_ICONS = {
  quiz_challenge: BookOpen,
  content_creation: Trophy,
  peer_review: BookOpen,
} as const;

const KnowledgeQuestsTab = () => {
  const { profile } = useAuth();
  const { data: quests, isLoading } = useKnowledgeQuests('active');
  const startQuest = useStartQuest();

  const sortedQuests = useMemo(() => {
    if (!quests) return [];
    return [...quests].sort(
      (a, b) => new Date(a.end_date).getTime() - new Date(b.end_date).getTime(),
    );
  }, [quests]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
      </div>
    );
  }

  if (sortedQuests.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Trophy className="h-12 w-12 mx-auto mb-3 text-gray-300" />
        <p className="text-sm font-medium">No active quests right now</p>
        <p className="text-xs mt-1">Check back later for new knowledge quests!</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {sortedQuests.map((quest) => {
        const Icon = QUEST_TYPE_ICONS[quest.quest_type] ?? BookOpen;
        const endDate = new Date(quest.end_date);
        const now = new Date();
        const hoursRemaining = Math.max(0, Math.floor((endDate.getTime() - now.getTime()) / (1000 * 60 * 60)));
        const daysRemaining = Math.floor(hoursRemaining / 24);

        return (
          <Card key={quest.id} className="bg-white border-0 shadow-md rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-purple-50">
                <Icon className="h-5 w-5 text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold truncate">{quest.title}</h3>
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                  {quest.description}
                </p>

                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <Badge variant="outline" className="text-[10px] capitalize">
                    {quest.quest_type.replace('_', ' ')}
                  </Badge>
                  <div className="flex items-center gap-1 text-[10px] text-gray-400">
                    <Clock className="h-3 w-3" />
                    {daysRemaining > 0
                      ? `${daysRemaining}d ${hoursRemaining % 24}h left`
                      : `${hoursRemaining}h left`}
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs font-bold text-amber-600">
                    {quest.reward_type === 'xp'
                      ? `+${quest.reward_xp_amount} XP`
                      : 'Exclusive Item'}
                  </span>
                  <Button
                    size="sm"
                    className="bg-gradient-to-r from-teal-500 to-blue-600 text-white active:scale-95 text-xs"
                    disabled={startQuest.isPending}
                    onClick={() =>
                      profile?.id &&
                      startQuest.mutate({ questId: quest.id, studentId: profile.id })
                    }
                  >
                    {startQuest.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                    Start Quest
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};

export default KnowledgeQuestsTab;

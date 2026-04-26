/**
 * Task 21.1: Knowledge Quests Tab — Quest listing with countdown timers and progress
 */
import { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import {
  useKnowledgeQuests,
  useQuestProgress,
  useStartQuest,
  type KnowledgeQuest,
} from '@/hooks/useKnowledgeQuests';
import { Compass, Clock, Zap, Gift, Loader2 } from 'lucide-react';
import GradientCardHeader from '@/components/shared/GradientCardHeader';

const formatTimeRemaining = (endDate: string): string => {
  const diff = new Date(endDate).getTime() - Date.now();
  if (diff <= 0) return 'Expired';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (days > 0) return `${days}d ${hours}h remaining`;
  if (hours > 0) return `${hours}h ${minutes}m remaining`;
  return `${minutes}m remaining`;
};

const QUEST_TYPE_LABELS: Record<string, string> = {
  quiz_challenge: 'Quiz Challenge',
  content_creation: 'Content Creation',
  peer_review: 'Peer Review',
};

interface QuestCardProps {
  quest: KnowledgeQuest;
  studentId: string;
}

const QuestCard = ({ quest, studentId }: QuestCardProps) => {
  const { data: progress } = useQuestProgress(quest.id, studentId);
  const startQuest = useStartQuest();
  const [timeLabel, setTimeLabel] = useState(() => formatTimeRemaining(quest.end_date));
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLabel(formatTimeRemaining(quest.end_date));
      setNow(Date.now());
    }, 60_000);
    return () => clearInterval(interval);
  }, [quest.end_date]);

  const isExpired = useMemo(() => new Date(quest.end_date).getTime() <= now, [quest.end_date, now]);
  const isCompleted = progress?.status === 'completed';
  const isInProgress = progress?.status === 'in_progress';

  const handleStart = () => {
    startQuest.mutate({ questId: quest.id, studentId });
  };

  return (
    <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold tracking-tight truncate">{quest.title}</h3>
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{quest.description}</p>
          </div>
          <Badge variant="outline" className="text-xs shrink-0 capitalize">
            {QUEST_TYPE_LABELS[quest.quest_type] ?? quest.quest_type}
          </Badge>
        </div>

        {/* Countdown */}
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <Clock className="h-3.5 w-3.5" />
          <span>{isExpired ? 'Expired' : timeLabel}</span>
        </div>

        {/* Reward preview */}
        <div className="flex items-center gap-1.5 text-xs">
          {quest.reward_type === 'xp' ? (
            <>
              <Zap className="h-3.5 w-3.5 text-amber-500" />
              <span className="font-medium text-amber-600">{quest.reward_xp_amount} XP</span>
            </>
          ) : (
            <>
              <Gift className="h-3.5 w-3.5 text-purple-500" />
              <span className="font-medium text-purple-600">Exclusive Item</span>
            </>
          )}
        </div>

        {/* Progress */}
        {isInProgress && (
          <div className="space-y-1">
            <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full" style={{ width: '50%' }} />
            </div>
            <p className="text-[10px] text-gray-400 font-medium">In Progress</p>
          </div>
        )}

        {isCompleted && (
          <Badge className="bg-green-100 text-green-700 text-xs">Completed</Badge>
        )}

        {/* Action */}
        {!progress && !isExpired && (
          <Button
            size="sm"
            onClick={handleStart}
            disabled={startQuest.isPending}
            className="w-full bg-gradient-to-r from-teal-500 to-blue-600 text-white active:scale-95 text-xs"
          >
            {startQuest.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Start Quest
          </Button>
        )}
      </div>
    </Card>
  );
};

const KnowledgeQuestsTab = () => {
  const { user } = useAuth();
  const studentId = user?.id ?? '';
  const { data: quests, isLoading } = useKnowledgeQuests('active');

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-48 rounded-xl animate-shimmer" />
        ))}
      </div>
    );
  }

  if (!quests || quests.length === 0) {
    return (
      <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
        <GradientCardHeader icon={Compass} title="Knowledge Quests" />
        <div className="p-12 text-center">
          <Compass className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No active quests available right now.</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {quests.map((quest) => (
          <QuestCard key={quest.id} quest={quest} studentId={studentId} />
        ))}
      </div>
    </div>
  );
};

export default KnowledgeQuestsTab;

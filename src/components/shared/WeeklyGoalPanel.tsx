import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Target, Pencil, Check, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WeeklyGoal, GoalProgress, GoalType } from '@/types/planner';

interface WeeklyGoalPanelProps {
  goals: WeeklyGoal[];
  progress: GoalProgress[];
  onSave?: (goals: Array<{ goalType: GoalType; targetValue: number }>) => void;
  isEditable?: boolean;
}

const goalTypeLabels: Record<GoalType, string> = {
  study_hours: 'Study Hours',
  sessions_completed: 'Sessions',
  tasks_completed: 'Tasks',
};

const goalTypeUnits: Record<GoalType, string> = {
  study_hours: 'hours',
  sessions_completed: 'sessions',
  tasks_completed: 'tasks',
};

interface GoalDraft {
  goalType: GoalType;
  targetValue: number;
}

const WeeklyGoalPanel = ({
  goals,
  progress,
  onSave,
  isEditable = true,
}: WeeklyGoalPanelProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [drafts, setDrafts] = useState<GoalDraft[]>(
    goals.map((g) => ({ goalType: g.goalType, targetValue: g.targetValue })),
  );

  const handleEdit = () => {
    setDrafts(
      goals.length > 0
        ? goals.map((g) => ({ goalType: g.goalType, targetValue: g.targetValue }))
        : [{ goalType: 'study_hours', targetValue: 5 }],
    );
    setIsEditing(true);
  };

  const handleSave = () => {
    const validDrafts = drafts.filter((d) => d.targetValue > 0);
    onSave?.(validDrafts);
    setIsEditing(false);
  };

  const addGoal = () => {
    if (drafts.length >= 3) return;
    const usedTypes = new Set(drafts.map((d) => d.goalType));
    const available: GoalType[] = (['study_hours', 'sessions_completed', 'tasks_completed'] as GoalType[]).filter(
      (t) => !usedTypes.has(t),
    );
    if (available.length === 0) return;
    setDrafts([...drafts, { goalType: available[0]!, targetValue: 1 }]);
  };

  const removeGoal = (index: number) => {
    setDrafts(drafts.filter((_, i) => i !== index));
  };

  const updateDraft = (index: number, field: keyof GoalDraft, value: GoalType | number) => {
    setDrafts(drafts.map((d, i) => (i === index ? { ...d, [field]: value } : d)));
  };

  if (goals.length === 0 && !isEditing) {
    return (
      <Card className="bg-white border-0 shadow-md rounded-xl p-4">
        <div className="text-center space-y-2">
          <Target className="h-8 w-8 text-gray-300 mx-auto" />
          <p className="text-sm text-gray-500">No goals set for this week</p>
          {isEditable && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleEdit}
            >
              <Plus className="h-4 w-4" /> Set Goals
            </Button>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ background: 'linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)' }}
      >
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-white" />
          <h3 className="text-sm font-bold text-white">Weekly Goals</h3>
        </div>
        {isEditable && !isEditing && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs text-white hover:bg-white/20"
            onClick={handleEdit}
          >
            <Pencil className="h-3.5 w-3.5" /> Edit
          </Button>
        )}
        {isEditing && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs text-white hover:bg-white/20"
            onClick={handleSave}
          >
            <Check className="h-3.5 w-3.5" /> Save
          </Button>
        )}
      </div>

      <div className="p-4 space-y-3">
        {isEditing ? (
          <>
            {drafts.map((draft, i) => (
              <div key={i} className="flex items-center gap-2">
                <Select
                  value={draft.goalType}
                  onValueChange={(v) => updateDraft(i, 'goalType', v as GoalType)}
                >
                  <SelectTrigger className="bg-white flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="study_hours">Study Hours</SelectItem>
                    <SelectItem value="sessions_completed">Sessions</SelectItem>
                    <SelectItem value="tasks_completed">Tasks</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min={1}
                  value={draft.targetValue}
                  onChange={(e) => updateDraft(i, 'targetValue', Number(e.target.value))}
                  className="w-20"
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-red-500"
                  onClick={() => removeGoal(i)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            {drafts.length < 3 && (
              <Button size="sm" variant="outline" onClick={addGoal} className="w-full">
                <Plus className="h-3.5 w-3.5" /> Add Goal
              </Button>
            )}
          </>
        ) : (
          progress.map((p) => (
            <div key={p.goal.id} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{goalTypeLabels[p.goal.goalType]}</span>
                <span className={cn('text-xs font-semibold', p.isMet ? 'text-green-600' : 'text-gray-500')}>
                  {p.currentValue} / {p.goal.targetValue} {goalTypeUnits[p.goal.goalType]}
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-500',
                    p.isMet ? 'bg-green-500' : 'bg-blue-500',
                  )}
                  style={{ width: `${Math.min(p.percentage, 100)}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
};

export default WeeklyGoalPanel;

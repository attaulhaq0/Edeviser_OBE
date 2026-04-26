import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BookOpen, Clock, CalendarDays, Check, Pencil, X, FileText } from 'lucide-react';
import type { LearningPlanUpdate } from '@/lib/tutorSchemas';

interface LearningPlanCardProps {
  planUpdate: LearningPlanUpdate;
  onAccept: (planUpdateId: string) => void;
  onModify: (planUpdateId: string, modifications: string) => void;
  onDismiss: (planUpdateId: string) => void;
}

const LearningPlanCard = ({ planUpdate, onAccept, onModify, onDismiss }: LearningPlanCardProps) => {
  const [isModifying, setIsModifying] = useState(false);
  const [modifications, setModifications] = useState('');

  const handleModifySubmit = () => {
    if (modifications.trim()) {
      onModify(planUpdate.id, modifications.trim());
      setIsModifying(false);
    }
  };

  return (
    <Card
      className="border-0 shadow-md rounded-xl overflow-hidden my-3"
      style={{
        background: 'linear-gradient(135deg, rgba(20, 184, 166, 0.05) 0%, rgba(3, 130, 189, 0.05) 100%)',
        borderLeft: '4px solid',
        borderImage: 'linear-gradient(180deg, #14B8A6, #0382BD) 1',
      }}
    >
      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center gap-2">
          <div
            className="p-1.5 rounded-lg"
            style={{ background: 'linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)' }}
          >
            <BookOpen className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">Learning Plan Update</p>
            <p className="text-xs text-gray-500">{planUpdate.clo_title}</p>
          </div>
        </div>

        {/* Recommendations */}
        <div className="space-y-2">
          {/* Study Time */}
          <div className="flex items-start gap-2">
            <Clock className="h-4 w-4 text-teal-600 mt-0.5 shrink-0" />
            <p className="text-sm text-gray-700">{planUpdate.study_time_recommendation}</p>
          </div>

          {/* Recommended Materials */}
          {planUpdate.recommended_materials.length > 0 && (
            <div className="flex items-start gap-2">
              <FileText className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Recommended Materials
                </p>
                {planUpdate.recommended_materials.map((mat, idx) => (
                  <p key={idx} className="text-sm text-gray-700">
                    {mat.source_filename}
                    {mat.section_title && (
                      <span className="text-gray-400"> — {mat.section_title}</span>
                    )}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Planner Sessions */}
          <div className="flex items-start gap-2">
            <CalendarDays className="h-4 w-4 text-indigo-600 mt-0.5 shrink-0" />
            <p className="text-sm text-gray-700">
              Suggested: {planUpdate.suggested_planner_sessions} study session{planUpdate.suggested_planner_sessions !== 1 ? 's' : ''} per week
            </p>
          </div>
        </div>

        {/* Modify Input */}
        {isModifying && (
          <div className="space-y-2">
            <Input
              placeholder="Describe your modifications..."
              value={modifications}
              onChange={(e) => setModifications(e.target.value)}
              className="text-sm"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleModifySubmit}
                disabled={!modifications.trim()}
                className="bg-gradient-to-r from-teal-500 to-blue-600 text-white text-xs font-semibold active:scale-95"
              >
                Submit Changes
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsModifying(false)}
                className="text-xs"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {!isModifying && (
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              onClick={() => onAccept(planUpdate.id)}
              className="bg-gradient-to-r from-teal-500 to-blue-600 text-white text-xs font-semibold active:scale-95"
            >
              <Check className="h-3.5 w-3.5" />
              Accept
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsModifying(true)}
              className="text-xs font-semibold text-gray-600 border-gray-200"
            >
              <Pencil className="h-3.5 w-3.5" />
              Modify
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDismiss(planUpdate.id)}
              className="text-xs font-semibold text-gray-400 hover:text-gray-600"
            >
              <X className="h-3.5 w-3.5" />
              Dismiss
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};

export default LearningPlanCard;

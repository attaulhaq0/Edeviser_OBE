// =============================================================================
// TeacherChallengeListPage — Teacher's challenge management list
// Task 6.3: create/edit actions, status badges, course filter
// =============================================================================

import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { parseAsString, useQueryState } from "nuqs";
import { useAuth } from "@/hooks/useAuth";
import { useCourses } from "@/hooks/useCourses";
import {
  useChallenges,
  useCancelChallenge,
  type SocialChallenge,
} from "@/hooks/useChallenges";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Shimmer from "@/components/shared/Shimmer";
import EmptyState from "@/components/shared/EmptyState";
import { Plus, Search, Trophy, Pencil, XCircle, Calendar } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 border-gray-200",
  active: "bg-green-50 text-green-700 border-green-200",
  ended: "bg-blue-50 text-blue-700 border-blue-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
};

const TeacherChallengeListPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: paginatedCourses } = useCourses();
  const cancelMutation = useCancelChallenge();

  const teacherCourses = useMemo(
    () =>
      (paginatedCourses?.data ?? []).filter((c) => c.teacher_id === user?.id),
    [paginatedCourses, user?.id]
  );

  const [selectedCourseId, setSelectedCourseId] = useQueryState(
    "courseId",
    parseAsString.withDefault("")
  );
  const [search, setSearch] = useQueryState("q", parseAsString.withDefault(""));

  const effectiveCourseId = selectedCourseId || teacherCourses[0]?.id || "";
  const { data: challenges, isLoading } = useChallenges(
    effectiveCourseId || undefined
  );

  const filteredChallenges = useMemo(() => {
    let result = challenges ?? [];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((c) => c.title.toLowerCase().includes(q));
    }
    return result;
  }, [challenges, search]);

  const handleCancel = (challenge: SocialChallenge) => {
    cancelMutation.mutate(challenge.id, {
      onSuccess: () => toast.success("Challenge cancelled"),
      onError: (err: Error) => toast.error(err.message),
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-amber-500" />
          <h1 className="text-2xl font-bold tracking-tight">Challenges</h1>
        </div>
        <Button
          onClick={() => navigate("/teacher/challenges/new")}
          className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95"
        >
          <Plus className="h-4 w-4" /> New Challenge
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <Select value={effectiveCourseId} onValueChange={setSelectedCourseId}>
          <SelectTrigger className="w-64 bg-white">
            <SelectValue placeholder="Select course" />
          </SelectTrigger>
          <SelectContent>
            {teacherCourses.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative flex-1 max-w-sm">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search challenges..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-9"
          />
        </div>
      </div>

      {/* Challenges List */}
      <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
        <div
          className="px-6 py-4 flex items-center gap-2"
          style={{
            background:
              "linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)",
          }}
        >
          <Trophy className="h-5 w-5 text-white" />
          <h2 className="text-lg font-bold tracking-tight text-white">
            All Challenges ({filteredChallenges.length})
          </h2>
        </div>
        <div className="p-6">
          {!effectiveCourseId ? (
            <p className="text-sm text-gray-500 text-center py-6">
              Select a course to view challenges.
            </p>
          ) : isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Shimmer key={i} className="h-20 rounded-lg" />
              ))}
            </div>
          ) : filteredChallenges.length === 0 ? (
            <EmptyState
              icon={<Trophy className="h-8 w-8 text-gray-400" />}
              title="No challenges found"
              description="No challenges match your search. Try a different query or create a new challenge."
            />
          ) : (
            <div className="space-y-2">
              {filteredChallenges.map((challenge) => (
                <div
                  key={challenge.id}
                  className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {challenge.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge
                        className={cn(
                          "text-xs",
                          statusColors[challenge.status]
                        )}
                      >
                        {challenge.status}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {challenge.challenge_type}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {challenge.participation_mode}
                      </Badge>
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(
                          challenge.start_date
                        ).toLocaleDateString()} —{" "}
                        {new Date(challenge.end_date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ms-4">
                    <Badge className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                      +{challenge.reward_xp} XP
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        navigate(`/teacher/challenges/${challenge.id}/edit`)
                      }
                      className="h-8 w-8 p-0"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {challenge.status === "active" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCancel(challenge)}
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default TeacherChallengeListPage;

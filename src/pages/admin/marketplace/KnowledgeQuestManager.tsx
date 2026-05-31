// =============================================================================
// KnowledgeQuestManager — Admin quest CRUD with DataTable
// Task 21.6
// =============================================================================

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Loader2, BookOpen } from "lucide-react";
import {
  useAdminKnowledgeQuests,
  useCreateKnowledgeQuest,
} from "@/hooks/useKnowledgeQuestAdmin";

const KnowledgeQuestManager = () => {
  const { data: quests, isLoading } = useAdminKnowledgeQuests();
  const createQuest = useCreateKnowledgeQuest();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  // Compute defaults inside useState initializer so they are pure on render.
  const [form, setForm] = useState(() => {
    const todayDate = new Date().toISOString().slice(0, 10);
    const oneWeekDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    return {
      title: "",
      description: "",
      quest_type: "quiz_challenge" as
        | "quiz_challenge"
        | "content_creation"
        | "peer_review",
      start_date: todayDate,
      end_date: oneWeekDate,
      reward_xp_amount: 100,
    };
  });

  const filteredQuests = (quests ?? []).filter((q) =>
    (q as Record<string, unknown>).title
      ?.toString()
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) return;
    createQuest.mutate(
      {
        title: form.title,
        description: form.description,
        quest_type: form.quest_type,
        target_clo_ids: [],
        // Convert YYYY-MM-DD to ISO datetime (start of day, end of day UTC)
        start_date: new Date(form.start_date).toISOString(),
        end_date: new Date(form.end_date + "T23:59:59").toISOString(),
        reward_type: "xp",
        reward_item_id: null,
        reward_xp_amount: form.reward_xp_amount,
      },
      {
        onSuccess: () => {
          setDialogOpen(false);
          const todayDate = new Date().toISOString().slice(0, 10);
          const oneWeekDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            .toISOString()
            .slice(0, 10);
          setForm({
            title: "",
            description: "",
            quest_type: "quiz_challenge",
            start_date: todayDate,
            end_date: oneWeekDate,
            reward_xp_amount: 100,
          });
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Knowledge Quests</h1>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95">
              <Plus className="h-4 w-4" /> Create Quest
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>New Knowledge Quest</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="quest-title">Title</Label>
                <Input
                  id="quest-title"
                  value={form.title}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, title: e.target.value }))
                  }
                  required
                  placeholder="e.g., Master the Periodic Table"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="quest-description">Description</Label>
                <Textarea
                  id="quest-description"
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                  required
                  rows={3}
                  placeholder="What students will accomplish"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Quest type</Label>
                <Select
                  value={form.quest_type}
                  onValueChange={(value) =>
                    setForm((f) => ({
                      ...f,
                      quest_type: value as typeof f.quest_type,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quiz_challenge">
                      Quiz Challenge
                    </SelectItem>
                    <SelectItem value="content_creation">
                      Content Creation
                    </SelectItem>
                    <SelectItem value="peer_review">Peer Review</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="quest-start">Starts</Label>
                  <Input
                    id="quest-start"
                    type="date"
                    value={form.start_date}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, start_date: e.target.value }))
                    }
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="quest-end">Ends</Label>
                  <Input
                    id="quest-end"
                    type="date"
                    value={form.end_date}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, end_date: e.target.value }))
                    }
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="quest-xp">Reward XP</Label>
                <Input
                  id="quest-xp"
                  type="number"
                  min={1}
                  value={form.reward_xp_amount}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      reward_xp_amount: Number(e.target.value),
                    }))
                  }
                  required
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createQuest.isPending}
                  className="bg-gradient-to-r from-teal-500 to-blue-600"
                >
                  {createQuest.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin me-2" />
                  )}
                  Create
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search quests..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ps-9"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
        </div>
      ) : filteredQuests.length === 0 ? (
        <Card className="bg-white border-0 shadow-md rounded-xl p-12 text-center">
          <BookOpen className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">
            No knowledge quests yet. Create one to engage students with focused
            learning challenges.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredQuests.map((quest) => {
            const q = quest as Record<string, unknown>;
            const now = new Date();
            const startDate = new Date(q.start_date as string);
            const endDate = new Date(q.end_date as string);
            const isActive = now >= startDate && now <= endDate;
            const isUpcoming = now < startDate;

            return (
              <Card
                key={q.id as string}
                className="bg-white border-0 shadow-md rounded-xl p-4"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-lg bg-purple-50">
                    <BookOpen className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold">{q.title as string}</h3>
                      <Badge
                        className={
                          isActive
                            ? "bg-green-50 text-green-700 border-green-200"
                            : isUpcoming
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : "bg-gray-50 text-gray-700 border-gray-200"
                        }
                      >
                        {isActive
                          ? "Active"
                          : isUpcoming
                          ? "Upcoming"
                          : "Ended"}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 capitalize">
                      {(q.quest_type as string).replace("_", " ")}
                    </p>
                  </div>
                  <div className="text-end">
                    <p className="text-xs text-gray-400">
                      {startDate.toLocaleDateString()} –{" "}
                      {endDate.toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default KnowledgeQuestManager;

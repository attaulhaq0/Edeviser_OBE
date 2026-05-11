// =============================================================================
// KnowledgeQuestManager — Admin quest CRUD with DataTable
// Task 21.6
// =============================================================================

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Loader2, BookOpen } from "lucide-react";
import { useAdminKnowledgeQuests } from "@/hooks/useKnowledgeQuestAdmin";

const KnowledgeQuestManager = () => {
  const { data: quests, isLoading } = useAdminKnowledgeQuests();
  const [search, setSearch] = useState("");

  const filteredQuests = (quests ?? []).filter((q) =>
    (q as Record<string, unknown>).title
      ?.toString()
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Knowledge Quests</h1>
        <Button className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95">
          <Plus className="h-4 w-4" /> Create Quest
        </Button>
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

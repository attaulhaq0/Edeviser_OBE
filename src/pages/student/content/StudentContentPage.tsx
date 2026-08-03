// =============================================================================
// StudentContentPage — Student content creation and listing
// Task 21.2
// =============================================================================

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, FileText } from "lucide-react";
import { useStudentContent } from "@/hooks/useStudentContent";
import { useAuth } from "@/hooks/useAuth";
import ErrorState from "@/components/shared/ErrorState";
import { NoData } from "@/components/shared/EmptyState";
import { PCard, SectionHeader, Shimmer } from "@/design-system";
import ContentForm from "./ContentForm";

const STATUS_COLORS = {
  pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
  approved: "bg-green-50 text-green-700 border-green-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
} as const;

const StudentContentPage = () => {
  const { t } = useTranslation("common");
  const { profile } = useAuth();
  const {
    data: content,
    isLoading,
    isError,
    refetch,
  } = useStudentContent(profile?.id);
  const [showForm, setShowForm] = useState(false);

  const contentCardClass = "p-4";

  return (
    <div className="space-y-6">
      <SectionHeader
        icon={FileText}
        title="My Content"
        description="Create study plans, quiz questions, and explanation drafts."
        action={
          <Button variant="tactile" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" /> Create Content
          </Button>
        }
      />

      {showForm && <ContentForm onClose={() => setShowForm(false)} />}

      <Tabs defaultValue="all">
        <TabsList className="gap-2">
          <TabsTrigger value="all" className="rounded-xl">
            All
          </TabsTrigger>
          <TabsTrigger value="pending" className="rounded-xl">
            Pending
          </TabsTrigger>
          <TabsTrigger value="approved" className="rounded-xl">
            Approved
          </TabsTrigger>
        </TabsList>

        {["all", "pending", "approved"].map((tab) => (
          <TabsContent key={tab} value={tab} className="mt-4">
            {isLoading ? (
              <Shimmer className="h-48 rounded-xl" />
            ) : isError ? (
              <ErrorState
                message={t("errors.generic")}
                onRetry={() => void refetch()}
                retryLabel={t("buttons.retry")}
              />
            ) : (content ?? []).filter(
                (item) => tab === "all" || item.status === tab
              ).length === 0 ? (
              <NoData />
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {(content ?? [])
                  .filter((c) => tab === "all" || c.status === tab)
                  .map((item) => (
                    <PCard key={item.id} className={contentCardClass}>
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-blue-50">
                          <FileText className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold truncate">
                              {item.title}
                            </h3>
                            <Badge
                              className={`text-[10px] ${
                                STATUS_COLORS[item.status]
                              }`}
                            >
                              {item.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5 capitalize">
                            {item.content_type.replace("_", " ")}
                          </p>
                          {item.feedback && (
                            <p className="text-xs text-gray-600 mt-2 italic">
                              Feedback: {item.feedback}
                            </p>
                          )}
                          <p className="text-[10px] text-gray-400 mt-2">
                            {new Date(item.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </PCard>
                  ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default StudentContentPage;

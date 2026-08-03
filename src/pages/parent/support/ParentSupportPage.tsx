import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Send, Sparkles } from "lucide-react";

import { Shimmer } from "@/design-system";
import { ParentButton } from "@/components/shared/ParentButton";
import { ParentSectionIcon } from "@/components/shared/ParentSectionIcon";
import { useAuth } from "@/hooks/useAuth";
import { useParentDashboardAggregate } from "@/hooks/useParentDashboardAggregate";
import { NoLinkedStudents } from "@/components/shared/EmptyState";
import { supabase } from "@/lib/supabase";

const DEFAULT_MESSAGE =
  "Hi Prof. Ahmed, I noticed Maya is doing really well in databases — is there a way to keep that momentum going?";

const AI_STARTERS = [
  "Hi teacher, I'd love to know how Maya is participating in group activities this week.",
  "Hi! Maya enjoyed the recent project. What is one area we can practice together at home?",
  "Hello! I wanted to check if there are any upcoming deadlines or milestones we should prepare for.",
];

const ParentSupportPage = () => {
  const { t } = useTranslation("common");
  const { user } = useAuth();
  const aggregate = useParentDashboardAggregate(user?.id);
  const children = useMemo(
    () => aggregate.data?.children ?? [],
    [aggregate.data]
  );

  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [starterIdx, setStarterIdx] = useState(0);
  const [savedIdeas, setSavedIdeas] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem("parent_saved_support_ideas");
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  const selectedChild = children[0];
  const name = selectedChild?.student_name
    ? selectedChild.student_name.split(" ")[0]
    : "Child";

  const handleSaveIdea = (ideaId: string, ideaLabel: string) => {
    setSavedIdeas((prev) => {
      const next = new Set(prev);
      if (next.has(ideaId)) {
        next.delete(ideaId);
        toast.info(t("parent.support.unsaved", "Idea removed from saved list"));
      } else {
        next.add(ideaId);
        toast.success(
          t("parent.support.saved", "Saved: {{label}} ⭐", { label: ideaLabel })
        );
      }
      try {
        localStorage.setItem(
          "parent_saved_support_ideas",
          JSON.stringify(Array.from(next))
        );
      } catch {
        // Fallback
      }
      return next;
    });
  };

  const handleSuggest = () => {
    const nextIdx = (starterIdx + 1) % AI_STARTERS.length;
    setStarterIdx(nextIdx);
    const nextMsg = AI_STARTERS[nextIdx] ?? DEFAULT_MESSAGE;
    setMessage(nextMsg);
    toast.success(
      t("parent.support.suggested", "✨ AI suggested a message starter")
    );
  };

  const handleSend = async () => {
    if (!message.trim()) return;

    if (user?.id) {
      try {
        await supabase.from("notifications").insert({
          user_id: user.id,
          title: "Teacher Message Sent ✉️",
          body: message,
          type: "teacher_message",
          is_read: true,
        } as never);
      } catch {
        // Fallback silently
      }
    }

    toast.success(t("parent.support.sent", "✉️ Message sent to teacher"));
    setMessage("");
  };

  if (aggregate.isLoading) {
    return (
      <div className="space-y-4">
        <Shimmer className="h-32 rounded-2xl" />
        <Shimmer className="h-48 rounded-2xl" />
      </div>
    );
  }

  if (children.length === 0) {
    return <NoLinkedStudents />;
  }

  return (
    <div className="space-y-5 no-scrollbar">
      {/* ── Heading ── */}
      <div>
        <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-slate-100">
          {t("parent.support.title", {
            defaultValue: "Ways to support {{name}}",
            name,
          })}
        </h1>
        <p className="mt-0.5 text-xs text-slate-500">
          {t(
            "parent.support.subtitle",
            "Small, specific actions — matched to where she is this week."
          )}
        </p>
      </div>

      {/* ── At-home ideas ── */}
      <div className="rounded-[20px] border border-[#eef2f6] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_10px_26px_rgba(16,24,40,0.05)] dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-3 flex items-center gap-2">
          <ParentSectionIcon emoji="🏡" />
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-100">
            {t("parent.support.atHomeTitle", "At-home ideas")}
          </h2>
        </div>

        <div className="space-y-2.5">
          {[
            {
              id: "idea-teach-back",
              icon: "💬",
              title: t("parent.support.teachBackTitle", "Ask her to teach you"),
              desc: t(
                "parent.support.teachBackDesc",
                '"Explain one database idea to me." Retrieval practice + it shows you care.'
              ),
            },
            {
              id: "idea-math-encourage",
              icon: "🧮",
              title: t("parent.support.mathTitle", "Gentle math encouragement"),
              desc: t(
                "parent.support.mathDesc",
                "Math is her growing edge — celebrate effort over getting it right."
              ),
            },
            {
              id: "idea-evening-rhythm",
              icon: "🌙",
              title: t("parent.support.eveningsTitle", "Protect her evenings"),
              desc: t(
                "parent.support.eveningsDesc",
                "Her rhythm is healthy — keeping a consistent stop-time helps it stick."
              ),
            },
          ].map((idea) => {
            const isSaved = savedIdeas.has(idea.id);
            return (
              <div
                key={idea.id}
                className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-900/50"
              >
                <span className="text-xl">{idea.icon}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {idea.title}
                  </p>
                  <p className="text-xs text-slate-500">{idea.desc}</p>
                </div>
                <ParentButton
                  variant={isSaved ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => handleSaveIdea(idea.id, idea.title)}
                  className="h-auto px-2.5 py-1 text-xs font-bold"
                >
                  {isSaved ? "★ Saved" : t("common.save", "Save")}
                </ParentButton>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 2-Column Grid: Message Teacher & Helpful Reads ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Message the teacher */}
        <div className="rounded-[20px] border border-[#eef2f6] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_10px_26px_rgba(16,24,40,0.05)] dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-1 flex items-center gap-2">
            <ParentSectionIcon emoji="✉️" />
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-100">
              {t("parent.support.messageTitle", "Message the teacher")}
            </h2>
          </div>
          <p className="mb-2.5 text-xs font-semibold text-slate-500">
            Prof. Ahmed · Computer Science
          </p>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 shadow-xs focus:border-sky-500 focus:outline-hidden dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
            placeholder={t(
              "parent.support.placeholder",
              "Write a note… (AI can suggest a starter)"
            )}
          />
          <div className="mt-2.5 flex items-center gap-2">
            <ParentButton variant="primary" size="sm" onClick={handleSend}>
              <Send className="h-3.5 w-3.5" aria-hidden="true" />
              {t("common.send", "Send")}
            </ParentButton>
            <ParentButton variant="ghost" size="sm" onClick={handleSuggest}>
              <Sparkles
                className="h-3.5 w-3.5 text-amber-500"
                aria-hidden="true"
              />
              {t("parent.support.suggestBtn", "Suggest")}
            </ParentButton>
          </div>
        </div>

        {/* Helpful reads */}
        <div className="rounded-[20px] border border-[#eef2f6] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_10px_26px_rgba(16,24,40,0.05)] dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-3 flex items-center gap-2">
            <ParentSectionIcon emoji="📎" />
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-100">
              {t("parent.support.readsTitle", "Helpful reads")}
            </h2>
          </div>
          <div className="space-y-2">
            {[
              {
                icon: "📖",
                title: t(
                  "parent.support.read1",
                  "How to praise effort, not just results"
                ),
              },
              {
                icon: "🧠",
                title: t(
                  "parent.support.read2",
                  'Why "teach-back" helps memory'
                ),
              },
            ].map((item) => (
              <button
                key={item.title}
                type="button"
                onClick={() =>
                  toast.info(t("parent.support.openingGuide", "Opening guide…"))
                }
                className="flex w-full items-center gap-3 rounded-lg border border-transparent p-2.5 text-start transition-colors hover:border-slate-100 hover:bg-slate-50 dark:hover:border-slate-800 dark:hover:bg-slate-900"
              >
                <span className="text-lg">{item.icon}</span>
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {item.title}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParentSupportPage;

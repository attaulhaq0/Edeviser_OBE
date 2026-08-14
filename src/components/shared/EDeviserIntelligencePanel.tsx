import { useState } from "react";
import { Bot, LoaderCircle, Send, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  useEDeviserIntelligence,
  useIntelligenceProposalDecision,
  useIntelligenceProposalExecution,
  useProactiveIntelligenceFeed,
} from "@/hooks/useEDeviserIntelligence";
import type { IntelligenceResponse } from "@/lib/edeviserIntelligence";

const mayExecute = (actionType: string): boolean =>
  actionType === "create_goal" || actionType === "create_planner_session";

const EDeviserIntelligencePanel = () => {
  const { t, i18n } = useTranslation("common");
  const location = useLocation();
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<IntelligenceResponse | null>(null);
  const [approvedIds, setApprovedIds] = useState<ReadonlySet<string>>(
    new Set()
  );
  const intelligence = useEDeviserIntelligence();
  const decision = useIntelligenceProposalDecision();
  const execution = useIntelligenceProposalExecution();
  const feed = useProactiveIntelligenceFeed();

  const ask = async () => {
    const trimmed = message.trim();
    if (!trimmed) return;
    try {
      const response = await intelligence.mutateAsync({
        message: `${trimmed}\n\nRespond in ${
          i18n.resolvedLanguage === "ar" ? "Arabic" : "English"
        }.`,
        context: { route: location.pathname },
      });
      setResult(response);
      setMessage("");
    } catch {
      toast.error(t("intelligence.unavailable"));
    }
  };

  const approve = async (proposalId: string) => {
    try {
      await decision.mutateAsync({ proposalId, decision: "approve" });
      setApprovedIds((current) => new Set(current).add(proposalId));
      toast.success(t("intelligence.approved"));
    } catch {
      toast.error(t("intelligence.actionFailed"));
    }
  };

  const execute = async (proposalId: string) => {
    try {
      await execution.mutateAsync({ proposalId });
      toast.success(t("intelligence.executed"));
    } catch {
      toast.error(t("intelligence.actionFailed"));
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          className="fixed end-4 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-40 gap-2 rounded-full shadow-lg min-[640px]:bottom-6"
          aria-label={t("intelligence.open")}
        >
          <Bot className="size-4" />
          <span className="hidden sm:inline">{t("intelligence.title")}</span>
        </Button>
      </SheetTrigger>
      <SheetContent
        side={i18n.dir() === "rtl" ? "left" : "right"}
        className="w-full overflow-y-auto sm:max-w-md"
      >
        <SheetHeader>
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-xl border border-slate-200/60 bg-white/80 backdrop-blur-xs">
              <Bot className="size-5" />
            </span>
            <SheetTitle>{t("intelligence.title")}</SheetTitle>
          </div>
          <SheetDescription>{t("intelligence.description")}</SheetDescription>
        </SheetHeader>

        <section className="space-y-3 px-4">
          <h3 className="text-sm font-semibold">
            {t("intelligence.proactive")}
          </h3>
          {feed.isLoading ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : feed.data?.length ? (
            feed.data.slice(0, 5).map((item) => (
              <article
                key={item.id}
                className="rounded-xl border bg-card p-3 text-sm shadow-xs"
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <Badge variant="secondary">{item.specialist}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Intl.DateTimeFormat(i18n.language, {
                      dateStyle: "medium",
                    }).format(new Date(item.completed_at))}
                  </span>
                </div>
                <p className="whitespace-pre-wrap leading-6">
                  {item.recommendation}
                </p>
                {item.proposals.map((proposal) => (
                  <div key={proposal.id} className="mt-3 border-t pt-3">
                    {approvedIds.has(proposal.id) &&
                    mayExecute(proposal.actionType) ? (
                      <Button
                        size="sm"
                        onClick={() => void execute(proposal.id)}
                        disabled={execution.isPending}
                      >
                        {t("intelligence.execute")}
                      </Button>
                    ) : proposal.status === "pending" &&
                      !approvedIds.has(proposal.id) ? (
                      <Button
                        size="sm"
                        onClick={() => void approve(proposal.id)}
                        disabled={decision.isPending}
                      >
                        {t("intelligence.approve")}
                      </Button>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        {t("intelligence.approvedAwaiting")}
                      </p>
                    )}
                  </div>
                ))}
              </article>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              {t("intelligence.noProactive")}
            </p>
          )}
        </section>

        {result && (
          <section className="space-y-3 px-4">
            <div className="rounded-xl border bg-card p-3 text-sm shadow-xs">
              <Badge variant="outline" className="mb-2">
                {result.specialist}
              </Badge>
              <p className="whitespace-pre-wrap leading-6">{result.response}</p>
            </div>
            {result.proposals.map((proposal) => (
              <div key={proposal.id} className="rounded-xl border p-3">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <ShieldCheck className="size-4" />
                  {t("intelligence.approvalRequired")}
                </div>
                <p className="mb-3 text-sm text-muted-foreground">
                  {proposal.reason}
                </p>
                {approvedIds.has(proposal.id) &&
                mayExecute(proposal.actionType) ? (
                  <Button
                    size="sm"
                    onClick={() => void execute(proposal.id)}
                    disabled={execution.isPending}
                  >
                    {t("intelligence.execute")}
                  </Button>
                ) : proposal.status === "pending" &&
                  !approvedIds.has(proposal.id) ? (
                  <Button
                    size="sm"
                    onClick={() => void approve(proposal.id)}
                    disabled={decision.isPending}
                  >
                    {t("intelligence.approve")}
                  </Button>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {t("intelligence.approvedAwaiting")}
                  </p>
                )}
              </div>
            ))}
          </section>
        )}

        <div className="mt-auto space-y-2 border-t p-4">
          <Textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder={t("intelligence.placeholder")}
            maxLength={7800}
            rows={3}
          />
          <Button
            className="w-full gap-2"
            onClick={() => void ask()}
            disabled={intelligence.isPending || !message.trim()}
          >
            {intelligence.isPending ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            {t("intelligence.ask")}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default EDeviserIntelligencePanel;

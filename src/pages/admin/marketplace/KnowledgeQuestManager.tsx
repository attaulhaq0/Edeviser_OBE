/**
 * Task 21.6: Knowledge Quest Manager — Admin quest CRUD with DataTable
 */
import { useState, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createKnowledgeQuestSchema } from "@/lib/marketplaceSchemas";
import {
  useAdminKnowledgeQuests,
  useCreateKnowledgeQuest,
  useUpdateKnowledgeQuest,
} from "@/hooks/useKnowledgeQuestAdmin";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/shared/DataTable";
import GradientCardHeader from "@/components/shared/GradientCardHeader";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Compass, Plus, Pencil, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import type { ColumnDef } from "@tanstack/react-table";

interface QuestRow {
  id: string;
  title: string;
  description: string;
  quest_type: string;
  start_date: string;
  end_date: string;
  reward_type: string;
  reward_item_id: string | null;
  reward_xp_amount: number | null;
  target_clo_ids: string[];
}

interface QuestFormValues {
  title: string;
  description: string;
  quest_type: "quiz_challenge" | "content_creation" | "peer_review";
  target_clo_ids: string[];
  start_date: string;
  end_date: string;
  reward_type: "item" | "xp";
  reward_item_id: string | null;
  reward_xp_amount: number | null;
}

const KnowledgeQuestManager = () => {
  const { data: quests, isLoading } = useAdminKnowledgeQuests();
  const createQuest = useCreateKnowledgeQuest();
  const updateQuest = useUpdateKnowledgeQuest();
  const [showForm, setShowForm] = useState(false);
  const [editingQuest, setEditingQuest] = useState<QuestRow | null>(null);

  const form = useForm<QuestFormValues>({
    resolver: zodResolver(createKnowledgeQuestSchema) as never,
    defaultValues: {
      title: "",
      description: "",
      quest_type: "quiz_challenge",
      target_clo_ids: [],
      start_date: "",
      end_date: "",
      reward_type: "xp",
      reward_item_id: null,
      reward_xp_amount: 100,
    },
  });

  const rewardType = useWatch({ control: form.control, name: "reward_type" });

  const questRows = (quests ?? []) as unknown as QuestRow[];

  const handleEdit = (quest: QuestRow) => {
    setEditingQuest(quest);
    const fullQuest = questRows.find((q) => q.id === quest.id);
    if (fullQuest) {
      form.reset({
        title: fullQuest.title,
        description: fullQuest.description,
        quest_type: fullQuest.quest_type as QuestFormValues["quest_type"],
        target_clo_ids: fullQuest.target_clo_ids ?? [],
        start_date: fullQuest.start_date,
        end_date: fullQuest.end_date,
        reward_type: fullQuest.reward_type as QuestFormValues["reward_type"],
        reward_item_id: fullQuest.reward_item_id ?? null,
        reward_xp_amount: fullQuest.reward_xp_amount ?? 100,
      });
    }
    setShowForm(true);
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingQuest(null);
    form.reset();
  };

  const onSubmit = (data: QuestFormValues) => {
    if (editingQuest) {
      updateQuest.mutate(
        { id: editingQuest.id, ...data },
        {
          onSuccess: () => {
            toast.success("Quest updated");
            resetForm();
          },
          onError: (err) => toast.error(err.message),
        }
      );
    } else {
      createQuest.mutate(data, {
        onSuccess: () => {
          toast.success("Quest created");
          resetForm();
        },
        onError: (err) => toast.error(err.message),
      });
    }
  };

  const isPending = createQuest.isPending || updateQuest.isPending;

  const columns = useMemo<ColumnDef<QuestRow>[]>(
    () => [
      { accessorKey: "title", header: "Title" },
      {
        accessorKey: "quest_type",
        header: "Type",
        cell: ({ row }) => (
          <Badge variant="outline" className="text-xs capitalize">
            {row.original.quest_type.replace(/_/g, " ")}
          </Badge>
        ),
      },
      {
        accessorKey: "start_date",
        header: "Start",
        cell: ({ row }) => (
          <span className="text-xs text-gray-500">
            {format(new Date(row.original.start_date), "MMM d, yyyy")}
          </span>
        ),
      },
      {
        accessorKey: "end_date",
        header: "End",
        cell: ({ row }) => {
          const isExpired = new Date(row.original.end_date) < new Date();
          return (
            <span
              className={`text-xs ${
                isExpired ? "text-red-500" : "text-gray-500"
              }`}
            >
              {format(new Date(row.original.end_date), "MMM d, yyyy")}
            </span>
          );
        },
      },
      {
        accessorKey: "reward_type",
        header: "Reward",
        cell: ({ row }) => (
          <span className="text-xs font-medium">
            {row.original.reward_type === "xp"
              ? `${row.original.reward_xp_amount} XP`
              : "Exclusive Item"}
          </span>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEdit(row.original)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
        ),
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
    ],
    [quests]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Compass className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold tracking-tight">
            Knowledge Quests
          </h1>
        </div>
        <Button
          onClick={() => {
            setEditingQuest(null);
            form.reset();
            setShowForm(true);
          }}
          className="bg-gradient-to-r from-teal-500 to-blue-600 text-white active:scale-95"
        >
          <Plus className="h-4 w-4" /> New Quest
        </Button>
      </div>

      {/* CRUD Form */}
      {showForm && (
        <Card className="bg-white border-0 shadow-md rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold tracking-tight">
              {editingQuest ? "Edit Quest" : "Create Quest"}
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={resetForm}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Quest title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Describe the quest objectives..."
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="quest_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quest Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="bg-white">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="quiz_challenge">
                            Quiz Challenge
                          </SelectItem>
                          <SelectItem value="content_creation">
                            Content Creation
                          </SelectItem>
                          <SelectItem value="peer_review">
                            Peer Review
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="reward_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reward Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="bg-white">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="xp">XP Reward</SelectItem>
                          <SelectItem value="item">Exclusive Item</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {rewardType === "xp" && (
                <FormField
                  control={form.control}
                  name="reward_xp_amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>XP Reward Amount</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value ? Number(e.target.value) : null
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {rewardType === "item" && (
                <FormField
                  control={form.control}
                  name="reward_item_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reward Item ID</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) =>
                            field.onChange(e.target.value || null)
                          }
                          placeholder="UUID of the exclusive marketplace item"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="start_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="end_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date</FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={isPending}
                  className="bg-gradient-to-r from-teal-500 to-blue-600 text-white active:scale-95"
                >
                  {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingQuest ? "Update Quest" : "Create Quest"}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </Card>
      )}

      {/* Quest DataTable */}
      <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
        <GradientCardHeader icon={Compass} title="All Quests" />
        <div className="p-4">
          <DataTable columns={columns} data={questRows} isLoading={isLoading} />
        </div>
      </Card>
    </div>
  );
};

export default KnowledgeQuestManager;

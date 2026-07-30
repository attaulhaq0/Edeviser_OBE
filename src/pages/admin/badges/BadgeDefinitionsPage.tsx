import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  Archive,
  ArchiveRestore,
  Loader2,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { PageHeader, StatePanel } from "@/design-system";
import { useAuth } from "@/hooks/useAuth";
import {
  useBadgeDefinitions,
  useCreateBadgeDefinition,
  useDeleteBadgeDefinition,
  useUpdateBadgeDefinition,
  type BadgeDefinition,
  type BadgeDefinitionInput,
} from "@/hooks/useBadgeDefinitions";
import {
  badgeDefinitionSchema,
  type BadgeDefinitionFormValues,
} from "@/lib/schemas/badgeDefinition";
import type { Json } from "@/types/database";
import { cn } from "@/lib/utils";

const EMPTY_VALUES: BadgeDefinitionFormValues = {
  name: "",
  badge_key: "",
  description: "",
  emoji: "🏅",
  category: "",
  bronze_condition: "",
  silver_condition: "",
  gold_condition: "",
};

const conditionText = (conditions: Json | null, tier: string) => {
  if (
    !conditions ||
    typeof conditions !== "object" ||
    Array.isArray(conditions)
  ) {
    return "";
  }

  const tierValue = conditions[tier];
  if (typeof tierValue === "string") return tierValue;
  if (tierValue && typeof tierValue === "object" && !Array.isArray(tierValue)) {
    const description = tierValue.description;
    if (typeof description === "string") return description;
    const threshold = tierValue.threshold;
    if (typeof threshold === "number" || typeof threshold === "string") {
      return String(threshold);
    }
  }
  return "";
};

const valuesFromDefinition = (
  definition: BadgeDefinition
): BadgeDefinitionFormValues => ({
  name: definition.name,
  badge_key: definition.badge_key,
  description: definition.description,
  emoji: definition.emoji,
  category: definition.category ?? "",
  bronze_condition: conditionText(definition.tier_conditions, "bronze"),
  silver_condition: conditionText(definition.tier_conditions, "silver"),
  gold_condition: conditionText(definition.tier_conditions, "gold"),
});

const toInput = (values: BadgeDefinitionFormValues): BadgeDefinitionInput => ({
  badge_key: values.badge_key,
  name: values.name,
  description: values.description,
  emoji: values.emoji,
  category: values.category || null,
  tier_conditions: {
    bronze: { description: values.bronze_condition },
    silver: { description: values.silver_condition },
    gold: { description: values.gold_condition },
  },
});

const tierSummary = (
  definition: BadgeDefinition,
  labels: { bronze: string; silver: string; gold: string },
  emptyLabel: string
) => {
  const tiers = [
    ["🥉", labels.bronze, conditionText(definition.tier_conditions, "bronze")],
    ["🥈", labels.silver, conditionText(definition.tier_conditions, "silver")],
    ["🥇", labels.gold, conditionText(definition.tier_conditions, "gold")],
  ].filter(([, , value]) => value);

  if (tiers.length === 0) return emptyLabel;
  return tiers
    .map(([emoji, label, value]) => `${emoji} ${label}: ${value}`)
    .join(" · ");
};

const categoryClass = (category: string | null) => {
  switch (category?.toLowerCase()) {
    case "academic":
    case "mastery":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "streak":
    case "habit":
    case "consistency":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "team":
    case "social":
      return "border-cyan-200 bg-cyan-50 text-cyan-700";
    case "mystery":
      return "border-violet-200 bg-violet-50 text-violet-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
};

const BadgeDefinitionsPage = () => {
  const { t } = useTranslation("common");
  const { institutionId } = useAuth();
  const {
    data: definitions = [],
    isLoading,
    isError,
  } = useBadgeDefinitions(institutionId ?? undefined);
  const createDefinition = useCreateBadgeDefinition();
  const updateDefinition = useUpdateBadgeDefinition();
  const deleteDefinition = useDeleteBadgeDefinition();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<BadgeDefinition | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BadgeDefinition | null>(
    null
  );

  const form = useForm<BadgeDefinitionFormValues>({
    resolver: zodResolver(badgeDefinitionSchema),
    defaultValues: EMPTY_VALUES,
  });

  const openCreate = () => {
    setEditing(null);
    form.reset(EMPTY_VALUES);
    setEditorOpen(true);
  };

  const openEdit = (definition: BadgeDefinition) => {
    setEditing(definition);
    form.reset(valuesFromDefinition(definition));
    setEditorOpen(true);
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setEditing(null);
    form.reset(EMPTY_VALUES);
  };

  const onSubmit = (values: BadgeDefinitionFormValues) => {
    if (!institutionId) {
      toast.error(
        t(
          "admin.badges.missingInstitution",
          "Your account is not linked to an institution."
        )
      );
      return;
    }

    const onSuccess = () => {
      toast.success(
        editing
          ? t("admin.badges.updated", "Badge definition updated")
          : t("admin.badges.created", "Badge definition created")
      );
      closeEditor();
    };
    const onError = (error: Error) => toast.error(error.message);

    if (editing) {
      updateDefinition.mutate(
        { id: editing.id, input: toInput(values) },
        { onSuccess, onError }
      );
      return;
    }

    createDefinition.mutate(
      { institutionId, input: toInput(values) },
      { onSuccess, onError }
    );
  };

  const toggleArchived = (definition: BadgeDefinition) => {
    updateDefinition.mutate(
      {
        id: definition.id,
        input: { is_archived: !definition.is_archived },
      },
      {
        onSuccess: () =>
          toast.success(
            definition.is_archived
              ? t("admin.badges.restored", "Badge restored")
              : t("admin.badges.archived", "Badge archived")
          ),
        onError: (error) => toast.error(error.message),
      }
    );
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteDefinition.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success(t("admin.badges.deleted", "Badge definition deleted"));
        setDeleteTarget(null);
      },
      onError: (error) => toast.error(error.message),
    });
  };

  const mutationPending =
    createDefinition.isPending || updateDefinition.isPending;

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <PageHeader
          title={t("admin.badges.title", "Badge Definitions")}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild variant="outline" size="sm">
                <Link to="/admin/badges/spotlight">
                  <Sparkles className="size-4" />
                  {t("admin.badges.spotlight", "Spotlight schedule")}
                </Link>
              </Button>
              <Button
                type="button"
                size="sm"
                variant="tactile"
                onClick={openCreate}
              >
                <Plus className="size-4" />
                {t("admin.badges.new", "New badge")}
              </Button>
            </div>
          }
        />
        <p className="text-xs text-slate-500">
          {t(
            "admin.badges.description",
            "Institution-level badge templates with tiered progression."
          )}
        </p>
      </div>

      {isLoading ? (
        <StatePanel variant="loading" />
      ) : isError ? (
        <StatePanel
          variant="error"
          message={t(
            "admin.badges.loadError",
            "Could not load badge definitions."
          )}
        />
      ) : definitions.length === 0 ? (
        <div className="rounded-xl bg-white p-6 text-center shadow-md">
          <p className="text-sm text-slate-500">
            {t(
              "admin.badges.empty",
              "No badge definitions yet. Create the first institution badge."
            )}
          </p>
          <div className="mt-4">
            <Button type="button" onClick={openCreate}>
              <Plus className="size-4" />
              {t("admin.badges.new", "New badge")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {definitions.map((definition) => (
            <article
              key={definition.id}
              className={cn(
                "rounded-[14px] border border-slate-200/80 bg-white p-3.5 shadow-sm transition-shadow hover:shadow-md",
                definition.is_archived && "opacity-55"
              )}
            >
              <div className="flex items-start gap-3">
                <span
                  className="text-2xl leading-8"
                  role="img"
                  aria-label={definition.name}
                >
                  {definition.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-sm font-bold text-slate-900">
                      {definition.name}
                    </h2>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] capitalize",
                        categoryClass(definition.category)
                      )}
                    >
                      {definition.category ||
                        t("admin.badges.uncategorized", "Uncategorized")}
                    </Badge>
                    {definition.is_archived && (
                      <Badge variant="destructive" className="text-[10px]">
                        {t("admin.badges.archivedLabel", "Archived")}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                    {definition.description ||
                      t("admin.badges.noDescription", "No description")}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t("common.edit", "Edit")}
                  onClick={() => openEdit(definition)}
                >
                  <Pencil className="size-3.5" />
                </Button>
              </div>

              <p className="mt-2 text-[11px] leading-5 text-slate-500">
                {tierSummary(
                  definition,
                  {
                    bronze: t("admin.badges.bronze", "Bronze"),
                    silver: t("admin.badges.silver", "Silver"),
                    gold: t("admin.badges.gold", "Gold"),
                  },
                  t(
                    "admin.badges.singleTier",
                    "Single-tier · condition not configured"
                  )
                )}
              </p>
              <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2">
                <code className="truncate text-[10px] text-slate-400">
                  {definition.badge_key}
                </code>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-slate-500"
                    onClick={() => toggleArchived(definition)}
                  >
                    {definition.is_archived ? (
                      <ArchiveRestore className="size-3.5" />
                    ) : (
                      <Archive className="size-3.5" />
                    )}
                    {definition.is_archived
                      ? t("admin.badges.restore", "Restore")
                      : t("admin.badges.archive", "Archive")}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="text-slate-400 hover:text-red-600"
                    aria-label={t("common.delete", "Delete")}
                    onClick={() => setDeleteTarget(definition)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <Dialog
        open={editorOpen}
        onOpenChange={(open) => (open ? setEditorOpen(true) : closeEditor())}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editing
                ? t("admin.badges.editTitle", "Edit badge definition")
                : t("admin.badges.createTitle", "Create badge definition")}
            </DialogTitle>
            <DialogDescription>
              {t(
                "admin.badges.formDescription",
                "Define the presentation and Bronze, Silver, and Gold progression conditions."
              )}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form
              id="badge-definition-form"
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4"
            >
              <div className="grid grid-cols-[88px_minmax(0,1fr)] gap-3">
                <FormField
                  control={form.control}
                  name="emoji"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("admin.badges.emoji", "Emoji")}</FormLabel>
                      <FormControl>
                        <Input {...field} className="text-center text-xl" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("admin.badges.name", "Name")}</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="badge_key"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t("admin.badges.key", "Badge key")}
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="perfect_week"
                          disabled={!!editing}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {t("admin.badges.category", "Category")}
                      </FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="academic" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("admin.badges.badgeDescription", "Description")}
                    </FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <fieldset className="rounded-xl border border-slate-200 p-4">
                <legend className="px-1 text-sm font-bold text-slate-800">
                  {t("admin.badges.tierConditions", "Tier conditions")}
                </legend>
                <div className="mt-1 grid gap-3">
                  {(
                    [
                      ["bronze_condition", "🥉", "Bronze"],
                      ["silver_condition", "🥈", "Silver"],
                      ["gold_condition", "🥇", "Gold"],
                    ] as const
                  ).map(([name, emoji, label]) => (
                    <FormField
                      key={name}
                      control={form.control}
                      name={name}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {emoji}{" "}
                            {t(`admin.badges.${label.toLowerCase()}`, label)}
                          </FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder={t(
                                "admin.badges.conditionPlaceholder",
                                "Describe the measurable threshold"
                              )}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
              </fieldset>
            </form>
          </Form>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeEditor}>
              {t("common.cancel", "Cancel")}
            </Button>
            <Button
              type="submit"
              form="badge-definition-form"
              disabled={mutationPending}
            >
              {mutationPending && <Loader2 className="size-4 animate-spin" />}
              {editing
                ? t("common.save", "Save changes")
                : t("admin.badges.create", "Create badge")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t("admin.badges.deleteTitle", "Delete badge definition?")}
        description={t(
          "admin.badges.deleteDescription",
          "This permanently removes the institution badge template. Existing earned badges are not removed."
        )}
        confirmLabel={t("common.delete", "Delete")}
        onConfirm={confirmDelete}
        isPending={deleteDefinition.isPending}
        variant="destructive"
      />
    </div>
  );
};

export default BadgeDefinitionsPage;

// Task 113.1: Graduate Attribute Manager page
// Req 6 (qa-partner-review-remediation): surface GA mappings + computed
// attainment alongside the existing name/description list and Add form.

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import Shimmer from "@/components/shared/Shimmer";
import ErrorBoundary from "@/components/shared/ErrorBoundary";
import { InlineEmpty } from "@/components/shared/EmptyState";
import { Plus, Loader2, Trash2, Award, Target } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import {
  useGraduateAttributes,
  useCreateGraduateAttribute,
  useDeleteGraduateAttribute,
  useGraduateAttributeAttainment,
  useGraduateAttributeMappings,
  type GAAttainment,
  type GraduateAttribute,
} from "@/hooks/useGraduateAttributes";
import { useILOs } from "@/hooks/useILOs";
import { resolveName } from "@/lib/db/resolveName";
import {
  getAttainmentColor,
  classifyAttainment,
} from "@/lib/attainmentClassifier";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});

const ATTAINMENT_LABEL: Record<string, string> = {
  Excellent: "Excellent",
  Satisfactory: "Satisfactory",
  Developing: "Developing",
  Not_Yet: "Not Yet",
};

// Computed attainment chip (Req 6.2, 6.6) — reuses the pre-computed
// GAAttainment row (Req 6.5); never reimplements the weighted calculation.
const AttainmentChip = ({
  attainment,
}: {
  attainment: GAAttainment | undefined;
}) => {
  // Mappings exist but the attainment row has not resolved yet.
  if (!attainment) {
    return (
      <span className="text-xs text-slate-400" aria-live="polite">
        Attainment unavailable
      </span>
    );
  }

  const percent = Math.round(attainment.avg_attainment);
  const level = classifyAttainment(percent);

  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
        Attainment
      </span>
      <span
        className="inline-flex items-center justify-center min-w-14 px-2 py-1 rounded-md text-xs font-bold text-white"
        style={{ backgroundColor: getAttainmentColor(percent) }}
        title={`${percent}% — ${ATTAINMENT_LABEL[level] ?? level}`}
      >
        {percent}%
      </span>
      <span className="text-xs font-medium text-slate-500">
        {ATTAINMENT_LABEL[level] ?? level}
      </span>
    </div>
  );
};

// Per-attribute mappings + attainment surface (Req 6.1, 6.2, 6.3, 6.6).
// `useGraduateAttributeMappings` is keyed by attribute id, so it is consumed
// inside a per-row component; `outcomeNameById` resolves the GA→ILO outcome
// ids (Req 6.1) so the user sees outcome names rather than raw UUIDs.
const AttributeMappings = ({
  attributeId,
  attainment,
  outcomeNameById,
}: {
  attributeId: string;
  attainment: GAAttainment | undefined;
  outcomeNameById: Map<string, string>;
}) => {
  const { data: mappings = [], isLoading } =
    useGraduateAttributeMappings(attributeId);

  if (isLoading) {
    return <Shimmer className="h-8 rounded-md" />;
  }

  // Zero mappings → inline empty state instead of a bare 0 (Req 6.3).
  if (mappings.length === 0) {
    return (
      <InlineEmpty
        icon={<Target className="h-5 w-5 text-gray-400" />}
        title="No outcomes mapped yet"
        description="Map this attribute to institution outcomes to track attainment."
        className="py-4"
      />
    );
  }

  return (
    <div className="space-y-2">
      {/* Mapped outcomes sourced from graduate_attribute_mappings (Req 6.1). */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
          Mapped outcomes
        </span>
        {mappings.map((m) => (
          <Badge
            key={m.id}
            variant="outline"
            className="border-red-200 bg-red-50 text-red-700"
            title={`Weight ${m.weight}%`}
          >
            {resolveName(outcomeNameById.get(m.outcome_id))}
            <span className="opacity-60">· {m.weight}%</span>
          </Badge>
        ))}
      </div>
      {/* Computed attainment with platform color coding (Req 6.2, 6.6). */}
      <AttainmentChip attainment={attainment} />
    </div>
  );
};

// A single attribute row: name/description plus the isolated mappings +
// attainment surface (Req 6.4 — a render failure shows a fallback, never a
// blank region).
const AttributeRow = ({
  attr,
  attainment,
  outcomeNameById,
  onDelete,
}: {
  attr: GraduateAttribute;
  attainment: GAAttainment | undefined;
  outcomeNameById: Map<string, string>;
  onDelete: () => void;
}) => (
  <div className="flex items-start justify-between gap-4 p-3 rounded-lg border border-slate-100 hover:bg-slate-50">
    <div className="flex-1 min-w-0">
      <span className="text-sm font-medium">{attr.name}</span>
      {attr.description && (
        <p className="text-xs text-slate-500 mt-0.5">{attr.description}</p>
      )}
      <div className="mt-2">
        <ErrorBoundary
          fallback={
            <span className="text-xs text-red-500">
              Unable to display mappings and attainment
            </span>
          }
        >
          <AttributeMappings
            attributeId={attr.id}
            attainment={attainment}
            outcomeNameById={outcomeNameById}
          />
        </ErrorBoundary>
      </div>
    </div>
    <Button
      variant="ghost"
      size="sm"
      onClick={onDelete}
      className="text-slate-400 hover:text-red-500 shrink-0"
    >
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  </div>
);

const GraduateAttributeManager = () => {
  const { profile } = useAuth();
  const institutionId = profile?.institution_id;
  const { data: attributes = [], isLoading } =
    useGraduateAttributes(institutionId);
  const { data: attainmentRows = [] } =
    useGraduateAttributeAttainment(institutionId);
  // Resolve GA→ILO outcome ids to readable names in a single query (Req 6.1).
  const { data: iloPage } = useILOs({ pageSize: 1000 });
  const createMutation = useCreateGraduateAttribute();
  const deleteMutation = useDeleteGraduateAttribute();
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // Match attainment rows to attributes by attribute_id (Req 6.2, 6.5).
  const attainmentByAttribute = new Map<string, GAAttainment>(
    attainmentRows.map((row) => [row.attribute_id, row])
  );

  // outcome_id → title lookup for the mapped-outcome chips (Req 6.1).
  const outcomeNameById = new Map<string, string>(
    (iloPage?.data ?? []).map((ilo) => [ilo.id, ilo.title])
  );

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", description: "" },
  });

  const onSubmit = (data: z.infer<typeof schema>) => {
    createMutation.mutate(data, {
      onSuccess: () => {
        toast.success("Graduate attribute created");
        form.reset();
      },
      onError: (err) => toast.error(err.message),
    });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Graduate Attributes</h1>

      <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden gap-0 py-0">
        <div
          className="px-6 py-4 flex items-center gap-2"
          style={{
            background: "var(--brand-gradient)",
          }}
        >
          <Award className="h-5 w-5 text-white" />
          <h2 className="text-lg font-bold tracking-tight text-white">
            Attributes
          </h2>
        </div>
        <div className="p-6">
          {isLoading ? (
            <Shimmer className="h-32 rounded-lg" />
          ) : attributes.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">
              No graduate attributes defined yet.
            </p>
          ) : (
            <div className="space-y-2">
              {attributes.map((attr) => (
                <AttributeRow
                  key={attr.id}
                  attr={attr}
                  attainment={attainmentByAttribute.get(attr.id)}
                  outcomeNameById={outcomeNameById}
                  onDelete={() => setDeleteTarget(attr.id)}
                />
              ))}
            </div>
          )}
        </div>
      </Card>

      <Card className="bg-white border-0 shadow-md rounded-xl p-6 max-w-2xl">
        <h2 className="text-lg font-bold tracking-tight mb-4">
          Add Graduate Attribute
        </h2>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Critical Thinking, Communication, etc."
                      {...field}
                    />
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
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              disabled={createMutation.isPending}
              className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95"
            >
              {createMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}{" "}
              Add
            </Button>
          </form>
        </Form>
      </Card>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o: boolean) => !o && setDeleteTarget(null)}
        title="Delete attribute?"
        description="This will permanently remove this graduate attribute and its mappings."
        onConfirm={() => {
          if (deleteTarget)
            deleteMutation.mutate(deleteTarget, {
              onSuccess: () => {
                toast.success("Deleted");
                setDeleteTarget(null);
              },
            });
        }}
        isPending={deleteMutation.isPending}
      />
    </div>
  );
};

export default GraduateAttributeManager;

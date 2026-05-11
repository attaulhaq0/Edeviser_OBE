import { useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import SubCLORow from "@/components/shared/SubCLORow";
import { useCLO } from "@/hooks/useCLOs";
import {
  useSubCLOs,
  useCreateSubCLO,
  useDeleteSubCLO,
} from "@/hooks/useSubCLOs";
import {
  subCLOSchema,
  isWeightSumValid,
  type SubCLOFormData,
} from "@/lib/schemas/subCLO";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { useState } from "react";

const SubCLOManager = () => {
  const { cloId } = useParams<{ cloId: string }>();
  const { data: parentCLO } = useCLO(cloId);
  const { data: subCLOs = [], isLoading } = useSubCLOs(cloId);
  const createMutation = useCreateSubCLO();
  const deleteMutation = useDeleteSubCLO();
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const form = useForm<SubCLOFormData>({
    resolver: zodResolver(subCLOSchema),
    defaultValues: {
      title: "",
      code: "",
      weight: 0,
      parent_outcome_id: cloId ?? "",
    },
  });

  const currentWeights = subCLOs.map(
    (sc) => (sc as { weight?: number }).weight ?? 0
  );
  const weightSum = currentWeights.reduce((a, b) => a + b, 0);
  const weightsValid = isWeightSumValid(currentWeights);

  const onSubmit = (data: SubCLOFormData) => {
    createMutation.mutate(
      { ...data, parent_outcome_id: cloId! },
      {
        onSuccess: () => {
          toast.success("Sub-CLO created");
          form.reset({
            title: "",
            code: "",
            weight: 0,
            parent_outcome_id: cloId ?? "",
          });
        },
        onError: (err) => toast.error(err.message),
      }
    );
  };

  const handleDelete = () => {
    if (!deleteTarget || !cloId) return;
    deleteMutation.mutate(
      { id: deleteTarget, parentCloId: cloId },
      {
        onSuccess: () => {
          toast.success("Sub-CLO deleted");
          setDeleteTarget(null);
        },
        onError: (err) => {
          toast.error(err.message);
          setDeleteTarget(null);
        },
      }
    );
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Sub-CLOs</h1>
        {parentCLO && (
          <p className="text-sm text-slate-500 mt-1">
            Parent CLO: {parentCLO.title}
          </p>
        )}
      </div>

      {/* Weight sum indicator */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-slate-500">Weight total:</span>
        <span
          className={
            weightsValid || subCLOs.length === 0
              ? "text-green-600 font-semibold"
              : "text-amber-600 font-semibold"
          }
        >
          {(weightSum * 100).toFixed(1)}% / 100%
        </span>
        {!weightsValid && subCLOs.length > 0 && (
          <AlertTriangle className="h-4 w-4 text-amber-500" />
        )}
      </div>

      {/* Existing Sub-CLOs */}
      <Card className="bg-white border-0 shadow-md rounded-xl p-4">
        {isLoading ? (
          <div className="h-20 rounded-lg animate-shimmer" />
        ) : subCLOs.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">
            No Sub-CLOs yet. Add one below.
          </p>
        ) : (
          <div className="space-y-1">
            {subCLOs.map((sc) => (
              <SubCLORow
                key={sc.id}
                subCLO={sc as never}
                onDelete={(id) => setDeleteTarget(id)}
              />
            ))}
          </div>
        )}
      </Card>

      {/* Add Sub-CLO form */}
      <Card className="bg-white border-0 shadow-md rounded-xl p-6">
        <h2 className="text-lg font-bold tracking-tight mb-4">Add Sub-CLO</h2>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code</FormLabel>
                    <FormControl>
                      <Input placeholder="SC1.1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="weight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Weight (0–1)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max="1"
                        {...field}
                        onChange={(e) =>
                          field.onChange(parseFloat(e.target.value) || 0)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Sub-CLO title" {...field} />
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
              )}
              Add Sub-CLO
            </Button>
          </form>
        </Form>
      </Card>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open: boolean) => !open && setDeleteTarget(null)}
        title="Delete Sub-CLO?"
        description="This will permanently remove this Sub-CLO. Evidence linked to it must be removed first."
        onConfirm={handleDelete}
        isPending={deleteMutation.isPending}
      />
    </div>
  );
};

export default SubCLOManager;

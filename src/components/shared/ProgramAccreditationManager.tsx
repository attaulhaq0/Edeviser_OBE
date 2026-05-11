import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import Shimmer from "@/components/shared/Shimmer";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import {
  useAllProgramAccreditations,
  useCreateProgramAccreditation,
  useDeleteProgramAccreditation,
  type CreateProgramAccreditationInput,
} from "@/hooks/useInstitutionSettings";
import { usePrograms } from "@/hooks/usePrograms";
import {
  Shield,
  Plus,
  Trash2,
  Loader2,
  AlertTriangle,
  Calendar,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";

const ACCREDITATION_BODIES = [
  "HEC",
  "QQA",
  "ABET",
  "NCAAA",
  "AACSB",
  "Generic",
] as const;

const STATUS_STYLES: Record<string, string> = {
  active: "bg-green-50 text-green-700 border-green-200",
  expired: "bg-red-50 text-red-700 border-red-200",
  pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
};

const accreditationFormSchema = z.object({
  program_id: z.string().min(1, "Program is required"),
  accreditation_body: z.string().min(1, "Accreditation body is required"),
  framework_version: z.string().optional(),
  accreditation_date: z.string().optional(),
  next_review_date: z.string().optional(),
  status: z.enum(["active", "expired", "pending"]),
});

type AccreditationFormData = z.infer<typeof accreditationFormSchema>;

const ProgramAccreditationManager = () => {
  const { data: accreditations, isLoading } = useAllProgramAccreditations();
  const { data: programsResult } = usePrograms({ pageSize: 100 });
  const createMutation = useCreateProgramAccreditation();
  const deleteMutation = useDeleteProgramAccreditation();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const programs = programsResult?.data ?? [];

  const form = useForm<AccreditationFormData>({
    resolver: zodResolver(accreditationFormSchema),
    defaultValues: {
      program_id: "",
      accreditation_body: "",
      framework_version: "",
      accreditation_date: "",
      next_review_date: "",
      status: "pending",
    },
  });

  const onSubmit = (data: AccreditationFormData) => {
    const input: CreateProgramAccreditationInput = {
      program_id: data.program_id,
      accreditation_body: data.accreditation_body,
      framework_version: data.framework_version || undefined,
      accreditation_date: data.accreditation_date || undefined,
      next_review_date: data.next_review_date || undefined,
      status: data.status,
    };

    createMutation.mutate(input, {
      onSuccess: () => {
        setDialogOpen(false);
        form.reset();
      },
    });
  };

  const handleDelete = () => {
    if (deleteId) {
      deleteMutation.mutate(deleteId, {
        onSuccess: () => setDeleteId(null),
      });
    }
  };

  // Find accreditations with upcoming reviews (within 90 days)
  const upcomingReviews = (accreditations ?? []).filter((a) => {
    if (!a.next_review_date) return false;
    const days = differenceInDays(new Date(a.next_review_date), new Date());
    return days >= 0 && days <= 90;
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Shimmer className="h-8 w-64 rounded-lg" />
        <Shimmer className="h-48 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Upcoming Review Alerts */}
      {upcomingReviews.length > 0 && (
        <div className="rounded-xl bg-amber-50 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <p className="text-sm font-semibold text-amber-800">
              Upcoming Accreditation Reviews
            </p>
          </div>
          {upcomingReviews.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between text-sm"
            >
              <span className="text-amber-700">
                {a.program_name ?? "Unknown"} — {a.accreditation_body}
              </span>
              <span className="text-amber-600 text-xs">
                Review:{" "}
                {a.next_review_date
                  ? format(new Date(a.next_review_date), "MMM d, yyyy")
                  : "—"}{" "}
                ({differenceInDays(new Date(a.next_review_date!), new Date())}{" "}
                days)
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Accreditation List */}
      <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
        <div
          className="px-6 py-4 flex items-center justify-between"
          style={{
            background:
              "linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)",
          }}
        >
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-white" />
            <h2 className="text-lg font-bold tracking-tight text-white">
              Program Accreditations
            </h2>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setDialogOpen(true)}
            className="bg-white/20 text-white hover:bg-white/30 border-0"
            data-testid="add-accreditation"
          >
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>
        <div className="p-6">
          {(accreditations ?? []).length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              No accreditation records yet. Add one to start tracking.
            </p>
          ) : (
            <div className="space-y-3">
              {(accreditations ?? []).map((acc) => (
                <div
                  key={acc.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                  data-testid={`accreditation-row-${acc.id}`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">
                        {acc.program_name ?? "Unknown"} (
                        {acc.program_code ?? "—"})
                      </span>
                      <Badge
                        variant="outline"
                        className={STATUS_STYLES[acc.status] ?? ""}
                      >
                        {acc.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>{acc.accreditation_body}</span>
                      {acc.framework_version && (
                        <span>v{acc.framework_version}</span>
                      )}
                      {acc.accreditation_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(acc.accreditation_date), "MMM yyyy")}
                        </span>
                      )}
                      {acc.next_review_date && (
                        <span>
                          Next review:{" "}
                          {format(
                            new Date(acc.next_review_date),
                            "MMM d, yyyy"
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteId(acc.id)}
                    className="text-red-500 hover:text-red-700"
                    data-testid={`delete-accreditation-${acc.id}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Add Accreditation Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Program Accreditation</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="program_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Program</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-white">
                          <SelectValue placeholder="Select program" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {programs.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.code} — {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="accreditation_body"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Accreditation Body</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-white">
                          <SelectValue placeholder="Select body" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ACCREDITATION_BODIES.map((body) => (
                          <SelectItem key={body} value={body}>
                            {body}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="framework_version"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Framework Version (optional)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., 2024" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="accreditation_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Accreditation Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="next_review_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Next Review Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-white">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="expired">Expired</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95"
                >
                  {createMutation.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  Add Accreditation
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open: boolean) => !open && setDeleteId(null)}
        title="Delete Accreditation Record"
        description="Are you sure you want to delete this accreditation record? This action cannot be undone."
        onConfirm={handleDelete}
        isPending={deleteMutation.isPending}
      />
    </div>
  );
};

export default ProgramAccreditationManager;

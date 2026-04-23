import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import CQIStatusBadge from '@/components/shared/CQIStatusBadge';
import type { CQIStatus } from '@/components/shared/CQIStatusBadge';
import Shimmer from '@/components/shared/Shimmer';
import {
  useCQIPlans,
  useCreateCQIPlan,
  useUpdateCQIPlan,
  useDeleteCQIPlan,
} from '@/hooks/useCQIPlans';
import type { CQIActionPlan, CQIPlanStatus } from '@/hooks/useCQIPlans';
import { useAuth } from '@/hooks/useAuth';
import { usePrograms } from '@/hooks/usePrograms';
import { useSemesters } from '@/hooks/useSemesters';
import { usePLOs } from '@/hooks/usePLOs';
import {
  Plus,
  Pencil,
  Trash2,
  ClipboardCheck,
  Loader2,
  ArrowRight,
} from 'lucide-react';

// ─── Schema ──────────────────────────────────────────────────────────────────

const cqiPlanSchema = z.object({
  program_id: z.string().min(1, 'Program is required'),
  semester_id: z.string().min(1, 'Semester is required'),
  outcome_id: z.string().min(1, 'Outcome is required'),
  outcome_type: z.enum(['PLO', 'CLO']),
  baseline_attainment: z.coerce.number().min(0).max(100),
  target_attainment: z.coerce.number().min(0).max(100),
  action_description: z.string().min(1, 'Action description is required').max(2000),
  responsible_person: z.string().min(1, 'Responsible person is required').max(255),
});

type CQIPlanFormData = z.infer<typeof cqiPlanSchema>;

const STATUS_TRANSITIONS: Record<CQIPlanStatus, CQIPlanStatus | null> = {
  planned: 'in_progress',
  in_progress: 'completed',
  completed: 'evaluated',
  evaluated: null,
};

const STATUS_ACTION_LABELS: Record<CQIPlanStatus, string> = {
  planned: 'Start Implementation',
  in_progress: 'Mark Completed',
  completed: 'Evaluate',
  evaluated: '',
};

// ─── CQI Plan Form Dialog ────────────────────────────────────────────────────

interface CQIPlanFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan?: CQIActionPlan | null;
}

const CQIPlanFormDialog = ({ open, onOpenChange, plan }: CQIPlanFormDialogProps) => {
  const { user } = useAuth();
  const isEdit = !!plan;
  const createMutation = useCreateCQIPlan();
  const updateMutation = useUpdateCQIPlan();
  const { data: paginatedPrograms } = usePrograms();
  const programs = paginatedPrograms?.data ?? [];
  const { data: semesters } = useSemesters();

  const form = useForm<CQIPlanFormData>({
    resolver: zodResolver(cqiPlanSchema) as never,
    defaultValues: {
      program_id: plan?.program_id ?? '',
      semester_id: plan?.semester_id ?? '',
      outcome_id: plan?.outcome_id ?? '',
      outcome_type: (plan?.outcome_type as 'PLO' | 'CLO') ?? 'PLO',
      baseline_attainment: plan?.baseline_attainment ?? 0,
      target_attainment: plan?.target_attainment ?? 70,
      action_description: plan?.action_description ?? '',
      responsible_person: plan?.responsible_person ?? '',
    },
  });

  const selectedProgramId = useWatch({ control: form.control, name: 'program_id' });
  const { data: paginatedPLOs } = usePLOs(selectedProgramId || undefined);
  const outcomes = paginatedPLOs?.data ?? [];

  const onSubmit = (data: CQIPlanFormData) => {
    if (!user?.id) return;

    if (isEdit) {
      updateMutation.mutate(
        {
          id: plan.id,
          action_description: data.action_description,
          responsible_person: data.responsible_person,
          target_attainment: data.target_attainment,
          performedBy: user.id,
        },
        {
          onSuccess: () => {
            toast.success('CQI plan updated');
            onOpenChange(false);
            form.reset();
          },
          onError: (err) => toast.error(err.message),
        },
      );
    } else {
      createMutation.mutate(
        { ...data, performedBy: user.id },
        {
          onSuccess: () => {
            toast.success('CQI plan created');
            onOpenChange(false);
            form.reset();
          },
          onError: (err) => toast.error(err.message),
        },
      );
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit CQI Action Plan' : 'New CQI Action Plan'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {!isEdit && (
              <>
                <FormField
                  control={form.control}
                  name="program_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Program</FormLabel>
                      <FormControl>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger><SelectValue placeholder="Select program" /></SelectTrigger>
                          <SelectContent>
                            {programs.map((p) => (
                              <SelectItem key={p.id} value={p.id}>{p.code} — {p.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="semester_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Semester</FormLabel>
                      <FormControl>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger><SelectValue placeholder="Select semester" /></SelectTrigger>
                          <SelectContent>
                            {(semesters ?? []).map((s) => (
                              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="outcome_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Outcome Type</FormLabel>
                      <FormControl>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PLO">PLO</SelectItem>
                            <SelectItem value="CLO">CLO</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="outcome_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Outcome</FormLabel>
                      <FormControl>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger><SelectValue placeholder="Select outcome" /></SelectTrigger>
                          <SelectContent>
                            {outcomes.map((o) => (
                              <SelectItem key={o.id} value={o.id}>{o.title}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="baseline_attainment"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Baseline Attainment (%)</FormLabel>
                        <FormControl><Input type="number" min={0} max={100} {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="target_attainment"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Target Attainment (%)</FormLabel>
                        <FormControl><Input type="number" min={0} max={100} {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </>
            )}
            <FormField
              control={form.control}
              name="action_description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Action Description</FormLabel>
                  <FormControl><Textarea rows={3} {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="responsible_person"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Responsible Person</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {isEdit && (
              <FormField
                control={form.control}
                name="target_attainment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Target Attainment (%)</FormLabel>
                    <FormControl><Input type="number" min={0} max={100} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <Button
              type="submit"
              disabled={isPending}
              className="w-full bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95"
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? 'Update Plan' : 'Create Plan'}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

// ─── Evaluate Dialog ─────────────────────────────────────────────────────────

interface EvaluateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: CQIActionPlan;
}

const EvaluateDialog = ({ open, onOpenChange, plan }: EvaluateDialogProps) => {
  const { user } = useAuth();
  const updateMutation = useUpdateCQIPlan();
  const [resultAttainment, setResultAttainment] = useState<string>(
    plan.result_attainment?.toString() ?? '',
  );

  const handleEvaluate = () => {
    const value = Number(resultAttainment);
    if (isNaN(value) || value < 0 || value > 100) {
      toast.error('Result attainment must be between 0 and 100');
      return;
    }
    if (!user?.id) return;

    updateMutation.mutate(
      {
        id: plan.id,
        status: 'evaluated',
        result_attainment: value,
        performedBy: user.id,
      },
      {
        onSuccess: () => {
          toast.success('CQI plan evaluated');
          onOpenChange(false);
        },
        onError: (err) => toast.error(err.message),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Evaluate CQI Plan</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Baseline</p>
              <p className="font-bold">{plan.baseline_attainment}%</p>
            </div>
            <div>
              <p className="text-gray-500">Target</p>
              <p className="font-bold">{plan.target_attainment}%</p>
            </div>
          </div>
          <div>
            <label htmlFor="result-attainment" className="text-sm font-medium">
              Result Attainment (%)
            </label>
            <Input
              id="result-attainment"
              type="number"
              min={0}
              max={100}
              value={resultAttainment}
              onChange={(e) => setResultAttainment(e.target.value)}
              className="mt-1"
            />
          </div>
          <Button
            onClick={handleEvaluate}
            disabled={updateMutation.isPending}
            className="w-full bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95"
          >
            {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Submit Evaluation
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ─── Plan Row ────────────────────────────────────────────────────────────────

interface PlanRowProps {
  plan: CQIActionPlan;
  onEdit: (plan: CQIActionPlan) => void;
  onDelete: (plan: CQIActionPlan) => void;
  onAdvanceStatus: (plan: CQIActionPlan) => void;
  onEvaluate: (plan: CQIActionPlan) => void;
}

const PlanRow = ({ plan, onEdit, onDelete, onAdvanceStatus, onEvaluate }: PlanRowProps) => {
  const nextStatus = STATUS_TRANSITIONS[plan.status as CQIPlanStatus];
  const isEvaluateTransition = plan.status === 'completed';

  return (
    <div className="flex items-center justify-between p-4 border-b border-slate-100 last:border-b-0">
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <CQIStatusBadge status={plan.status as CQIStatus} />
          <span className="text-xs text-gray-400 uppercase">{plan.outcome_type}</span>
        </div>
        <p className="text-sm font-medium truncate">{plan.action_description}</p>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span>Baseline: {plan.baseline_attainment}%</span>
          <ArrowRight className="h-3 w-3" />
          <span>Target: {plan.target_attainment}%</span>
          {plan.result_attainment !== null && (
            <>
              <ArrowRight className="h-3 w-3" />
              <span className={plan.result_attainment >= plan.target_attainment ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                Result: {plan.result_attainment}%
              </span>
            </>
          )}
        </div>
        <p className="text-xs text-gray-400">Responsible: {plan.responsible_person}</p>
      </div>
      <div className="flex items-center gap-2 ms-4 shrink-0">
        {nextStatus && !isEvaluateTransition && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAdvanceStatus(plan)}
          >
            {STATUS_ACTION_LABELS[plan.status as CQIPlanStatus]}
          </Button>
        )}
        {isEvaluateTransition && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEvaluate(plan)}
          >
            Evaluate
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={() => onEdit(plan)}>
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onDelete(plan)}>
          <Trash2 className="h-4 w-4 text-red-500" />
        </Button>
      </div>
    </div>
  );
};

// ─── CQI Manager Page ────────────────────────────────────────────────────────

const CQIManager = () => {
  const { user } = useAuth();
  const { data: plans, isLoading } = useCQIPlans();
  const updateMutation = useUpdateCQIPlan();
  const deleteMutation = useDeleteCQIPlan();

  const [formOpen, setFormOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<CQIActionPlan | null>(null);
  const [deletingPlan, setDeletingPlan] = useState<CQIActionPlan | null>(null);
  const [evaluatingPlan, setEvaluatingPlan] = useState<CQIActionPlan | null>(null);

  const handleEdit = (plan: CQIActionPlan) => {
    setEditingPlan(plan);
    setFormOpen(true);
  };

  const handleAdvanceStatus = (plan: CQIActionPlan) => {
    const nextStatus = STATUS_TRANSITIONS[plan.status as CQIPlanStatus];
    if (!nextStatus || !user?.id) return;

    updateMutation.mutate(
      { id: plan.id, status: nextStatus, performedBy: user.id },
      {
        onSuccess: () => toast.success(`Status updated to ${nextStatus.replace('_', ' ')}`),
        onError: (err) => toast.error(err.message),
      },
    );
  };

  const handleDelete = () => {
    if (!deletingPlan || !user?.id) return;
    deleteMutation.mutate(
      { id: deletingPlan.id, performedBy: user.id },
      {
        onSuccess: () => {
          toast.success('CQI plan deleted');
          setDeletingPlan(null);
        },
        onError: (err) => toast.error(err.message),
      },
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">CQI Action Plans</h1>
        <Button
          onClick={() => { setEditingPlan(null); setFormOpen(true); }}
          className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95"
        >
          <Plus className="h-4 w-4" /> New Plan
        </Button>
      </div>

      <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
        <div
          className="px-6 py-4 flex items-center gap-2"
          style={{ background: 'linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)' }}
        >
          <ClipboardCheck className="h-5 w-5 text-white" />
          <h2 className="text-lg font-bold tracking-tight text-white">Action Plans</h2>
        </div>
        <div>
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Shimmer key={i} className="h-20 rounded-xl" />
              ))}
            </div>
          ) : !plans || plans.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">
              No CQI action plans yet. Create one to start closing the loop.
            </div>
          ) : (
            plans.map((plan) => (
              <PlanRow
                key={plan.id}
                plan={plan}
                onEdit={handleEdit}
                onDelete={setDeletingPlan}
                onAdvanceStatus={handleAdvanceStatus}
                onEvaluate={setEvaluatingPlan}
              />
            ))
          )}
        </div>
      </Card>

      {/* Form Dialog */}
      <CQIPlanFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingPlan(null);
        }}
        plan={editingPlan}
      />

      {/* Evaluate Dialog */}
      {evaluatingPlan && (
        <EvaluateDialog
          open={!!evaluatingPlan}
          onOpenChange={(open) => { if (!open) setEvaluatingPlan(null); }}
          plan={evaluatingPlan}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deletingPlan}
        onOpenChange={(open) => { if (!open) setDeletingPlan(null); }}
        title="Delete CQI Plan"
        description="Are you sure you want to delete this CQI action plan? This action cannot be undone."
        onConfirm={handleDelete}
        isPending={deleteMutation.isPending}
      />
    </div>
  );
};

export default CQIManager;

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  useFeeStructures,
  useCreateFeeStructure,
  type FeeStructure,
} from "@/hooks/useFees";
import { useAdminFeePayments } from "@/hooks/useAdminFeePayments";
import { usePrograms } from "@/hooks/usePrograms";
import { useSemesters } from "@/hooks/useSemesters";
import { formatCurrency } from "@/lib/i18nHelpers";
import {
  AdminSectionHeader,
  AdminStatCard,
  AdminStatusPill,
  adminCardClass,
  adminPageClass,
  adminTableClass,
} from "@/components/shared/AdminPrototypePrimitives";

const schema = z.object({
  program_id: z.string().uuid("Select a program"),
  semester_id: z.string().uuid("Select a semester"),
  fee_type: z.string().min(1, "Fee type is required"),
  amount: z.number().min(0),
  currency: z.string().min(1),
  due_date: z.string().min(1),
});

type FeeFormData = z.infer<typeof schema>;

const FeeManager = () => {
  const { data: fees = [], isLoading } = useFeeStructures();
  const payments = useAdminFeePayments();
  const { data: programsResult } = usePrograms({ pageSize: 100 });
  const { data: semesters = [] } = useSemesters();
  const createMutation = useCreateFeeStructure();
  const [showForm, setShowForm] = useState(true);
  const programs = useMemo(
    () => programsResult?.data ?? [],
    [programsResult?.data]
  );
  const form = useForm<FeeFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      program_id: "",
      semester_id: "",
      fee_type: "",
      amount: 0,
      currency: "QAR",
      due_date: "",
    },
  });
  const selectedProgramId = form.watch("program_id");
  const selectedSemesterId = form.watch("semester_id");
  const canSubmit = Boolean(selectedProgramId && selectedSemesterId);
  const paymentRows = payments.data ?? [];
  const programNames = useMemo(
    () => new Map(programs.map((program) => [program.id, program.name])),
    [programs]
  );
  const semesterNames = useMemo(
    () => new Map(semesters.map((semester) => [semester.id, semester.name])),
    [semesters]
  );
  const expected = fees.reduce((sum, fee) => sum + fee.amount, 0);
  const collected = paymentRows
    .filter((payment) => payment.status === "paid")
    .reduce((sum, payment) => sum + payment.amount_paid, 0);
  const overdue = paymentRows.filter((payment) => payment.status === "overdue");
  const collectionRate =
    expected > 0 ? Math.round((collected / expected) * 100) : 0;
  const paidByStructure = new Map<string, number>();
  for (const payment of paymentRows)
    paidByStructure.set(
      payment.fee_structure_id,
      (paidByStructure.get(payment.fee_structure_id) ?? 0) +
        (payment.status === "paid" ? payment.amount_paid : 0)
    );

  const submit = (data: FeeFormData) =>
    createMutation.mutate(data as Omit<FeeStructure, "id" | "created_at">, {
      onSuccess: () => {
        toast.success("Fee structure created");
        form.reset();
        setShowForm(false);
      },
      onError: (error) => toast.error(error.message),
    });

  return (
    <div className={adminPageClass}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-black tracking-tight text-slate-900">
            Fees Management
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Fee structures &amp; collection status, institution-wide.
          </p>
        </div>
        <Button
          type="button"
          variant="tactile"
          size="sm"
          onClick={() => setShowForm((open) => !open)}
        >
          <Plus className="size-4" /> New fee structure
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <AdminStatCard
          label="Expected"
          value={formatCurrency(expected, "en", "QAR")}
        />
        <AdminStatCard
          label="Collected"
          value={formatCurrency(collected, "en", "QAR")}
          tone="green"
        />
        <AdminStatCard
          label="Collection rate"
          value={`${collectionRate}%`}
          tone="teal"
        />
        <AdminStatCard
          label="Overdue accounts"
          value={overdue.length}
          tone="red"
        />
      </div>

      {showForm ? (
        <div className={`${adminCardClass} p-4`}>
          <AdminSectionHeader emoji="📋" title="New fee structure" />
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(submit)}
              className="mt-4 grid gap-3 md:grid-cols-2"
            >
              <FormField
                control={form.control}
                name="fee_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fee type</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Tuition, lab, library…" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="program_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Program</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a program" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {programs.map((program) => (
                          <SelectItem key={program.id} value={program.id}>
                            {program.name}
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
                name="semester_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Semester</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a semester" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {semesters.map((semester) => (
                          <SelectItem key={semester.id} value={semester.id}>
                            {semester.name} ({semester.code})
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
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        {...field}
                        onChange={(event) =>
                          field.onChange(Number(event.target.value))
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="due_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex items-end justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="tactile"
                  disabled={createMutation.isPending || !canSubmit}
                >
                  Create fee structure
                </Button>
              </div>
              {!canSubmit ? (
                <p className="text-xs text-amber-700 md:col-span-2">
                  Select a program and a semester to create a fee structure.
                </p>
              ) : null}
            </form>
          </Form>
        </div>
      ) : null}

      <div className={`${adminCardClass} overflow-hidden p-4`}>
        <AdminSectionHeader emoji="📊" title="Fee structures" />
        <div className="mt-3 overflow-x-auto">
          <table className={adminTableClass}>
            <thead>
              <tr className="border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-400">
                <th className="px-2 py-2 text-start">Programme</th>
                <th className="px-2 py-2 text-start">Term</th>
                <th className="px-2 py-2 text-start">Fee type</th>
                <th className="px-2 py-2 text-start">Amount</th>
                <th className="px-2 py-2 text-start">Due</th>
                <th className="px-2 py-2 text-start">Paid / total</th>
                <th className="px-2 py-2 text-start">Collection</th>
              </tr>
            </thead>
            <tbody>
              {fees.map((fee) => {
                const paid = paidByStructure.get(fee.id) ?? 0;
                const rate =
                  fee.amount > 0
                    ? Math.min(100, Math.round((paid / fee.amount) * 100))
                    : 0;
                return (
                  <tr key={fee.id} className="border-b border-slate-100">
                    <td className="px-2 py-3 font-bold text-slate-900">
                      {programNames.get(fee.program_id) ?? fee.program_id}
                    </td>
                    <td className="px-2 py-3 text-slate-500">
                      {semesterNames.get(fee.semester_id) ?? fee.semester_id}
                    </td>
                    <td className="px-2 py-3 text-slate-500">{fee.fee_type}</td>
                    <td className="px-2 py-3 text-slate-600">
                      {formatCurrency(fee.amount, "en", fee.currency)}
                    </td>
                    <td className="px-2 py-3 text-slate-500">{fee.due_date}</td>
                    <td className="px-2 py-3 text-slate-500">
                      {formatCurrency(paid, "en", fee.currency)} /{" "}
                      {formatCurrency(fee.amount, "en", fee.currency)}
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-16 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full bg-teal-500"
                            style={{ width: `${rate}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-teal-700">
                          {rate}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!isLoading && fees.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">
            No fee structures yet.
          </p>
        ) : null}
      </div>

      <div className={`${adminCardClass} p-4`}>
        <AdminSectionHeader
          emoji="⚠️"
          title="Overdue accounts"
          action={
            <AdminStatusPill tone={overdue.length > 0 ? "red" : "green"}>
              {overdue.length} accounts
            </AdminStatusPill>
          }
        />
        <div className="mt-3 divide-y divide-slate-100">
          {overdue.slice(0, 10).map((payment) => (
            <div key={payment.id} className="flex items-center gap-3 py-3">
              <span className="inline-flex size-9 items-center justify-center rounded-full bg-red-50 text-sm font-bold text-red-700">
                !
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-900">
                  Student account
                </p>
                <p className="text-[11px] text-slate-500">
                  {payment.student_id.slice(0, 8)} ·{" "}
                  {formatCurrency(payment.amount_paid, "en", "QAR")} overdue
                  since {payment.payment_date}
                </p>
              </div>
            </div>
          ))}
          {overdue.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              No overdue payment records.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default FeeManager;

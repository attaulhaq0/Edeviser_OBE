import { z } from "zod";

export const feeStructureSchema = z.object({
  program_id: z.uuid(),
  semester_id: z.uuid(),
  fee_type: z.enum(["tuition", "lab", "library", "exam"]),
  amount: z.number().positive("Amount must be positive"),
  currency: z.string().min(1).max(10).default("PKR"),
  due_date: z.iso.date(),
});

export const feePaymentSchema = z.object({
  student_id: z.uuid(),
  fee_structure_id: z.uuid(),
  amount_paid: z.number().min(0),
  payment_date: z.iso.date(),
  payment_method: z.string().min(1),
  receipt_number: z.string().min(1),
  status: z.enum(["pending", "paid", "overdue", "waived"]),
});

export type FeeStructureFormData = z.infer<typeof feeStructureSchema>;
export type FeePaymentFormData = z.infer<typeof feePaymentSchema>;

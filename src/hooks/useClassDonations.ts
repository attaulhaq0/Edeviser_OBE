// =============================================================================
// useClassDonations — Donation campaigns, contribution mutation
// Task 20.7
// =============================================================================

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/queryKeys";
import { toast } from "sonner";

export interface ClassDonation {
  id: string;
  course_id: string;
  resource_description: string;
  goal_amount: number;
  current_total: number;
  status: "active" | "completed" | "cancelled";
  created_at: string;
}

export const useClassDonations = (courseId?: string) => {
  return useQuery({
    queryKey: queryKeys.donations.list({ courseId }),
    queryFn: async (): Promise<ClassDonation[]> => {
      let query = supabase
        .from("class_donations")
        .select("*")
        .order("created_at", { ascending: false });

      if (courseId) {
        query = query.eq("course_id", courseId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as ClassDonation[];
    },
  });
};

export const useContributeToDonation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      donationId,
      studentId,
      xpAmount,
    }: {
      donationId: string;
      studentId: string;
      xpAmount: number;
    }) => {
      // Insert contribution
      const { data, error } = await supabase
        .from("class_donation_contributions")
        .insert({
          donation_id: donationId,
          student_id: studentId,
          xp_amount: xpAmount,
        } as never)
        .select()
        .single();
      if (error) throw error;

      // Insert corresponding xp_purchase for the XP sink
      await supabase.from("xp_purchases").insert({
        student_id: studentId,
        item_id: null as unknown as string,
        xp_cost: xpAmount,
        status: "consumed",
        purchased_at: new Date().toISOString(),
        metadata: { type: "class_donation", donation_id: donationId },
      } as never);

      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.donations.all });
      qc.invalidateQueries({ queryKey: queryKeys.marketplace.all });
      toast.success("Donation contributed!");
    },
    onError: (err) => toast.error((err as Error).message),
  });
};

export const useCreateClassDonation = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      courseId: string;
      resourceDescription: string;
      goalAmount: number;
      institutionId: string;
    }) => {
      const { data, error } = await supabase
        .from("class_donations")
        .insert({
          course_id: input.courseId,
          resource_description: input.resourceDescription,
          goal_amount: input.goalAmount,
          institution_id: input.institutionId,
          current_total: 0,
          status: "active",
        } as never)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.donations.all });
      toast.success("Donation campaign created");
    },
    onError: (err) => toast.error((err as Error).message),
  });
};

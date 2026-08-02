import type { PostgrestQueryBuilder } from "@supabase/postgrest-js";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database";

export interface StaffProfileUpdate {
  department: string | null;
  designation: string | null;
  academic_rank: string | null;
  highest_degree: string | null;
  years_experience: number | null;
  phone: string | null;
  office_location: string | null;
  office_hours: string | null;
  bio: string | null;
}

type ProfileTable = {
  Row: Record<string, unknown> & { id: string };
  Insert: Record<string, unknown>;
  Update: Partial<StaffProfileUpdate>;
  Relationships: [];
};

interface ProfileSchema {
  Tables: { profiles: ProfileTable };
  Views: Record<string, never>;
  Functions: Record<string, never>;
}

type ProfileQueryBuilder = PostgrestQueryBuilder<
  { PostgrestVersion: Database["__InternalSupabase"]["PostgrestVersion"] },
  ProfileSchema,
  ProfileTable,
  "profiles"
>;

const profileFrom = supabase.from as unknown as (
  relation: "profiles"
) => ProfileQueryBuilder;

/** Additive typed contract for staff profile columns awaiting generated types refresh. */
export const profileSupabase = { from: profileFrom };

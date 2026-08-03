import type { PostgrestQueryBuilder } from "@supabase/postgrest-js";

import type {
  GovernanceActionPolicy,
  GovernanceAutonomyLevel,
} from "@/lib/aiGovernancePolicy";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/types/database";

export type AIGovernancePolicyRow = Record<string, unknown> & {
  action_key: GovernanceActionPolicy["actionKey"];
  level: GovernanceAutonomyLevel;
  hard_cap: GovernanceAutonomyLevel | null;
  sensitive: boolean;
  updated_at: string | null;
};

type AIGovernancePolicyInsert = Record<string, unknown> &
  AIGovernancePolicyRow & {
    institution_id: string;
    updated_by: string | null;
  };

type AIGovernancePolicyTable = {
  Row: Record<string, unknown> & {
    action_key: GovernanceActionPolicy["actionKey"];
    level: GovernanceAutonomyLevel;
    hard_cap: GovernanceAutonomyLevel | null;
    sensitive: boolean;
    updated_at: string | null;
    institution_id: string;
    updated_by: string | null;
  };
  Insert: AIGovernancePolicyInsert;
  Update: Partial<AIGovernancePolicyInsert>;
  Relationships: [];
};

interface AIGovernanceSchema {
  Tables: {
    ai_governance_policies: AIGovernancePolicyTable;
  };
  Views: Record<string, never>;
  Functions: Record<string, never>;
}

type AIGovernanceQueryBuilder = PostgrestQueryBuilder<
  { PostgrestVersion: Database["__InternalSupabase"]["PostgrestVersion"] },
  AIGovernanceSchema,
  AIGovernancePolicyTable,
  "ai_governance_policies"
>;

/**
 * The generated database contract intentionally remains untouched. This
 * additive contract keeps the MCP-created governance table typed until the
 * next generated-types refresh.
 */
const governanceFrom = supabase.from as unknown as (
  relation: "ai_governance_policies"
) => AIGovernanceQueryBuilder;

export const aiGovernanceSupabase = {
  from: governanceFrom,
};

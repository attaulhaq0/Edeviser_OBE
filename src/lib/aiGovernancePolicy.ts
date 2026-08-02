export type GovernanceAutonomyLevel = "A0" | "A1" | "A2" | "A3";

export interface GovernanceActionPolicy {
  actionKey:
    | "showInsights"
    | "suggestAction"
    | "scheduleReviews"
    | "reorderPlan"
    | "sendStudentNudge"
    | "draftTeacherFeedback"
    | "generateEvidencePack"
    | "sendParentCommunication"
    | "assignGrade"
    | "publishContent";
  level: GovernanceAutonomyLevel;
  hardCap: GovernanceAutonomyLevel | null;
  sensitive: boolean;
}

export interface InstitutionGovernancePolicy extends GovernanceActionPolicy {
  isInstitutionOverride: boolean;
  updatedAt: string | null;
}

/**
 * Platform policy guardrails represented in the approved prototype. These
 * values are also the defaults used until an institution saves an override.
 */
export const AI_GOVERNANCE_ACTION_POLICIES: GovernanceActionPolicy[] = [
  {
    actionKey: "showInsights",
    level: "A0",
    hardCap: null,
    sensitive: false,
  },
  {
    actionKey: "suggestAction",
    level: "A1",
    hardCap: null,
    sensitive: false,
  },
  {
    actionKey: "scheduleReviews",
    level: "A2",
    hardCap: "A2",
    sensitive: false,
  },
  {
    actionKey: "reorderPlan",
    level: "A2",
    hardCap: "A2",
    sensitive: false,
  },
  {
    actionKey: "sendStudentNudge",
    level: "A2",
    hardCap: "A2",
    sensitive: true,
  },
  {
    actionKey: "draftTeacherFeedback",
    level: "A1",
    hardCap: "A2",
    sensitive: true,
  },
  {
    actionKey: "generateEvidencePack",
    level: "A2",
    hardCap: "A2",
    sensitive: true,
  },
  {
    actionKey: "sendParentCommunication",
    level: "A2",
    hardCap: "A2",
    sensitive: true,
  },
  {
    actionKey: "assignGrade",
    level: "A2",
    hardCap: "A2",
    sensitive: true,
  },
  {
    actionKey: "publishContent",
    level: "A2",
    hardCap: "A2",
    sensitive: true,
  },
];

export const autonomyBadgeClass = (level: GovernanceAutonomyLevel) => {
  switch (level) {
    case "A0":
    case "A1":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "A2":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "A3":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
};

export const autonomyRank = (level: GovernanceAutonomyLevel): number =>
  Number(level.slice(1));

export const mergeInstitutionGovernancePolicies = (
  rows: Array<{
    action_key: GovernanceActionPolicy["actionKey"];
    level: GovernanceAutonomyLevel;
    hard_cap: GovernanceAutonomyLevel | null;
    sensitive: boolean;
    updated_at: string | null;
  }>
): InstitutionGovernancePolicy[] => {
  const overrides = new Map(rows.map((row) => [row.action_key, row]));
  return AI_GOVERNANCE_ACTION_POLICIES.map((platformPolicy) => {
    const override = overrides.get(platformPolicy.actionKey);
    return {
      ...platformPolicy,
      ...(override
        ? {
            level: override.level,
            hardCap: override.hard_cap,
            sensitive: override.sensitive,
            isInstitutionOverride: true,
            updatedAt: override.updated_at,
          }
        : {
            isInstitutionOverride: false,
            updatedAt: null,
          }),
    };
  });
};

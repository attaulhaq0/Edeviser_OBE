export type EffectiveChallengeStatus =
  | "active"
  | "upcoming"
  | "completed"
  | "cancelled";

interface ChallengeLifecycleInput {
  status: string;
  start_date: string;
  end_date: string;
}

export const getEffectiveChallengeStatus = (
  challenge: ChallengeLifecycleInput,
  now: Date = new Date()
): EffectiveChallengeStatus => {
  const startsAt = new Date(challenge.start_date);
  const endsAt = new Date(challenge.end_date);

  if (challenge.status === "cancelled") {
    return "cancelled";
  }

  if (challenge.status === "ended" || endsAt.getTime() < now.getTime()) {
    return "completed";
  }

  if (challenge.status === "draft" || startsAt.getTime() > now.getTime()) {
    return "upcoming";
  }

  return "active";
};

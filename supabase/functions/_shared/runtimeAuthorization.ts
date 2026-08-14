export const extractBearerToken = (authorization: string): string | null => {
  const match = /^Bearer ([^\s]+)$/.exec(authorization);
  return match?.[1] ?? null;
};

export const hasManagedServerAuthorization = (params: {
  authorization: string;
  internalAuthorization?: string | null;
  managedServerKey: string;
}): boolean => {
  if (params.managedServerKey.length === 0) return false;

  return (
    extractBearerToken(params.authorization) === params.managedServerKey ||
    params.internalAuthorization === params.managedServerKey
  );
};

export const hasCronOrManagedServerAuthorization = (params: {
  authorization: string;
  cronSecret?: string | null;
  expectedCronSecret?: string | null;
  managedServerKey: string;
}): boolean =>
  hasManagedServerAuthorization({
    authorization: params.authorization,
    managedServerKey: params.managedServerKey,
  }) ||
  Boolean(
    params.expectedCronSecret && params.cronSecret === params.expectedCronSecret
  );

export type CronAuthorizationDecision =
  | { authorized: true }
  | { authorized: false; status: 401 };

export const authorizeCronOrManagedServer = (
  params: Parameters<typeof hasCronOrManagedServerAuthorization>[0]
): CronAuthorizationDecision =>
  hasCronOrManagedServerAuthorization(params)
    ? { authorized: true }
    : { authorized: false, status: 401 };

export const fixedStudentSelfXp = (source: string): number | null => {
  if (source === "login") return 10;
  if (source === "journal") return 20;
  return null;
};

export const canProcessBadgesForStudent = (params: {
  isManagedServer: boolean;
  callerId: string | null;
  studentId: string;
}): boolean =>
  params.isManagedServer ||
  (params.callerId !== null && params.callerId === params.studentId);

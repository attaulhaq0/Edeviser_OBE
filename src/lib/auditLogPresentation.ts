export const truncateAuditIdentifier = (
  value: string | null | undefined,
  length: number = 12
): string => {
  if (!value) return "—";
  return value.length > length ? `${value.slice(0, length)}…` : value;
};

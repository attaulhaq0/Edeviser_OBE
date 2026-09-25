/** Existing admin PLO bands; not an institution-specific grade-scale conversion. */
export type PloBand =
  | "excellent"
  | "satisfactory"
  | "developing"
  | "notYet"
  | "unmeasured";
export const PLO_BAND_LIMITS = {
  excellent: 85,
  satisfactory: 70,
  developing: 50,
} as const;

/** Classify the native reported percentage BEFORE rounding it for display. */
export const classifyPloAttainment = (value: unknown): PloBand => {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < 0 ||
    value > 100
  )
    return "unmeasured";
  if (value >= PLO_BAND_LIMITS.excellent) return "excellent";
  if (value >= PLO_BAND_LIMITS.satisfactory) return "satisfactory";
  if (value >= PLO_BAND_LIMITS.developing) return "developing";
  return "notYet";
};

/** Do not convert malformed or unsupported paint bands into a false failing cell. */
export const safePloBand = (value: unknown, declared: unknown): PloBand => {
  if (classifyPloAttainment(value) === "unmeasured") return "unmeasured";
  return declared === "excellent" ||
    declared === "satisfactory" ||
    declared === "developing" ||
    declared === "notYet"
    ? declared
    : "unmeasured";
};

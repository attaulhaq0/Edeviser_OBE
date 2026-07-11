// Shared attainment → Tailwind text-color mapping for redesigned dashboards
// (spec: ui-prototype-migration, P2). Mirrors the OBE attainment bands used by
// MasteryRing (Excellent ≥85 green, Satisfactory ≥70 brand-blue, Developing
// ≥50 amber, Not Yet <50 red); 0 falls back to the deep brand blue so an
// empty/unknown value never reads as "failing".

export const attainmentValueClass = (v: number): string => {
  if (v >= 85) return "text-green-600";
  if (v >= 70) return "text-sky-700";
  if (v >= 50) return "text-amber-600";
  if (v > 0) return "text-red-600";
  return "text-sky-700";
};

// Task 117.3: Coverage Heatmap data utility

export interface HeatmapCell {
  clo_id: string;
  course_id: string;
  evidence_count: number;
  avg_attainment: number;
}

export interface HeatmapMatrix {
  clo_ids: string[];
  course_ids: string[];
  clo_labels: Record<string, string>;
  course_labels: Record<string, string>;
  cells: Map<string, HeatmapCell>;
}

const cellKey = (cloId: string, courseId: string) => `${cloId}:${courseId}`;

export const buildHeatmapMatrix = (
  clos: Array<{ id: string; title: string }>,
  courses: Array<{ id: string; name: string }>,
  evidence: Array<{ clo_id: string; course_id: string; score_percent: number }>
): HeatmapMatrix => {
  const clo_ids = clos.map((c) => c.id);
  const course_ids = courses.map((c) => c.id);
  const clo_labels: Record<string, string> = {};
  const course_labels: Record<string, string> = {};

  clos.forEach((c) => {
    clo_labels[c.id] = c.title;
  });
  courses.forEach((c) => {
    course_labels[c.id] = c.name;
  });

  const cells = new Map<string, HeatmapCell>();

  for (const e of evidence) {
    const key = cellKey(e.clo_id, e.course_id);
    const existing = cells.get(key);
    if (existing) {
      const newCount = existing.evidence_count + 1;
      existing.avg_attainment =
        (existing.avg_attainment * existing.evidence_count + e.score_percent) /
        newCount;
      existing.evidence_count = newCount;
    } else {
      cells.set(key, {
        clo_id: e.clo_id,
        course_id: e.course_id,
        evidence_count: 1,
        avg_attainment: e.score_percent,
      });
    }
  }

  return { clo_ids, course_ids, clo_labels, course_labels, cells };
};

export const getEvidenceCountColor = (count: number): string => {
  if (count === 0) return "#ffffff";
  if (count <= 2) return "#dbeafe";
  if (count <= 5) return "#93c5fd";
  return "#2563eb";
};

export const getAttainmentColor = (score: number): string => {
  if (score >= 85) return "#dcfce7";
  if (score >= 70) return "#dbeafe";
  if (score >= 50) return "#fef9c3";
  return "#fee2e2";
};

/**
 * Returns an accessible text color (near-black or white) for a given cell
 * background hex, so the number stays legible on both the light cells and the
 * darker evidence-count cells (WCAG 1.4.3 — 4.5:1). Uses WCAG relative
 * luminance; the 0.35 threshold keeps near-black text on all light/mid cells
 * and flips to white only on the darkest cell (evidence 6+, #2563eb).
 */
export const getHeatmapCellTextColor = (bgHex: string): string => {
  const hex = bgHex.replace("#", "");
  if (hex.length !== 6) return "#0f172a";
  const toLinear = (channel: number): number => {
    const s = channel / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const r = toLinear(parseInt(hex.slice(0, 2), 16));
  const g = toLinear(parseInt(hex.slice(2, 4), 16));
  const b = toLinear(parseInt(hex.slice(4, 6), 16));
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.35 ? "#0f172a" : "#ffffff";
};

/** Legend entry: a swatch color plus its human label, per color mode. */
export interface HeatmapLegendEntry {
  color: string;
  label: string;
}

/** Legend entries for the evidence-count color scale (light → dark blue). */
export const EVIDENCE_LEGEND: HeatmapLegendEntry[] = [
  { color: "#ffffff", label: "None" },
  { color: "#dbeafe", label: "1–2" },
  { color: "#93c5fd", label: "3–5" },
  { color: "#2563eb", label: "6+" },
];

/** Legend entries for the attainment color scale (threshold bands). */
export const ATTAINMENT_LEGEND: HeatmapLegendEntry[] = [
  { color: "#dcfce7", label: "Excellent ≥85%" },
  { color: "#dbeafe", label: "Satisfactory 70–84%" },
  { color: "#fef9c3", label: "Developing 50–69%" },
  { color: "#fee2e2", label: "Not Yet <50%" },
];

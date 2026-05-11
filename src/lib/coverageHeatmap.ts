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

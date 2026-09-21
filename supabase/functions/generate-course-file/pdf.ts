import { jsPDF } from "https://esm.sh/jspdf@2";
import autoTable from "https://esm.sh/jspdf-autotable@3";
import type { CourseFileReport } from "./contracts.ts";

/** English normalized snapshot only. Native scales/versions and Arabic typography need a separate renderer contract. */
export function renderCourseFile(report: CourseFileReport): Uint8Array {
  const doc = new jsPDF() as jsPDF & { lastAutoTable?: { finalY: number } };
  let y = 18;
  const text = (value: string, size = 9): void => {
    doc.setFontSize(size);
    const lines: string[] = doc.splitTextToSize(value, 180);
    if (y + lines.length * 5 > 275) {
      doc.addPage();
      y = 18;
    }
    doc.text(lines, 14, y);
    y += lines.length * 5 + 4;
  };
  const table = (title: string, head: string[], body: string[][]): void => {
    text(title, 12);
    if (!body.length) {
      text("No records available in the authorized scope.");
      return;
    }
    autoTable(doc, {
      startY: y,
      head: [head],
      body,
      theme: "grid",
      headStyles: { fillColor: [20, 120, 115] },
      styles: { fontSize: 8 },
      margin: { bottom: 20 },
    });
    y = (doc.lastAutoTable?.finalY ?? y) + 12;
  };
  text("Course File - Normalized Snapshot", 18);
  text(`${report.course.code} - ${report.course.name}`, 12);
  text(`Course offering semester: ${report.semester.name}`);
  text(`Generated: ${report.generatedAt}`);
  text(
    "Generic internal summary, not an IB authorization report, accreditation approval, full syllabus or native assessment evidence pack. Current course records are shown; this is not a historical semester reconstruction."
  );
  table(
    "1. Course Learning Outcomes",
    ["CLO", "Bloom's level"],
    report.clos.map((c) => [c.title, c.blooms_level ?? "Not recorded"])
  );
  table(
    "2. Canonical PLO to CLO mappings",
    ["Parent PLO", "Child CLO", "Weight"],
    report.mappings.map((m) => [
      m.plo_title,
      m.clo_title,
      `${(m.weight * 100).toFixed(1)}%`,
    ])
  );
  table(
    "3. Assignment inventory (not complete instruments)",
    ["Assignment", "Configured marks", "Linked CLOs"],
    report.assignments.map((a) => [
      a.title,
      String(a.total_marks),
      a.clo_titles || "Not recorded",
    ])
  );
  text(
    "Grade statistics use grades.score_percent (stored normalized percent), one current grade per submission, including unreleased grades visible to the authorized actor. No learner work files or native criteria/band/component results are embedded."
  );
  table(
    "4. Normalized grade statistics (not sample work)",
    ["Assignment", "Count", "Highest %", "Mean %", "Lowest %"],
    report.grades.map((g) => [
      g.assignment_title,
      String(g.count),
      g.best.toFixed(1),
      g.avg.toFixed(1),
      g.worst.toFixed(1),
    ])
  );
  text(
    "Attainment is the unweighted mean of current student_course cache rows with sample_count > 0 for this course. Count is learners with evidence, not enrollment; missing evidence is not zero. No attainment bands or native mastery claims are inferred."
  );
  table(
    "5. Current normalized CLO attainment",
    ["CLO", "Learners with evidence", "Mean %"],
    report.attainment.map((a) => [
      a.clo_title,
      String(a.count),
      a.avg_percent === null ? "No evidence" : a.avg_percent.toFixed(1),
    ])
  );
  text("6. Teacher reflection", 12);
  text(
    "Not included. Personal journals are private; no explicit consented teacher course/term reflection contract is connected to this generator."
  );
  table(
    "7. Recorded CQI actions for course CLOs and semester",
    ["CLO", "Recorded root cause", "Action", "Status"],
    report.cqi.map((c) => [c.label, c.gap, c.actions, c.status])
  );
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(
      `Normalized course snapshot | Page ${page} of ${pages}`,
      105,
      287,
      { align: "center" }
    );
  }
  return new Uint8Array(doc.output("arraybuffer"));
}

// Teacher prototype source of truth. Static by design; no network or clock data.
window.EDEVISER_TEACHER = Object.freeze({
  teacher: { name: 'Prof. Ahmed', department: 'Computer Science', classes: 4, autonomy: 'A2 · Suggest & Draft' },
  sarah: { name: 'Sarah Ahmed', course: 'Database Design', code: 'CS301', progress: 72, outcome: 'Normalization · CLO 3', mastery: 62, status: 'Developing', assignment: 'Assignment 3', task: 'Normalize a Schema', due: 'Friday', streak: 12, reviewCards: 5 },
  attention: { count: 3, handoffs: 3, grading: 12, curriculumDrafts: 1 },
  handoff: { consented: true, status: 'pending', shared: ['current question', 'course', 'CLO context', 'relevant tutor summary'], withheld: ['unrelated conversations', 'private journal', 'other course activity'] }
});

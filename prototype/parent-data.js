/* Deterministic Parent prototype data and state. No network, time, or randomness. */
(function () {
  "use strict";

  const data = {
    parent: { name: "Nadia Hassan", displayName: "Nadia (Parent)", firstName: "Nadia" },
    student: { name: "Sarah Ahmed", firstName: "Sarah", initials: "SA", level: 4, xp: 750, xpTarget: 1000 },
    primaryCourse: { code: "CS301", name: "Database Design", progress: 72, module: 5, modules: 8 },
    focus: { name: "Normalization", code: "CLO 3", mastery: 62, interpretation: "Developing" },
    learningPath: { level: 3, stage: "Apply", mastery: 65, concepts: 2, conceptsTarget: 5, improvement: 18 },
    assignment: { name: "Assignment 3", dashboardName: "Database Assignment 3", topic: "Normalize a Schema", due: "Friday", dueInDays: 2, xp: 25, minutes: 30 },
    dailyReview: { name: "Daily Review", due: "Today", cards: 5 },
    quiz: { name: "Web Dev Quiz", due: "Saturday", dueInDays: 3 },
    habits: { streakDays: 12, studyDays: 4, studyDaysTarget: 5, rhythm: "Consistent", studyWindowMinutes: 25 },
    wellbeing: { balance: "Healthy", state: "Good", summary: "No concerning pattern shown this week" },
    courses: [
      { name: "Database Design", progress: 72, module: 5, modules: 8 },
      { name: "Web Development", progress: 45, module: 3, modules: 7 },
      { name: "AI Fundamentals", progress: 88, module: 7, modules: 8 },
      { name: "Software Engineering", progress: 30, module: 2, modules: 6 },
      { name: "Statistics", progress: 58, module: 4, modules: 9 }
    ],
    privacy: {
      visible: ["Learning summaries", "Upcoming deadlines", "Approved wellbeing context", "Teacher communication"],
      private: ["Tutor conversations", "Journal entries", "Teacher-only notes"]
    }
  };

  const initialState = {
    parentSupportSuggestion: "ready",
    parentReminderStatus: "not_requested",
    parentTeacherDraft: "prepared",
    parentApprovalStatus: "awaiting_parent",
    parentSupportCompleted: false,
    parentLastAction: "none"
  };

  const key = "edeviser-parent-demo-v1";
  const readState = () => {
    try {
      const stored = JSON.parse(localStorage.getItem(key) || "null");
      return stored && typeof stored === "object" ? { ...initialState, ...stored } : { ...initialState };
    } catch (error) {
      return { ...initialState };
    }
  };
  const writeState = (next) => {
    const state = { ...readState(), ...next };
    try { localStorage.setItem(key, JSON.stringify(state)); } catch (error) { /* deterministic in-memory fallback */ }
    return state;
  };

  window.EDEVISER_PARENT = Object.freeze(data);
  window.EDEVISER_PARENT_STATE = Object.freeze({ initial: Object.freeze(initialState), read: readState, write: writeState, reset: () => writeState(initialState) });
})();

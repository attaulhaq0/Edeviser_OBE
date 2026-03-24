const createKeys = <T extends string>(entity: T) => ({
  all: [entity] as const,
  lists: () => [...createKeys(entity).all, 'list'] as const,
  list: (filters: Record<string, unknown>) =>
    [...createKeys(entity).lists(), filters] as const,
  details: () => [...createKeys(entity).all, 'detail'] as const,
  detail: (id: string) => [...createKeys(entity).details(), id] as const,
})

// ─── Core ────────────────────────────────────────────────────────────────────
const users = createKeys('users')
const profiles = createKeys('profiles')
const institutions = createKeys('institutions')

// ─── OBE ─────────────────────────────────────────────────────────────────────
const programs = createKeys('programs')
const courses = createKeys('courses')
const ilos = createKeys('ilos')
const plos = createKeys('plos')
const clos = createKeys('clos')
const outcomeMappings = createKeys('outcomeMappings')
const rubrics = createKeys('rubrics')
const assignments = createKeys('assignments')
const enrollments = createKeys('enrollments')
const submissions = createKeys('submissions')
const grades = createKeys('grades')
const evidence = createKeys('evidence')
const outcomeAttainment = createKeys('outcomeAttainment')

// ─── Gamification ────────────────────────────────────────────────────────────
const xpTransactions = createKeys('xpTransactions')
const studentGamification = {
  ...createKeys('studentGamification'),
  sabbatical: (studentId: string) =>
    ['studentGamification', 'sabbatical', studentId] as const,
};
const badges = createKeys('badges')
const leaderboard = createKeys('leaderboard')
const journal = createKeys('journal')
const habitLogs = createKeys('habitLogs')

const studentHabitLevel = {
  all: ['studentHabitLevel'] as const,
  detail: (studentId: string) => ['studentHabitLevel', studentId] as const,
}
const bonusXPEvents = createKeys('bonusXPEvents')
const streakFreezes = createKeys('streakFreezes')

// ─── Notifications ───────────────────────────────────────────────────────────
const notifications = createKeys('notifications')
const emailPreferences = createKeys('emailPreferences')

// ─── AI Co-Pilot ─────────────────────────────────────────────────────────────
const aiSuggestions = createKeys('aiSuggestions')
const atRiskPredictions = createKeys('atRiskPredictions')
const feedbackDrafts = createKeys('feedbackDrafts')
const aiFeedback = createKeys('aiFeedback')

// ─── Institutional Management ────────────────────────────────────────────────
const semesters = createKeys('semesters')
const departments = createKeys('departments')
const courseSections = createKeys('courseSections')
const surveys = createKeys('surveys')
const surveyQuestions = createKeys('surveyQuestions')
const surveyResponses = createKeys('surveyResponses')
const cqiPlans = createKeys('cqiPlans')
const institutionSettings = createKeys('institutionSettings')
const programAccreditations = createKeys('programAccreditations')
const announcements = createKeys('announcements')
const courseModules = createKeys('courseModules')
const courseMaterials = createKeys('courseMaterials')
const discussionThreads = createKeys('discussionThreads')
const discussionReplies = createKeys('discussionReplies')
const classSessions = createKeys('classSessions')
const attendanceRecords = createKeys('attendanceRecords')
const quizzes = createKeys('quizzes')
const quizQuestions = createKeys('quizQuestions')
const quizAttempts = createKeys('quizAttempts')
const gradeCategories = createKeys('gradeCategories')
const gradebook = createKeys('gradebook')
const timetableSlots = createKeys('timetableSlots')
const academicCalendarEvents = createKeys('academicCalendarEvents')
const parentStudentLinks = createKeys('parentStudentLinks')
const feeStructures = createKeys('feeStructures')
const feePayments = createKeys('feePayments')
const transcripts = createKeys('transcripts')
const courseFiles = createKeys('courseFiles')

// ─── Dashboards ──────────────────────────────────────────────────────────────
const adminDashboard = createKeys('adminDashboard')
const coordinatorDashboard = createKeys('coordinatorDashboard')
const studentDashboard = createKeys('studentDashboard')
const parentDashboard = createKeys('parentDashboard')
const teacherDashboard = createKeys('teacherDashboard')

// ─── Reports ─────────────────────────────────────────────────────────────────
const accreditationReports = createKeys('accreditationReports')

// ─── Production ──────────────────────────────────────────────────────────────
const calendarEvents = createKeys('calendarEvents')
const globalSearch = createKeys('globalSearch')
const notificationPreferences = createKeys('notificationPreferences')
const sessions = createKeys('sessions')
const auditLogs = createKeys('auditLogs')

// ─── Heatmap & Wellness ──────────────────────────────────────────────────────
const heatmap = {
  all: ['heatmap'] as const,
  data: (studentId: string, start: string, end: string, filter?: string) =>
    ['heatmap', studentId, start, end, filter] as const,
  summary: (studentId: string) => ['heatmap', 'summary', studentId] as const,
  levelHistory: (studentId: string, start: string, end: string) =>
    ['heatmap', 'levelHistory', studentId, start, end] as const,
}

const wellness = {
  all: ['wellness'] as const,
  preferences: (studentId: string) => ['wellness', 'preferences', studentId] as const,
  logs: (studentId: string, date: string) => ['wellness', 'logs', studentId, date] as const,
}

const habitAnalytics = {
  all: ['habitAnalytics'] as const,
  correlations: (studentId: string) => ['habitAnalytics', 'correlations', studentId] as const,
}

// ─── Adaptive Quiz ────────────────────────────────────────────────────────────
const questionBank = createKeys('questionBank')
const questionAnalytics = createKeys('questionAnalytics')
const quizGeneration = createKeys('quizGeneration')
const reviewQueue = createKeys('reviewQueue')
const quizCLOCorrelation = createKeys('quizCLOCorrelation')

// ─── Practice Mode ─────────────────────────────────────────────────────────────
const practiceMode = {
  all: ['practiceMode'] as const,
  config: (quizId: string) => ['practiceMode', quizId] as const,
  attempts: (quizId: string, studentId?: string) =>
    studentId
      ? (['practiceAttempts', quizId, studentId] as const)
      : (['practiceAttempts', quizId] as const),
}

// ─── Explanation Confidence ───────────────────────────────────────────────────
const verifiedExplanations = {
  all: ['verifiedExplanations'] as const,
  detail: (questionId: string) => ['verifiedExplanations', questionId] as const,
}
const explanationReviewQueue = {
  all: ['explanationReviewQueue'] as const,
  list: (courseId: string) => ['explanationReviewQueue', courseId] as const,
}

// ─── Mastery Recovery ────────────────────────────────────────────────────────
const masteryRecovery = {
  all: ['masteryRecovery'] as const,
  lists: () => [...masteryRecovery.all, 'list'] as const,
  list: (filters: Record<string, unknown>) =>
    [...masteryRecovery.lists(), filters] as const,
  status: (studentId: string, cloId: string) =>
    ['masteryRecovery', 'status', studentId, cloId] as const,
  detail: (recoveryId: string) =>
    ['masteryRecovery', 'detail', recoveryId] as const,
  metrics: (institutionId: string) =>
    ['masteryRecovery', 'metrics', institutionId] as const,
}

// ─── Bloom's Progression ─────────────────────────────────────────────────
const bloomsProgression = {
  all: ['bloomsProgression'] as const,
  progression: (studentId: string, courseId: string) =>
    ['bloomsProgression', studentId, courseId] as const,
  climbState: (quizAttemptId: string) =>
    ['bloomsProgression', 'climbState', quizAttemptId] as const,
  badges: (studentId: string) =>
    ['bloomsProgression', 'badges', studentId] as const,
}


// ─── Onboarding ──────────────────────────────────────────────────────────────
const onboarding = {
  progress: (studentId: string) =>
    ['onboarding', 'progress', studentId] as const,
  questions: (type: string) =>
    ['onboarding', 'questions', type] as const,
  responses: (studentId: string, version: number) =>
    ['onboarding', 'responses', studentId, version] as const,
  studentProfile: (studentId: string) =>
    ['onboarding', 'studentProfile', studentId] as const,
  baselineTests: (courseId: string) =>
    ['onboarding', 'baselineTests', courseId] as const,
  baselineResults: (courseId: string) =>
    ['onboarding', 'baselineResults', courseId] as const,
  microAssessments: (studentId: string) =>
    ['onboarding', 'microAssessments', studentId] as const,
  profileCompleteness: (studentId: string) =>
    ['onboarding', 'profileCompleteness', studentId] as const,
  starterWeekSessions: (studentId: string) =>
    ['onboarding', 'starterWeekSessions', studentId] as const,
  goalSuggestions: (studentId: string, weekStart: string) =>
    ['onboarding', 'goalSuggestions', studentId, weekStart] as const,
}

// ─── Exported Key Factory ────────────────────────────────────────────────────
export const queryKeys = {
  // Core
  users,
  profiles,
  institutions,
  // OBE
  programs,
  courses,
  ilos,
  plos,
  clos,
  outcomeMappings,
  rubrics,
  assignments,
  enrollments,
  submissions,
  grades,
  evidence,
  outcomeAttainment,
  // Gamification
  xpTransactions,
  studentGamification,
  badges,
  leaderboard,
  journal,
  habitLogs,
  studentHabitLevel,
  bonusXPEvents,
  streakFreezes,
  // Notifications
  notifications,
  emailPreferences,
  // AI Co-Pilot
  aiSuggestions,
  atRiskPredictions,
  feedbackDrafts,
  aiFeedback,
  // Institutional Management
  semesters,
  departments,
  courseSections,
  surveys,
  surveyQuestions,
  surveyResponses,
  cqiPlans,
  institutionSettings,
  programAccreditations,
  announcements,
  courseModules,
  courseMaterials,
  discussionThreads,
  discussionReplies,
  classSessions,
  attendanceRecords,
  quizzes,
  quizQuestions,
  quizAttempts,
  gradeCategories,
  gradebook,
  timetableSlots,
  academicCalendarEvents,
  parentStudentLinks,
  feeStructures,
  feePayments,
  transcripts,
  courseFiles,
  // Dashboards
  adminDashboard,
  coordinatorDashboard,
  studentDashboard,
  parentDashboard,
  teacherDashboard,
  // Reports
  accreditationReports,
  // Production
  calendarEvents,
  globalSearch,
  notificationPreferences,
  sessions,
  auditLogs,
  // Heatmap & Wellness
  heatmap,
  wellness,
  habitAnalytics,
  // Adaptive Quiz
  questionBank,
  questionAnalytics,
  quizGeneration,
  reviewQueue,
  quizCLOCorrelation,
  // Practice Mode
  practiceMode,
  // Explanation Confidence
  verifiedExplanations,
  explanationReviewQueue,
  // Mastery Recovery
  masteryRecovery,
  // Bloom's Progression
  bloomsProgression,
  // Onboarding
  onboarding,
} as const
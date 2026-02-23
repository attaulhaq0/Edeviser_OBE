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
const studentGamification = createKeys('studentGamification')
const badges = createKeys('badges')
const leaderboard = createKeys('leaderboard')
const journal = createKeys('journal')
const habitLogs = createKeys('habitLogs')
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

// ─── Production ──────────────────────────────────────────────────────────────
const calendarEvents = createKeys('calendarEvents')
const globalSearch = createKeys('globalSearch')
const notificationPreferences = createKeys('notificationPreferences')
const sessions = createKeys('sessions')
const auditLogs = createKeys('auditLogs')

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
  // Production
  calendarEvents,
  globalSearch,
  notificationPreferences,
  sessions,
  auditLogs,
} as const
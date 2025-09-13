import { ROLES, BLOOMS_LEVELS, OUTCOME_TYPES, BADGE_TYPES } from "@shared/schema";

// Application Constants
export const APP_NAME = "E Deviser";
export const APP_TAGLINE = "OBE Mastery Hub";

// XP and Leveling Constants
export const XP_PER_LEVEL = 200;
export const MAX_LEVEL = 50;

// XP Rewards
export const XP_REWARDS = {
  ASSIGNMENT_COMPLETION: 100,
  QUIZ_COMPLETION: 50,
  MODULE_COMPLETION: 75,
  PERFECT_SCORE: 150,
  FIRST_SUBMISSION: 25,
  STREAK_BONUS: 10, // per day
  BADGE_EARNED: 200,
  PEER_HELP: 50,
} as const;

// Streak Constants
export const STREAK_REQUIREMENTS = {
  MIN_ACTIVITY_TIME: 30, // minutes
  STREAK_RESET_HOURS: 48,
} as const;

// Badge Requirements
export const BADGE_REQUIREMENTS = {
  ARRAY_MASTER: { type: "module_completion", target: "arrays", count: 1 },
  CODE_WARRIOR: { type: "consecutive_challenges", count: 10 },
  STUDY_STREAK: { type: "learning_streak", days: 7 },
  ALGORITHM_EXPERT: { type: "topic_mastery", target: "algorithms" },
  TEAM_PLAYER: { type: "peer_help", count: 5 },
  EARLY_BIRD: { type: "first_completion", scope: "weekly" },
  PERFECT_SCORE: { type: "assignment_score", percentage: 100 },
  DATA_STRUCTURE_GURU: { type: "module_completion", target: "data_structures", count: 12 },
  STUDY_MARATHON: { type: "learning_streak", days: 30 },
} as const;

// Role-based permissions
export const ROLE_PERMISSIONS = {
  admin: {
    canManageUsers: true,
    canManagePrograms: true,
    canManageILOs: true,
    canManagePLOs: true,
    canManageCLOs: false,
    canViewSystemAnalytics: true,
    canManageBadgeTemplates: true,
    canAccessAllData: true,
  },
  coordinator: {
    canManageUsers: false,
    canManagePrograms: false,
    canManageILOs: false,
    canManagePLOs: true,
    canManageCLOs: true, // override capability
    canViewProgramAnalytics: true,
    canManageCourses: true,
    canAccessProgramData: true,
  },
  teacher: {
    canManageUsers: false,
    canManagePrograms: false,
    canManageILOs: false,
    canManagePLOs: false,
    canManageCLOs: true,
    canViewClassAnalytics: true,
    canManageAssignments: true,
    canGradeSubmissions: true,
    canAccessCourseData: true,
  },
  student: {
    canViewProgress: true,
    canSubmitAssignments: true,
    canViewBadges: true,
    canAccessLearningModules: true,
    canViewCompetencyProfile: true,
  },
} as const;

// Bloom's Taxonomy Details
export const BLOOMS_TAXONOMY = {
  remember: {
    description: "Recall facts and basic concepts",
    verbs: ["define", "list", "recall", "recognize", "remember", "retrieve"],
    color: "purple",
    level: 1,
  },
  understand: {
    description: "Explain ideas or concepts",
    verbs: ["explain", "interpret", "summarize", "classify", "compare", "contrast"],
    color: "blue", 
    level: 2,
  },
  apply: {
    description: "Use information in new situations",
    verbs: ["apply", "demonstrate", "execute", "implement", "solve", "use"],
    color: "green",
    level: 3,
  },
  analyze: {
    description: "Draw connections among ideas",
    verbs: ["analyze", "differentiate", "examine", "experiment", "organize", "test"],
    color: "yellow",
    level: 4,
  },
  evaluate: {
    description: "Justify a stand or decision",
    verbs: ["assess", "critique", "evaluate", "judge", "justify", "test"],
    color: "orange",
    level: 5,
  },
  create: {
    description: "Produce new or original work",
    verbs: ["create", "design", "formulate", "generate", "plan", "produce"],
    color: "red",
    level: 6,
  },
} as const;

// Outcome Type Details
export const OUTCOME_DETAILS = {
  ILO: {
    name: "Institutional Learning Outcome",
    description: "High-level outcomes expected of all graduates",
    scope: "Institution-wide",
    color: "red",
    icon: "fa-university",
  },
  PLO: {
    name: "Program Learning Outcome", 
    description: "Outcomes specific to a particular academic program",
    scope: "Program-specific",
    color: "blue",
    icon: "fa-layer-group",
  },
  CLO: {
    name: "Course Learning Outcome",
    description: "Outcomes specific to individual courses",
    scope: "Course-specific", 
    color: "green",
    icon: "fa-bullseye",
  },
} as const;

// Grade Scale
export const GRADE_SCALE = {
  A_PLUS: { min: 97, max: 100, gpa: 4.0, label: "A+" },
  A: { min: 93, max: 96, gpa: 4.0, label: "A" },
  A_MINUS: { min: 90, max: 92, gpa: 3.7, label: "A-" },
  B_PLUS: { min: 87, max: 89, gpa: 3.3, label: "B+" },
  B: { min: 83, max: 86, gpa: 3.0, label: "B" },
  B_MINUS: { min: 80, max: 82, gpa: 2.7, label: "B-" },
  C_PLUS: { min: 77, max: 79, gpa: 2.3, label: "C+" },
  C: { min: 73, max: 76, gpa: 2.0, label: "C" },
  C_MINUS: { min: 70, max: 72, gpa: 1.7, label: "C-" },
  D: { min: 60, max: 69, gpa: 1.0, label: "D" },
  F: { min: 0, max: 59, gpa: 0.0, label: "F" },
} as const;

// Navigation Items by Role
export const NAVIGATION_ITEMS = {
  admin: [
    { label: "Dashboard", path: "/", icon: "fa-home" },
    { label: "Programs", path: "/programs", icon: "fa-graduation-cap" },
    { label: "Users", path: "/users", icon: "fa-users" },
    { label: "ILOs", path: "/ilos", icon: "fa-university" },
    { label: "Analytics", path: "/analytics", icon: "fa-chart-line" },
    { label: "System", path: "/system", icon: "fa-cogs" },
  ],
  coordinator: [
    { label: "Dashboard", path: "/", icon: "fa-home" },
    { label: "Programs", path: "/programs", icon: "fa-graduation-cap" },
    { label: "Courses", path: "/courses", icon: "fa-book" },
    { label: "PLOs", path: "/plos", icon: "fa-layer-group" },
    { label: "Mapping", path: "/mapping", icon: "fa-project-diagram" },
    { label: "Analytics", path: "/analytics", icon: "fa-chart-bar" },
  ],
  teacher: [
    { label: "Dashboard", path: "/", icon: "fa-home" },
    { label: "Courses", path: "/courses", icon: "fa-chalkboard-teacher" },
    { label: "Assignments", path: "/assignments", icon: "fa-tasks" },
    { label: "CLOs", path: "/clos", icon: "fa-bullseye" },
    { label: "Grading", path: "/grading", icon: "fa-edit" },
    { label: "Students", path: "/students", icon: "fa-user-graduate" },
  ],
  student: [
    { label: "Dashboard", path: "/", icon: "fa-home" },
    { label: "Learning Path", path: "/learning", icon: "fa-route" },
    { label: "Assignments", path: "/assignments", icon: "fa-clipboard-list" },
    { label: "Progress", path: "/progress", icon: "fa-chart-line" },
    { label: "Badges", path: "/badges", icon: "fa-trophy" },
    { label: "Profile", path: "/profile", icon: "fa-user" },
  ],
} as const;

// API Endpoints
export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: "/api/login",
    LOGOUT: "/api/logout", 
    REGISTER: "/api/register",
    USER: "/api/user",
  },
  
  // Core Entities
  PROGRAMS: "/api/programs",
  COURSES: "/api/courses",
  USERS: "/api/users",
  LEARNING_OUTCOMES: "/api/learning-outcomes",
  OUTCOME_MAPPINGS: "/api/outcome-mappings",
  ASSIGNMENTS: "/api/assignments",
  STUDENT_SUBMISSIONS: "/api/student-submissions",
  
  // Gamification
  STUDENT_PROGRESS: "/api/student-progress",
  BADGE_TEMPLATES: "/api/badge-templates",
  STUDENT_BADGES: "/api/student-badges",
  LEARNING_MODULES: "/api/learning-modules",
  
  // Analytics
  ANALYTICS: {
    PROGRAM: "/api/analytics/program",
    BLOOMS_DISTRIBUTION: "/api/analytics/blooms-distribution",
    OUTCOME_PERFORMANCE: "/api/analytics/outcome-performance",
  },
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: "Network error. Please check your connection and try again.",
  UNAUTHORIZED: "You don't have permission to perform this action.",
  NOT_FOUND: "The requested resource was not found.",
  VALIDATION_FAILED: "Please check your input and try again.",
  SERVER_ERROR: "Something went wrong on our end. Please try again later.",
  DUPLICATE_ENTRY: "This item already exists.",
  INVALID_CREDENTIALS: "Invalid username or password.",
  SESSION_EXPIRED: "Your session has expired. Please log in again.",
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  CREATED: "Successfully created!",
  UPDATED: "Successfully updated!",
  DELETED: "Successfully deleted!",
  SAVED: "Changes saved successfully!",
  SUBMITTED: "Submitted successfully!",
  GRADED: "Graded successfully!",
  LOGGED_IN: "Welcome back!",
  LOGGED_OUT: "You have been logged out.",
  REGISTERED: "Account created successfully!",
} as const;

// File Upload Constants
export const FILE_UPLOAD = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_TYPES: [
    "application/pdf",
    "application/msword", 
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "image/jpeg",
    "image/png",
    "image/gif",
  ],
  ALLOWED_EXTENSIONS: [".pdf", ".doc", ".docx", ".txt", ".jpg", ".jpeg", ".png", ".gif"],
} as const;

// Time Constants
export const TIME_CONSTANTS = {
  SESSION_TIMEOUT: 8 * 60 * 60 * 1000, // 8 hours
  AUTO_SAVE_INTERVAL: 30 * 1000, // 30 seconds
  NOTIFICATION_TIMEOUT: 5 * 1000, // 5 seconds
  DEBOUNCE_DELAY: 300, // 300ms
} as const;

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
} as const;

// Theme Colors (matching design reference)
export const THEME_COLORS = {
  PRIMARY: "hsl(142, 76%, 36%)", // Green
  SECONDARY: "hsl(199, 89%, 48%)", // Blue  
  ACCENT: "hsl(43, 96%, 56%)", // Yellow
  DESTRUCTIVE: "hsl(0, 84%, 60%)", // Red
  SUCCESS: "hsl(120, 50%, 50%)", // Green
  WARNING: "hsl(38, 92%, 50%)", // Orange
  INFO: "hsl(200, 94%, 55%)", // Light Blue
} as const;

// Export all constants
export {
  ROLES,
  BLOOMS_LEVELS, 
  OUTCOME_TYPES,
  BADGE_TYPES,
};

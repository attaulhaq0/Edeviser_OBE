// Additional types for the application that extend the shared schema types

export interface GamificationStats {
  totalXP: number;
  currentLevel: number;
  currentStreak: number;
  longestStreak: number;
  totalBadges: number;
  xpToday: number;
}

export interface BadgeEarned {
  id: string;
  name: string;
  description: string;
  type: "achievement" | "mastery" | "streak" | "special";
  iconUrl: string;
  color: string;
  earnedAt: Date;
  xpReward: number;
}

export interface BadgeAvailable {
  id: string;
  name: string;
  description: string;
  type: "achievement" | "mastery" | "streak" | "special";
  iconUrl: string;
  color: string;
  progress: number;
  requirement: string;
  xpReward: number;
}

export interface LearningPathNode {
  id: string;
  title: string;
  type: "module" | "assignment" | "quiz" | "project";
  status: "completed" | "in-progress" | "locked";
  xpReward: number;
  completionPercentage?: number;
  order: number;
}

export interface CompetencyProfile {
  name: string;
  percentage: number;
  color: string;
  description?: string;
}

export interface EvidenceSubmission {
  id: string;
  assignment: string;
  score: number;
  maxScore: number;
  cloCode: string;
  bloomsLevel: string;
  submittedAt: Date;
}

export interface OutcomeAggregation {
  code: string;
  title: string;
  averageScore: number;
  totalSubmissions: number;
  bloomsLevel: string;
  type: "CLO" | "PLO" | "ILO";
}

export interface MappingConnection {
  sourceId: string;
  targetId: string;
  weight: number;
  strength: "strong" | "moderate" | "weak";
}

export interface DashboardStats {
  programsManaged?: number;
  studentsTracked?: number;
  outcomesMapped?: string;
  coursesTeaching?: number;
  assignmentsCreated?: number;
  pendingGrading?: number;
  totalPrograms?: number;
  totalUsers?: number;
  systemHealth?: string;
}

export interface ActivityItem {
  id: string;
  type: "creation" | "update" | "completion" | "achievement";
  title: string;
  description: string;
  timestamp: Date;
  icon: string;
  color: string;
}

export interface PendingTask {
  id: string;
  title: string;
  priority: "high" | "medium" | "low";
  dueDate?: Date;
  type: "review" | "approval" | "creation" | "update";
}

// Form validation types
export interface OutcomeFormData {
  code: string;
  title: string;
  description: string;
  type: "ILO" | "PLO" | "CLO";
  bloomsLevel: "remember" | "understand" | "apply" | "analyze" | "evaluate" | "create";
  programId?: string;
  courseId?: string;
}

// Analytics types
export interface BloomsTaxonomyDistribution {
  level: string;
  count: number;
  percentage: number;
}

export interface ProgramAnalytics {
  programId: string;
  programName: string;
  totalCourses: number;
  totalOutcomes: number;
  avgCompletion: number;
  studentCount: number;
}

export interface SystemHealthMetrics {
  databasePerformance: number;
  apiResponseTime: number;
  userActivity: number;
  dataIntegrity: number;
  overallHealth: number;
}

// Navigation and UI types
export interface NavigationItem {
  label: string;
  path: string;
  icon: string;
  requiresRole?: string[];
}

export interface QuickAction {
  label: string;
  icon: string;
  action: () => void;
  variant?: "default" | "secondary" | "outline";
  testId?: string;
}

// Error handling types
export interface APIError {
  message: string;
  status: number;
  code?: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

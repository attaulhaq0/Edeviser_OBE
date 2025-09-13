import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, jsonb, decimal, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const roleEnum = pgEnum("role", ["admin", "coordinator", "teacher", "student"]);
export const bloomsLevelEnum = pgEnum("blooms_level", ["remember", "understand", "apply", "analyze", "evaluate", "create"]);
export const outcomeTypeEnum = pgEnum("outcome_type", ["ILO", "PLO", "CLO"]);
export const badgeTypeEnum = pgEnum("badge_type", ["achievement", "mastery", "streak", "special"]);

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  role: roleEnum("role").notNull().default("student"),
  isActive: boolean("is_active").notNull().default(true),
  profileImage: text("profile_image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Programs table
export const programs = pgTable("programs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  code: varchar("code", { length: 10 }).notNull().unique(),
  level: text("level").notNull(), // Bachelor's, Master's, etc.
  coordinatorId: varchar("coordinator_id").references(() => users.id),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Courses table
export const courses = pgTable("courses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  code: varchar("code", { length: 10 }).notNull().unique(),
  credits: integer("credits").notNull().default(3),
  programId: varchar("program_id").notNull().references(() => programs.id),
  teacherId: varchar("teacher_id").references(() => users.id),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Learning Outcomes table (ILO, PLO, CLO)
export const learningOutcomes = pgTable("learning_outcomes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 20 }).notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  type: outcomeTypeEnum("type").notNull(),
  bloomsLevel: bloomsLevelEnum("blooms_level").notNull(),
  programId: varchar("program_id").references(() => programs.id),
  courseId: varchar("course_id").references(() => courses.id),
  ownerId: varchar("owner_id").notNull().references(() => users.id),
  lastEditedBy: varchar("last_edited_by").notNull().references(() => users.id),
  version: integer("version").notNull().default(1),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Outcome Mappings table (CLO -> PLO -> ILO)
export const outcomeMappings = pgTable("outcome_mappings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sourceOutcomeId: varchar("source_outcome_id").notNull().references(() => learningOutcomes.id),
  targetOutcomeId: varchar("target_outcome_id").notNull().references(() => learningOutcomes.id),
  weight: decimal("weight", { precision: 5, scale: 2 }).notNull().default("1.00"),
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Assignments table
export const assignments = pgTable("assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  courseId: varchar("course_id").notNull().references(() => courses.id),
  teacherId: varchar("teacher_id").notNull().references(() => users.id),
  totalPoints: integer("total_points").notNull().default(100),
  dueDate: timestamp("due_date"),
  isActive: boolean("is_active").notNull().default(true),
  rubricData: jsonb("rubric_data"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Rubric Criteria table
export const rubricCriteria = pgTable("rubric_criteria", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  assignmentId: varchar("assignment_id").notNull().references(() => assignments.id),
  outcomeId: varchar("outcome_id").notNull().references(() => learningOutcomes.id),
  description: text("description").notNull(),
  maxPoints: integer("max_points").notNull(),
  weight: decimal("weight", { precision: 5, scale: 2 }).notNull().default("1.00"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Student Submissions table
export const studentSubmissions = pgTable("student_submissions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  assignmentId: varchar("assignment_id").notNull().references(() => assignments.id),
  studentId: varchar("student_id").notNull().references(() => users.id),
  submissionData: jsonb("submission_data"),
  totalScore: decimal("total_score", { precision: 5, scale: 2 }),
  feedback: text("feedback"),
  submittedAt: timestamp("submitted_at"),
  gradedAt: timestamp("graded_at"),
  gradedBy: varchar("graded_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Student Performance table (Evidence aggregation)
export const studentPerformance = pgTable("student_performance", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").notNull().references(() => users.id),
  outcomeId: varchar("outcome_id").notNull().references(() => learningOutcomes.id),
  averageScore: decimal("average_score", { precision: 5, scale: 2 }),
  totalSubmissions: integer("total_submissions").notNull().default(0),
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
});

// Gamification - Student Progress
export const studentProgress = pgTable("student_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").notNull().references(() => users.id).unique(),
  totalXP: integer("total_xp").notNull().default(0),
  currentLevel: integer("current_level").notNull().default(1),
  currentStreak: integer("current_streak").notNull().default(0),
  longestStreak: integer("longest_streak").notNull().default(0),
  lastActivityDate: timestamp("last_activity_date"),
  totalBadges: integer("total_badges").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Badge Templates
export const badgeTemplates = pgTable("badge_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description").notNull(),
  type: badgeTypeEnum("type").notNull(),
  iconUrl: text("icon_url"),
  requirements: jsonb("requirements").notNull(),
  xpReward: integer("xp_reward").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Student Badges
export const studentBadges = pgTable("student_badges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").notNull().references(() => users.id),
  badgeTemplateId: varchar("badge_template_id").notNull().references(() => badgeTemplates.id),
  earnedAt: timestamp("earned_at").notNull().defaultNow(),
  metadata: jsonb("metadata"),
});

// Learning Modules (Gamified content)
export const learningModules = pgTable("learning_modules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  courseId: varchar("course_id").notNull().references(() => courses.id),
  order: integer("order").notNull(),
  xpReward: integer("xp_reward").notNull().default(50),
  isLocked: boolean("is_locked").notNull().default(false),
  requirements: jsonb("requirements"),
  content: jsonb("content"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Student Module Progress
export const studentModuleProgress = pgTable("student_module_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  studentId: varchar("student_id").notNull().references(() => users.id),
  moduleId: varchar("module_id").notNull().references(() => learningModules.id),
  isCompleted: boolean("is_completed").notNull().default(false),
  completionPercentage: integer("completion_percentage").notNull().default(0),
  xpEarned: integer("xp_earned").notNull().default(0),
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

// Relations
export const usersRelations = relations(users, ({ many, one }) => ({
  coordinatedPrograms: many(programs, { relationName: "coordinator" }),
  taughtCourses: many(courses, { relationName: "teacher" }),
  ownedOutcomes: many(learningOutcomes, { relationName: "owner" }),
  editedOutcomes: many(learningOutcomes, { relationName: "editor" }),
  assignments: many(assignments),
  submissions: many(studentSubmissions),
  progress: one(studentProgress),
  badges: many(studentBadges),
  moduleProgress: many(studentModuleProgress),
}));

export const programsRelations = relations(programs, ({ one, many }) => ({
  coordinator: one(users, {
    fields: [programs.coordinatorId],
    references: [users.id],
    relationName: "coordinator",
  }),
  courses: many(courses),
  outcomes: many(learningOutcomes),
}));

export const coursesRelations = relations(courses, ({ one, many }) => ({
  program: one(programs, {
    fields: [courses.programId],
    references: [programs.id],
  }),
  teacher: one(users, {
    fields: [courses.teacherId],
    references: [users.id],
    relationName: "teacher",
  }),
  outcomes: many(learningOutcomes),
  assignments: many(assignments),
  modules: many(learningModules),
}));

export const learningOutcomesRelations = relations(learningOutcomes, ({ one, many }) => ({
  program: one(programs, {
    fields: [learningOutcomes.programId],
    references: [programs.id],
  }),
  course: one(courses, {
    fields: [learningOutcomes.courseId],
    references: [courses.id],
  }),
  owner: one(users, {
    fields: [learningOutcomes.ownerId],
    references: [users.id],
    relationName: "owner",
  }),
  lastEditor: one(users, {
    fields: [learningOutcomes.lastEditedBy],
    references: [users.id],
    relationName: "editor",
  }),
  sourceMappings: many(outcomeMappings, { relationName: "source" }),
  targetMappings: many(outcomeMappings, { relationName: "target" }),
  rubricCriteria: many(rubricCriteria),
  performance: many(studentPerformance),
}));

export const outcomeMappingsRelations = relations(outcomeMappings, ({ one }) => ({
  sourceOutcome: one(learningOutcomes, {
    fields: [outcomeMappings.sourceOutcomeId],
    references: [learningOutcomes.id],
    relationName: "source",
  }),
  targetOutcome: one(learningOutcomes, {
    fields: [outcomeMappings.targetOutcomeId],
    references: [learningOutcomes.id],
    relationName: "target",
  }),
  createdBy: one(users, {
    fields: [outcomeMappings.createdBy],
    references: [users.id],
  }),
}));

export const assignmentsRelations = relations(assignments, ({ one, many }) => ({
  course: one(courses, {
    fields: [assignments.courseId],
    references: [courses.id],
  }),
  teacher: one(users, {
    fields: [assignments.teacherId],
    references: [users.id],
  }),
  rubricCriteria: many(rubricCriteria),
  submissions: many(studentSubmissions),
}));

export const studentProgressRelations = relations(studentProgress, ({ one }) => ({
  student: one(users, {
    fields: [studentProgress.studentId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProgramSchema = createInsertSchema(programs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCourseSchema = createInsertSchema(courses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLearningOutcomeSchema = createInsertSchema(learningOutcomes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOutcomeMappingSchema = createInsertSchema(outcomeMappings).omit({
  id: true,
  createdAt: true,
});

export const insertAssignmentSchema = createInsertSchema(assignments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertStudentSubmissionSchema = createInsertSchema(studentSubmissions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBadgeTemplateSchema = createInsertSchema(badgeTemplates).omit({
  id: true,
  createdAt: true,
});

export const insertLearningModuleSchema = createInsertSchema(learningModules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Program = typeof programs.$inferSelect;
export type InsertProgram = z.infer<typeof insertProgramSchema>;
export type Course = typeof courses.$inferSelect;
export type InsertCourse = z.infer<typeof insertCourseSchema>;
export type LearningOutcome = typeof learningOutcomes.$inferSelect;
export type InsertLearningOutcome = z.infer<typeof insertLearningOutcomeSchema>;
export type OutcomeMapping = typeof outcomeMappings.$inferSelect;
export type InsertOutcomeMapping = z.infer<typeof insertOutcomeMappingSchema>;
export type Assignment = typeof assignments.$inferSelect;
export type InsertAssignment = z.infer<typeof insertAssignmentSchema>;
export type StudentSubmission = typeof studentSubmissions.$inferSelect;
export type InsertStudentSubmission = z.infer<typeof insertStudentSubmissionSchema>;
export type StudentProgress = typeof studentProgress.$inferSelect;
export type BadgeTemplate = typeof badgeTemplates.$inferSelect;
export type InsertBadgeTemplate = z.infer<typeof insertBadgeTemplateSchema>;
export type StudentBadge = typeof studentBadges.$inferSelect;
export type LearningModule = typeof learningModules.$inferSelect;
export type InsertLearningModule = z.infer<typeof insertLearningModuleSchema>;
export type StudentModuleProgress = typeof studentModuleProgress.$inferSelect;

// Enums export for frontend
export const ROLES = ["admin", "coordinator", "teacher", "student"] as const;
export const BLOOMS_LEVELS = ["remember", "understand", "apply", "analyze", "evaluate", "create"] as const;
export const OUTCOME_TYPES = ["ILO", "PLO", "CLO"] as const;
export const BADGE_TYPES = ["achievement", "mastery", "streak", "special"] as const;

export type Role = typeof ROLES[number];
export type BloomsLevel = typeof BLOOMS_LEVELS[number];
export type OutcomeType = typeof OUTCOME_TYPES[number];
export type BadgeType = typeof BADGE_TYPES[number];
